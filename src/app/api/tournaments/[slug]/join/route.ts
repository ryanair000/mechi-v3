import { after, NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireActiveAccessProfile } from '@/lib/access';
import { tryClaimBounty } from '@/lib/bounties';
import { GAMES, getCanonicalGameKey, normalizeSelectedGameKeys } from '@/lib/config';
import { sendTournamentRegistrationConfirmedEmail } from '@/lib/email';
import { createNotifications } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import {
  ACTIVE_TOURNAMENT_PLAYER_STATUSES,
  CONFIRMED_PAYMENT_STATUSES,
  getAppUrl,
  maybeMarkTournamentFull,
  releaseExpiredTournamentReservations,
} from '@/lib/tournaments';
import {
  initializeTournamentPayment,
  isPaystackConfigured,
  normaliseKenyanPhone,
} from '@/lib/paystack';
import { makePaymentReference } from '@/lib/slug';
import type { NotificationType, Tournament } from '@/types';

type SlotClaimRow = {
  player_id: string;
  player_payment_status: string;
  player_joined_at: string;
  player_inserted: boolean;
  tournament_status: string;
};

function slotClaimErrorResponse(error: { message?: string; code?: string } | null | undefined) {
  const message = String(error?.message ?? '').toUpperCase();

  if (message.includes('ALREADY_JOINED')) {
    return NextResponse.json({ error: 'You already joined this tournament' }, { status: 409 });
  }

  if (message.includes('PAYMENT_PENDING')) {
    return NextResponse.json(
      { error: 'Finish your current payment before trying again' },
      { status: 409 }
    );
  }

  if (message.includes('TOURNAMENT_FULL')) {
    return NextResponse.json({ error: 'This bracket is full' }, { status: 400 });
  }

  if (message.includes('TOURNAMENT_NOT_OPEN')) {
    return NextResponse.json({ error: 'This tournament is not open' }, { status: 400 });
  }

  if (message.includes('TOURNAMENT_NOT_FOUND')) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  if (error?.code === '42883') {
    return NextResponse.json(
      { error: 'Tournament slot locking is not ready. Apply the latest Supabase migration.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: 'Could not reserve your slot' }, { status: 500 });
}

async function claimTournamentSlot(params: {
  supabase: SupabaseClient;
  tournament: Tournament;
  userId: string;
  paymentStatus: 'free' | 'pending';
  paymentRef?: string | null;
  paymentAccessCode?: string | null;
}) {
  const { data, error } = await params.supabase
    .rpc('claim_tournament_slot', {
      p_tournament_id: params.tournament.id,
      p_user_id: params.userId,
      p_payment_status: params.paymentStatus,
      p_payment_ref: params.paymentRef ?? null,
      p_payment_access_code: params.paymentAccessCode ?? null,
    })
    .single();

  if (error) {
    return { response: slotClaimErrorResponse(error), player: null };
  }

  const claim = data as SlotClaimRow | null;
  if (!claim?.player_id) {
    return {
      response: NextResponse.json({ error: 'Could not reserve your slot' }, { status: 500 }),
      player: null,
    };
  }

  return {
    response: null,
    player: {
      id: claim.player_id,
      tournament_id: params.tournament.id,
      user_id: params.userId,
      payment_status: claim.player_payment_status,
      payment_ref: params.paymentRef ?? null,
      payment_access_code: params.paymentAccessCode ?? null,
      check_in_status: 'registered',
      checked_in_at: null,
      joined_at: claim.player_joined_at,
    },
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const access = await requireActiveAccessProfile(request);
    if (access.response) {
      return access.response;
    }

    const authUser = access.profile;
    const { slug } = await params;

    const supabase = createServiceClient();
    const { data: tournamentBySlug, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('slug', slug)
      .single();

    let tournament = tournamentBySlug as Tournament | null;
    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    await releaseExpiredTournamentReservations(supabase, tournament.id);

    const { data: refreshedTournament } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournament.id)
      .single();

    tournament = (refreshedTournament as Tournament | null) ?? tournament;

    if (tournament.status !== 'open') {
      return NextResponse.json({ error: 'This tournament is not open' }, { status: 400 });
    }
    if (tournament.participant_mode === 'team') {
      return NextResponse.json(
        { error: 'Register an eligible team roster from the Teams workspace.' },
        { status: 400 }
      );
    }

    if (tournament.entry_fee > 0 && tournament.approval_status !== 'approved') {
      return NextResponse.json(
        { error: 'This paid tournament is awaiting Mechi approval' },
        { status: 403 }
      );
    }

    const { data: existing } = await supabase
      .from('tournament_players')
      .select('id, payment_status')
      .eq('tournament_id', tournament.id)
      .eq('user_id', authUser.id)
      .maybeSingle();

    const existingPlayer = existing as { id: string; payment_status: string } | null;

    if (
      existingPlayer &&
      CONFIRMED_PAYMENT_STATUSES.includes(
        existingPlayer.payment_status as (typeof CONFIRMED_PAYMENT_STATUSES)[number]
      )
    ) {
      return NextResponse.json({ error: 'You already joined this tournament' }, { status: 409 });
    }

    if (existingPlayer?.payment_status === 'pending') {
      return NextResponse.json(
        { error: 'Finish your current payment before trying again' },
        { status: 409 }
      );
    }

    const { count: reservedCount } = await supabase
      .from('tournament_players')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournament.id)
      .in('payment_status', [...ACTIVE_TOURNAMENT_PLAYER_STATUSES]);

    if ((reservedCount ?? 0) >= tournament.size) {
      await maybeMarkTournamentFull(supabase, tournament.id);
      return NextResponse.json({ error: 'This bracket is full' }, { status: 400 });
    }

    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, phone, email, selected_games')
      .eq('id', authUser.id)
      .single();

    const profile = profileRaw as {
      id: string;
      username: string;
      phone: string;
      email?: string | null;
      selected_games?: string[] | null;
    } | null;

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const tournamentGame = getCanonicalGameKey(tournament.game);
    const selectedGames = normalizeSelectedGameKeys(profile.selected_games ?? []);

    if (!selectedGames.includes(tournamentGame)) {
      const gameLabel = GAMES[tournamentGame]?.label ?? tournament.game;
      return NextResponse.json(
        { error: `Add ${gameLabel} to your profile before joining` },
        { status: 400 }
      );
    }

    if (
      tournament.entry_fee > 0 &&
      !isPaystackConfigured() &&
      process.env.NODE_ENV === 'production'
    ) {
      return NextResponse.json(
        { error: 'Payment provider is not configured' },
        { status: 502 }
      );
    }

    if (
      tournament.entry_fee <= 0 ||
      (!isPaystackConfigured() && process.env.NODE_ENV !== 'production')
    ) {
      const claimed = await claimTournamentSlot({
        supabase,
        tournament,
        userId: authUser.id,
        paymentStatus: 'free',
      });

      if (claimed.response) {
        return claimed.response;
      }
      if (!claimed.player) {
        return NextResponse.json({ error: 'Could not join tournament' }, { status: 500 });
      }

      const player = claimed.player;
      const notifications: Array<{
        user_id: string;
        type: NotificationType;
        title: string;
        body: string;
        href: string;
        metadata: Record<string, unknown>;
      }> = [
        {
          user_id: authUser.id,
          type: 'tournament_joined',
          title: `You're in ${tournament.title}`,
          body: `${GAMES[tournament.game]?.label ?? tournament.game} bracket joined successfully.`,
          href: `/t/${tournament.slug}`,
          metadata: {
            tournament_id: tournament.id,
            slug: tournament.slug,
            game: tournament.game,
          },
        },
      ];

      if (tournament.organizer_id !== authUser.id) {
        notifications.push({
          user_id: tournament.organizer_id,
          type: 'tournament_player_joined',
          title: `${profile.username} joined ${tournament.title}`,
          body: `One more player locked their ${GAMES[tournament.game]?.label ?? tournament.game} slot.`,
          href: `/t/${tournament.slug}`,
          metadata: {
            tournament_id: tournament.id,
            slug: tournament.slug,
            player_id: authUser.id,
            game: tournament.game,
          },
        });
      }

      await createNotifications(notifications, supabase);
      await maybeMarkTournamentFull(supabase, tournament.id);
      if (profile.email) {
        after(async () => {
          await sendTournamentRegistrationConfirmedEmail({
            to: profile.email as string,
            playerName: profile.username,
            tournamentTitle: tournament.title,
            game: GAMES[tournament.game]?.label ?? tournament.game,
            platform: tournament.platform,
            scheduledFor: tournament.scheduled_for,
            entryFee: tournament.entry_fee,
            tournamentUrl: `${getAppUrl()}/t/${tournament.slug}`,
          });
        });
      }
      void tryClaimBounty(supabase, authUser.id, 'tournament_register').catch(() => null);
      return NextResponse.json({ status: 'joined', player });
    }

    const reference = makePaymentReference('mechi_tournament');
    const email = profile.email || `${profile.username}@mechi.club`;
    const callbackUrl = `${getAppUrl()}/t/${tournament.slug}?reference=${encodeURIComponent(reference)}`;

    const pendingClaim = await claimTournamentSlot({
      supabase,
      tournament,
      userId: authUser.id,
      paymentStatus: 'pending',
      paymentRef: reference,
    });

    if (pendingClaim.response) {
      return pendingClaim.response;
    }
    if (!pendingClaim.player) {
      return NextResponse.json({ error: 'Could not reserve your slot' }, { status: 500 });
    }

    const pendingPlayer = pendingClaim.player;
    const initialized = await initializeTournamentPayment({
      amountKes: tournament.entry_fee,
      email,
      reference,
      callbackUrl,
      metadata: {
        app: 'mechi',
        source: 'mechi',
        tournament_id: tournament.id,
        tournament_slug: tournament.slug,
        user_id: authUser.id,
        phone: normaliseKenyanPhone(profile.phone),
      },
    });

    if (!initialized.success || !initialized.authorizationUrl) {
      await supabase
        .from('tournament_players')
        .update({
          payment_status: 'failed',
          payment_ref: reference,
        })
        .eq('id', pendingPlayer.id);

      return NextResponse.json(
        { error: initialized.error ?? 'Could not start payment' },
        { status: 502 }
      );
    }

    await supabase
      .from('tournament_players')
      .update({
        payment_ref: initialized.reference,
        payment_access_code: initialized.accessCode ?? null,
      })
      .eq('id', pendingPlayer.id);

    return NextResponse.json({
      status: 'payment_pending',
      authorization_url: initialized.authorizationUrl,
      reference: initialized.reference,
    });
  } catch (err) {
    console.error('[Tournament Join] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
