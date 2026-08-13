import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireActiveAccessProfile } from '@/lib/access';
import { createNotifications } from '@/lib/notifications';
import {
  initializeTournamentPayment,
  isPaystackConfigured,
  normaliseKenyanPhone,
} from '@/lib/paystack';
import { makePaymentReference } from '@/lib/slug';
import { createServiceClient } from '@/lib/supabase';
import { getTeamOperationErrorMessage } from '@/lib/team-roster';
import { getAppUrl } from '@/lib/tournaments';
import type { NotificationType, Tournament } from '@/types';

type TeamClaim = {
  entry_id: string;
  entry_payment_status: string;
  entry_joined_at: string;
  entry_inserted: boolean;
  tournament_status: string;
  roster_snapshot: {
    team_name?: string;
    players?: Array<{ user_id?: string; username?: string }>;
  };
};

function claimErrorResponse(error: { message?: string; code?: string }) {
  const message = getTeamOperationErrorMessage(error);
  const status =
    error.code === '42883'
      ? 503
      : message.includes('Only')
        ? 403
        : message.includes('not found')
          ? 404
          : message.includes('full') || message.includes('not open')
            ? 400
            : 409;
  return NextResponse.json({ error: message }, { status });
}

async function claimTeamSlot(input: {
  supabase: SupabaseClient;
  tournamentId: string;
  teamId: string;
  actorId: string;
  paymentStatus: 'free' | 'pending';
  paymentRef?: string | null;
}) {
  const { data, error } = await input.supabase
    .rpc('claim_team_tournament_slot', {
      p_tournament_id: input.tournamentId,
      p_team_id: input.teamId,
      p_actor_id: input.actorId,
      p_payment_status: input.paymentStatus,
      p_payment_ref: input.paymentRef ?? null,
      p_payment_access_code: null,
    })
    .single();
  if (error) return { claim: null, response: claimErrorResponse(error) };
  const claim = data as TeamClaim | null;
  if (!claim?.entry_id) {
    return {
      claim: null,
      response: NextResponse.json({ error: 'Could not reserve the team slot.' }, { status: 500 }),
    };
  }
  return { claim, response: null };
}

async function notifyTeamRegistration(input: {
  supabase: SupabaseClient;
  tournament: Tournament;
  claim: TeamClaim;
  actorId: string;
  teamId: string;
}) {
  const players = input.claim.roster_snapshot?.players ?? [];
  const playerIds = [
    ...new Set(
      players
        .map((player) => String(player.user_id ?? ''))
        .filter(Boolean)
    ),
  ];
  const teamName = input.claim.roster_snapshot?.team_name ?? 'Your team';
  const notifications: Array<{
    user_id: string;
    type: NotificationType;
    title: string;
    body: string;
    href: string;
    metadata: Record<string, unknown>;
  }> = playerIds.map((userId) => ({
    user_id: userId,
    type: 'team_tournament_registered',
    title: `${teamName} is in ${input.tournament.title}`,
    body: 'The tournament roster is now locked. Check your dashboard for check-in.',
    href: `/t/${input.tournament.slug}`,
    metadata: {
      tournament_id: input.tournament.id,
      team_id: input.teamId,
      entry_id: input.claim.entry_id,
    },
  }));

  if (
    input.tournament.organizer_id !== input.actorId &&
    !playerIds.includes(input.tournament.organizer_id)
  ) {
    notifications.push({
      user_id: input.tournament.organizer_id,
      type: 'tournament_player_joined',
      title: `${teamName} joined ${input.tournament.title}`,
      body: 'The team roster has been locked for the bracket.',
      href: `/t/${input.tournament.slug}`,
      metadata: {
        tournament_id: input.tournament.id,
        team_id: input.teamId,
        entry_id: input.claim.entry_id,
      },
    });
  }

  await createNotifications(notifications, input.supabase);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const teamId = String(body.team_id ?? '');
  if (!teamId) {
    return NextResponse.json({ error: 'Choose the team to register.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const [{ data: tournamentRaw, error: tournamentError }, { data: profileRaw }] =
    await Promise.all([
      supabase.from('tournaments').select('*').eq('slug', slug).single(),
      supabase
        .from('profiles')
        .select('id, username, phone, email')
        .eq('id', access.profile.id)
        .single(),
    ]);
  const tournament = tournamentRaw as Tournament | null;
  const profile = profileRaw as {
    username: string;
    phone: string;
    email?: string | null;
  } | null;
  if (tournamentError || !tournament) {
    return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });
  }
  if (tournament.participant_mode !== 'team') {
    return NextResponse.json({ error: 'This tournament accepts solo players.' }, { status: 400 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }
  if (
    tournament.entry_fee > 0 &&
    !isPaystackConfigured() &&
    process.env.NODE_ENV === 'production'
  ) {
    return NextResponse.json({ error: 'Payment provider is not configured.' }, { status: 502 });
  }

  const useFreeEntry =
    tournament.entry_fee <= 0 ||
    (!isPaystackConfigured() && process.env.NODE_ENV !== 'production');

  if (useFreeEntry) {
    const claimed = await claimTeamSlot({
      supabase,
      tournamentId: tournament.id,
      teamId,
      actorId: access.profile.id,
      paymentStatus: 'free',
    });
    if (claimed.response) return claimed.response;
    await notifyTeamRegistration({
      supabase,
      tournament,
      claim: claimed.claim!,
      actorId: access.profile.id,
      teamId,
    });
    return NextResponse.json({ status: 'joined', entry: claimed.claim });
  }

  const reference = makePaymentReference('mechi_team_tournament');
  const claimed = await claimTeamSlot({
    supabase,
    tournamentId: tournament.id,
    teamId,
    actorId: access.profile.id,
    paymentStatus: 'pending',
    paymentRef: reference,
  });
  if (claimed.response) return claimed.response;

  const initialized = await initializeTournamentPayment({
    amountKes: tournament.entry_fee,
    email: profile.email || `${profile.username}@mechi.club`,
    reference,
    callbackUrl: `${getAppUrl()}/t/${tournament.slug}?reference=${encodeURIComponent(reference)}`,
    metadata: {
      app: 'mechi',
      source: 'mechi_team',
      tournament_id: tournament.id,
      tournament_slug: tournament.slug,
      team_id: teamId,
      user_id: access.profile.id,
      phone: normaliseKenyanPhone(profile.phone),
    },
  });

  if (!initialized.success || !initialized.authorizationUrl) {
    await supabase
      .from('tournament_team_entries')
      .update({ payment_status: 'failed' })
      .eq('id', claimed.claim!.entry_id)
      .eq('payment_status', 'pending');
    return NextResponse.json(
      { error: initialized.error ?? 'Could not start payment.' },
      { status: 502 }
    );
  }

  await supabase
    .from('tournament_team_entries')
    .update({
      payment_ref: initialized.reference,
      payment_access_code: initialized.accessCode ?? null,
      payment_authorization_url: initialized.authorizationUrl,
    })
    .eq('id', claimed.claim!.entry_id)
    .eq('payment_status', 'pending');

  return NextResponse.json({
    status: 'payment_pending',
    authorization_url: initialized.authorizationUrl,
    reference: initialized.reference,
    entry_id: claimed.claim!.entry_id,
  });
}
