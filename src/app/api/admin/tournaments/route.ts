import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { filterVisibleTournaments, shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { createServiceClient } from '@/lib/supabase';
import { getTournamentPaymentMetrics, getTournamentPrizeSnapshot } from '@/lib/tournaments';

type TournamentListItem = {
  id: string;
  status: string;
  payout_status?: string | null;
  started_at?: string | null;
  created_at: string;
  player_count: number;
} & Record<string, unknown>;

function getTournamentUrgencyRank(status: string, payoutStatus: string | null | undefined) {
  if (status === 'active') {
    return 0;
  }

  if (status === 'full') {
    return 1;
  }

  if (status === 'open') {
    return 2;
  }

  if (status === 'completed' && payoutStatus === 'pending') {
    return 3;
  }

  if (status === 'completed') {
    return 4;
  }

  return 5;
}

function compareTournamentsByUrgency(
  a: { status: string; payout_status?: string | null; started_at?: string | null; created_at: string },
  b: { status: string; payout_status?: string | null; started_at?: string | null; created_at: string }
) {
  const rankDiff =
    getTournamentUrgencyRank(a.status, a.payout_status) -
    getTournamentUrgencyRank(b.status, b.payout_status);
  if (rankDiff !== 0) {
    return rankDiff;
  }

  const aActiveAt = a.started_at ? new Date(a.started_at).getTime() : Number.NaN;
  const bActiveAt = b.started_at ? new Date(b.started_at).getTime() : Number.NaN;

  if (Number.isFinite(aActiveAt) || Number.isFinite(bActiveAt)) {
    if (aActiveAt !== bActiveAt) {
      return bActiveAt - aActiveAt;
    }
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export async function GET(request: NextRequest) {
  const user = await getRequestAccessProfile(request);
  if (!user || !hasModeratorAccess(user) || user.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const supabase = createServiceClient();

    let query = supabase
      .from('tournaments')
      .select(
        'id, slug, title, game, platform, region, size, entry_fee, prize_pool, platform_fee, platform_fee_rate, status, approval_status, approved_at, approved_by, is_featured, payout_status, created_at, started_at, ended_at, organizer:organizer_id(id, username), winner:winner_id(id, username)'
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') query = query.eq('status', status);

    if (shouldHideE2EFixtures()) {
      query = query.not('title', 'ilike', '%e2e%').not('slug', 'ilike', '%e2e%');
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    const tournaments = filterVisibleTournaments((data ?? []) as Array<
      Record<string, unknown> & {
        id: string;
        status: string;
        payout_status?: string | null;
        started_at?: string | null;
        created_at: string;
      }
    >);
    if (!tournaments.length) {
      return NextResponse.json({ tournaments: [] });
    }

    const tournamentIds = tournaments.map((tournament) => tournament.id);
    const { data: players, error: playersError } = await supabase
      .from('tournament_players')
      .select('tournament_id, payment_status')
      .in('tournament_id', tournamentIds)
      .in('payment_status', ['paid', 'free']);

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
    }

    const playersByTournament = (players ?? []).reduce<
      Record<string, Array<{ payment_status: string | null | undefined }>>
    >((grouped, player) => {
      const tournamentId = player.tournament_id as string | undefined;
      if (!tournamentId) return grouped;
      grouped[tournamentId] = [
        ...(grouped[tournamentId] ?? []),
        { payment_status: (player.payment_status as string | null | undefined) ?? null },
      ];
      return grouped;
    }, {});

    const enrichedTournaments: TournamentListItem[] = tournaments.map((tournament) => ({
      ...tournament,
      player_count: getTournamentPaymentMetrics(playersByTournament[tournament.id] ?? [])
        .confirmedCount,
      prize_pool: getTournamentPrizeSnapshot({
        entryFee: Number(tournament.entry_fee ?? 0),
        paidPlayerCount: getTournamentPaymentMetrics(playersByTournament[tournament.id] ?? [])
          .paidCount,
        feeRate: Number(tournament.platform_fee_rate ?? 5),
        storedPrizePool: Number(tournament.prize_pool ?? 0),
        storedPlatformFee: Number(tournament.platform_fee ?? 0),
      }).prizePool,
    }));

    return NextResponse.json({
      tournaments: enrichedTournaments.sort(compareTournamentsByUrgency),
    });
  } catch (err) {
    console.error('[Admin Tournaments] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
