import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import {
  getTournamentPaymentMetrics,
  getTournamentPrizeSnapshot,
  isActiveTournamentPlayerStatus,
} from '@/lib/tournament-metrics';
import { parseTournamentSchedule } from '@/lib/tournament-schedule';
import { createServiceClient } from '@/lib/supabase';
import type {
  TournamentControlParticipant,
  TournamentControlResponse,
} from '@/lib/tournament-control';

const TOURNAMENT_SELECT =
  'id, slug, title, game, platform, region, size, entry_fee, prize_pool_mode, prize_pool, platform_fee, platform_fee_rate, status, organizer_id, approval_status, payout_status, scheduled_for';
const PLAYER_SELECT =
  'id, user_id, seed, payment_status, check_in_status, checked_in_at, joined_at, user:user_id(id, username)';
const MATCH_SELECT = 'id, match_id, status, match:match_id(id, status)';

type TournamentRow = {
  id: string;
  slug: string;
  title: string;
  game: string;
  platform: string;
  region: string;
  size: number;
  entry_fee: number | null;
  prize_pool_mode: string | null;
  prize_pool: number | null;
  platform_fee: number | null;
  platform_fee_rate: number | null;
  status: string;
  organizer_id: string;
  approval_status: string | null;
  payout_status: string | null;
  scheduled_for: string | null;
};

type ProfileRelation =
  | { id: string; username: string }
  | Array<{ id: string; username: string }>
  | null;

type PlayerRow = {
  id: string;
  user_id: string;
  seed: number | null;
  payment_status: string | null;
  check_in_status: string | null;
  checked_in_at: string | null;
  joined_at: string;
  user: ProfileRelation;
};

type MatchRelation =
  | { id: string; status: string | null }
  | Array<{ id: string; status: string | null }>
  | null;

