import { after, NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { tryClaimBounty } from '@/lib/bounties';
import { GAMES } from '@/lib/config';
import { sendTournamentRegistrationConfirmedEmail } from '@/lib/email';
import { createNotifications } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import { getAppUrl, markTournamentPaymentPaidByReference } from '@/lib/tournaments';
import { verifyTournamentPayment } from '@/lib/paystack';
import type { NotificationType, Tournament } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;
  const { slug } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const reference = String(body.reference ?? '').trim();
    if (!reference) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: tournamentRaw, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('slug', slug)
      .single();

    const tournament = tournamentRaw as Tournament | null;
    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const [{ data: playerRaw }, { data: teamEntryRaw }] = await Promise.all([
      supabase
        .from('tournament_players')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('user_id', authUser.id)
        .eq('payment_ref', reference)
        .maybeSingle(),
      supabase
        .from('tournament_team_entries')
        .select('id, team_id, registered_by, payment_status, roster_snapshot')
        .eq('tournament_id', tournament.id)
        .eq('registered_by', authUser.id)
        .eq('payment_ref', reference)
        .maybeSingle(),
    ]);

    const player = playerRaw as { id: string; payment_status: string } | null;
    const teamEntry = teamEntryRaw as {
      id: string;
      team_id: string;
      registered_by: string;
      payment_status: string;
      roster_snapshot?: {
        team_name?: string;
        players?: Array<{ user_id?: string }>;
      };
    } | null;
    if (!player && !teamEntry) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (player?.payment_status === 'paid' || teamEntry?.payment_status === 'paid') {
      return NextResponse.json({ status: 'paid' });
    }

    const verified = await verifyTournamentPayment({
      reference,
      expectedAmountKes: tournament.entry_fee,
    });

    if (!verified.success) {
      return NextResponse.json(
        { error: verified.error ?? 'Payment is not complete yet' },
        { status: 400 }
      );
    }

    if (teamEntry) {
      const { error: teamPaymentError } = await supabase.rpc(
        'mark_team_tournament_payment_paid',
        { p_payment_ref: reference }
      );
      if (teamPaymentError) {
        return NextResponse.json(
          { error: 'Could not confirm the team tournament payment' },
          { status: teamPaymentError.code === '42883' ? 503 : 500 }
        );
      }
    } else {
      const confirmed = await markTournamentPaymentPaidByReference(supabase, reference);
      if (!confirmed.success) {
        return NextResponse.json(
          { error: confirmed.error ?? 'Could not confirm tournament payment' },
          { status: 500 }
        );
      }
    }

    const { data: profileRaw } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', authUser.id)
      .maybeSingle();

    const profile = profileRaw as { username?: string | null; email?: string | null } | null;

    const notifications: Array<{
      user_id: string;
      type: NotificationType;
      title: string;
      body: string;
      href: string;
      metadata: Record<string, unknown>;
    }> = teamEntry
      ? [
          ...new Set(
            (teamEntry.roster_snapshot?.players ?? [])
              .map((rosterPlayer) => String(rosterPlayer.user_id ?? ''))
              .filter(Boolean)
          ),
        ].map((userId) => ({
          user_id: userId,
          type: 'team_tournament_registered' as const,
          title: `Payment confirmed for ${tournament.title}`,
          body: `${teamEntry.roster_snapshot?.team_name ?? 'Your team'} is locked into the bracket.`,
          href: `/t/${tournament.slug}`,
          metadata: {
            tournament_id: tournament.id,
            slug: tournament.slug,
            team_id: teamEntry.team_id,
            game: tournament.game,
          },
        }))
      : [
          {
            user_id: authUser.id,
            type: 'tournament_joined',
            title: `Payment confirmed for ${tournament.title}`,
            body: `You're locked into the ${GAMES[tournament.game]?.label ?? tournament.game} bracket.`,
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
        title: teamEntry
          ? `${teamEntry.roster_snapshot?.team_name ?? 'A team'} joined ${tournament.title}`
          : `${String(profile?.username ?? 'A player')} joined ${tournament.title}`,
        body: teamEntry
          ? 'Their team payment cleared and the roster is locked.'
          : `Their payment cleared and the ${GAMES[tournament.game]?.label ?? tournament.game} slot is locked.`,
        href: `/t/${tournament.slug}`,
        metadata: {
          tournament_id: tournament.id,
          slug: tournament.slug,
          ...(teamEntry
            ? { team_id: teamEntry.team_id }
            : { player_id: authUser.id }),
          game: tournament.game,
        },
      });
    }

    await createNotifications(notifications, supabase);
    if (profile?.email) {
      after(async () => {
        await sendTournamentRegistrationConfirmedEmail({
          to: profile.email as string,
          playerName: profile.username || authUser.username,
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

    return NextResponse.json({ status: 'paid' });
  } catch (err) {
    console.error('[Tournament Payment Verify] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