type TournamentMatchRow = {
  id: string;
  match_id: string | null;
  status: string | null;
  match: MatchRelation;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
function createPaymentBreakdown(players: PlayerRow[]) {
  const breakdown: Record<string, number> = {
    paid: 0,
    free: 0,
    pending: 0,
    failed: 0,
    refunded: 0,
  };

  players.forEach((player) => {
    const status = player.payment_status ?? 'pending';
    breakdown[status] = (breakdown[status] ?? 0) + 1;
  });

  return breakdown;
}

function getStartBlockers(params: {
  tournament: TournamentRow;
  confirmedPlayers: number;
  isOrganizer: boolean;
}) {
  const { tournament, confirmedPlayers, isOrganizer } = params;
  const blockers: string[] = [];

  if (!isOrganizer) {
    blockers.push('Only the tournament organizer can start this tournament.');
  }

  if (
    Number(tournament.entry_fee ?? 0) > 0 &&
    tournament.approval_status !== 'approved'
  ) {
    blockers.push('Paid tournaments must be approved by Mechi before they can start.');
  }

  if (
    Number(tournament.entry_fee ?? 0) === 0 &&
    (tournament.prize_pool_mode === 'specified' || Number(tournament.prize_pool ?? 0) > 0)
  ) {
    blockers.push('Free tournaments cannot include a cash prize or reward.');
  }

  if (tournament.status !== 'full') {
    blockers.push(
      tournament.status === 'active'
        ? 'This tournament has already started.'
        : tournament.status === 'completed'
          ? 'This tournament is already complete.'
          : `Fill all ${tournament.size} player slots before starting.`
    );
  }

  if (confirmedPlayers !== tournament.size && !['active', 'completed'].includes(tournament.status)) {
    blockers.push(
      `${Math.max(0, tournament.size - confirmedPlayers)} more confirmed ${
        tournament.size - confirmedPlayers === 1 ? 'player is' : 'players are'
      } needed.`
    );
  }

  const scheduledFor = parseTournamentSchedule(tournament.scheduled_for);
  if (scheduledFor && scheduledFor.getTime() > Date.now()) {
    blockers.push('The scheduled start time has not been reached yet.');
  }

  return blockers;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const { slug } = await params;

  try {
    const supabase = createServiceClient();
    const { data: tournamentData, error: tournamentError } = await supabase
      .from('tournaments')
      .select(TOURNAMENT_SELECT)
      .eq('slug', slug)
      .maybeSingle();

    const tournament = tournamentData as TournamentRow | null;
    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const isOrganizer = tournament.organizer_id === access.profile.id;
    const isModerator = hasModeratorAccess(access.profile);
    if (!isOrganizer && !isModerator) {
      return NextResponse.json(
        { error: 'Only the organizer or a Mechi moderator can view tournament controls.' },
        { status: 403 }
      );
    }

    const [playersResult, matchesResult] = await Promise.all([
      supabase
        .from('tournament_players')
        .select(PLAYER_SELECT)
        .eq('tournament_id', tournament.id)
        .order('joined_at', { ascending: true }),
      supabase
        .from('tournament_matches')
        .select(MATCH_SELECT)
        .eq('tournament_id', tournament.id),
    ]);

    if (playersResult.error || matchesResult.error) {
      console.error('[Tournament Control] Core data error:', {
        players: playersResult.error,
        matches: matchesResult.error,
      });
      return NextResponse.json(
        { error: 'Could not load tournament control data.' },
        { status: 500 }
      );
    }

    const playerRows = (playersResult.data ?? []) as PlayerRow[];
    const matchRows = (matchesResult.data ?? []) as TournamentMatchRow[];
    const matchIds = Array.from(
      new Set(matchRows.map((match) => match.match_id).filter((id): id is string => Boolean(id)))
    );

    let openDisputes = 0;
    if (matchIds.length > 0) {
      const { count, error: escalationError } = await supabase
        .from('match_escalations')
        .select('id', { count: 'exact', head: true })
        .in('match_id', matchIds)
        .eq('status', 'open');

      if (escalationError) {
        console.error('[Tournament Control] Escalation count error:', escalationError);
        return NextResponse.json(
          { error: 'Could not load tournament dispute data.' },
          { status: 500 }
        );
      }

      openDisputes = count ?? 0;
    }

    const activePlayerRows = playerRows.filter((player) =>
      isActiveTournamentPlayerStatus(player.payment_status)
    );
    const { confirmedCount, paidCount } = getTournamentPaymentMetrics(activePlayerRows);
    const paymentBreakdown = createPaymentBreakdown(playerRows);
    const checkedInPlayers = activePlayerRows.filter(
      (player) =>
        ['paid', 'free'].includes(player.payment_status ?? '') &&
        player.check_in_status === 'checked_in'
    ).length;
    const prizeSnapshot = getTournamentPrizeSnapshot({
      entryFee: Math.max(0, Number(tournament.entry_fee ?? 0)),
      paidPlayerCount: paidCount,
      feeRate: tournament.platform_fee_rate,
      prizePoolMode: tournament.prize_pool_mode,
      storedPrizePool: tournament.prize_pool,
      storedPlatformFee: tournament.platform_fee,
    });

    const matchSummary = matchRows.reduce(
      (summary, matchRow) => {
        const linkedMatch = firstRelation(matchRow.match);
        const status = linkedMatch?.status ?? matchRow.status ?? 'pending';
        summary.total += 1;
        if (status === 'completed') {
          summary.completed += 1;
        } else if (['active', 'in_progress', 'disputed'].includes(status)) {
          summary.active += 1;
        } else {
          summary.pending += 1;
        }
        return summary;
      },
      { total: 0, pending: 0, active: 0, completed: 0 }
    );

    const participants: TournamentControlParticipant[] = playerRows.map((player) => {
      const profile = firstRelation(player.user);
      return {
        id: player.id,
        userId: player.user_id,
        username: profile?.username ?? 'Unknown player',
        seed: player.seed,
        paymentStatus: player.payment_status ?? 'pending',
        checkInStatus: player.check_in_status ?? 'registered',
        checkedInAt: player.checked_in_at,
        joinedAt: player.joined_at,
        isActive: isActiveTournamentPlayerStatus(player.payment_status),
      };
    });

    const blockers = getStartBlockers({
      tournament,
      confirmedPlayers: confirmedCount,
      isOrganizer,
    });

    const response: TournamentControlResponse = {
      tournament: {
        id: tournament.id,
        slug: tournament.slug,
        title: tournament.title,
        game: tournament.game,
        platform: tournament.platform,
        region: tournament.region,
        size: tournament.size,
        status: tournament.status,
        approvalStatus: tournament.approval_status ?? 'pending',
        scheduledFor: tournament.scheduled_for,
        entryFee: Math.max(0, Number(tournament.entry_fee ?? 0)),
        payoutStatus: tournament.payout_status ?? 'locked',
      },
      viewer: {
        isOrganizer,
        isModerator,
      },
      metrics: {
        activePlayers: activePlayerRows.length,
        confirmedPlayers: confirmedCount,
        checkedInPlayers,
        pendingPayments: paymentBreakdown.pending ?? 0,
        openDisputes,
        matches: matchSummary,
      },
      finance: {
        entryFee: Math.max(0, Number(tournament.entry_fee ?? 0)),
        gross: prizeSnapshot.gross,
        prizePool: prizeSnapshot.prizePool,
        platformFee: prizeSnapshot.platformFee,
        payoutStatus: tournament.payout_status ?? 'locked',
        paidEntries: paidCount,
        freeEntries: paymentBreakdown.free ?? 0,
        paymentBreakdown,
      },
      start: {
        canStart: blockers.length === 0,
        blockers,
      },
      participants,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[Tournament Control] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
