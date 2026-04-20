import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import {
  firstRelation,
  getTournamentPaymentMetrics,
  getTournamentPrizeSnapshot,
  isTournamentReviewSchemaMissing,
  isActiveTournamentPlayerStatus,
  releaseExpiredTournamentReservations,
  withTournamentReviewDefaults,
} from '@/lib/tournaments';

const TOURNAMENT_DETAIL_SELECT =
  'id, slug, title, game, platform, region, size, entry_fee, prize_pool, platform_fee, platform_fee_rate, status, winner_id, organizer_id, rules, approval_status, approved_at, approved_by, is_featured, payout_status, created_at, started_at, ended_at, organizer:organizer_id(id, username), winner:winner_id(id, username)';
const TOURNAMENT_DETAIL_LEGACY_SELECT =
  'id, slug, title, game, platform, region, size, entry_fee, prize_pool, platform_fee, platform_fee_rate, status, winner_id, organizer_id, rules, payout_status, created_at, started_at, ended_at, organizer:organizer_id(id, username), winner:winner_id(id, username)';
const TOURNAMENT_PLAYER_SELECT =
  'id, tournament_id, user_id, seed, payment_status, joined_at, user:user_id(id, username)';
const TOURNAMENT_MATCH_SELECT =
  'id, tournament_id, match_id, round, slot, player1_id, player2_id, winner_id, status, created_at, player1:player1_id(id, username), player2:player2_id(id, username), winner:winner_id(id, username), match:match_id(id, status, player1_score, player2_score)';

type TournamentMatchProfileRelation =
  | { id: string; username: string }
  | Array<{ id: string; username: string }>
  | null
  | undefined;

type TournamentMatchGameRelation =
  | {
      id: string;
      status: string;
      player1_score: number | null;
      player2_score: number | null;
    }
  | Array<{
      id: string;
      status: string;
      player1_score: number | null;
      player2_score: number | null;
    }>
  | null
  | undefined;

type TournamentDetailRow = Record<string, unknown> & {
  id: string;
  organizer_id: string;
  size: number;
  entry_fee: number;
  platform_fee: number;
  platform_fee_rate: number;
  prize_pool: number;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();
    let supportsReviewControls: boolean | null = null;
    const loadTournament = async (column: 'slug' | 'id', value: string) => {
      const select =
        supportsReviewControls === false ? TOURNAMENT_DETAIL_LEGACY_SELECT : TOURNAMENT_DETAIL_SELECT;

      let result = await supabase.from('tournaments').select(select).eq(column, value).single();

      if (supportsReviewControls !== false && isTournamentReviewSchemaMissing(result.error)) {
        supportsReviewControls = false;
        result = await supabase
          .from('tournaments')
          .select(TOURNAMENT_DETAIL_LEGACY_SELECT)
          .eq(column, value)
          .single();
      } else if (supportsReviewControls === null) {
        supportsReviewControls = true;
      }

      return result;
    };

    const { data: tournamentBySlugRaw, error } = await loadTournament('slug', slug);

    if (error || !tournamentBySlugRaw) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournamentBySlug = withTournamentReviewDefaults(
      tournamentBySlugRaw as unknown as TournamentDetailRow,
      supportsReviewControls !== false
    );

    await releaseExpiredTournamentReservations(supabase, tournamentBySlug.id);

    const { data: refreshedTournamentRaw } = await loadTournament('id', tournamentBySlug.id);
    const tournament = withTournamentReviewDefaults(
      (refreshedTournamentRaw ?? tournamentBySlugRaw) as unknown as TournamentDetailRow,
      supportsReviewControls !== false
    );

    const { data: players } = await supabase
      .from('tournament_players')
      .select(TOURNAMENT_PLAYER_SELECT)
      .eq('tournament_id', tournament.id)
      .order('joined_at', { ascending: true });

    const { data: matches } = await supabase
      .from('tournament_matches')
      .select(TOURNAMENT_MATCH_SELECT)
      .eq('tournament_id', tournament.id)
      .order('round', { ascending: true })
      .order('slot', { ascending: true });

    const playerRows = (players ?? []).filter((player) =>
      isActiveTournamentPlayerStatus(player.payment_status as string | null | undefined)
    );
    const { activeCount, confirmedCount, paidCount } = getTournamentPaymentMetrics(playerRows);
    const prize = getTournamentPrizeSnapshot({
      entryFee: tournament.entry_fee,
      paidPlayerCount: paidCount,
      feeRate: tournament.platform_fee_rate,
      storedPrizePool: tournament.prize_pool,
      storedPlatformFee: tournament.platform_fee,
    });
    const viewerPlayer = playerRows.find((player) => player.user_id === authUser.id) ?? null;

    return NextResponse.json({
      tournament: {
        ...tournament,
        prize_pool: prize.prizePool,
        platform_fee: prize.platformFee,
        confirmed_count: confirmedCount,
        slots_left: Math.max(0, tournament.size - activeCount),
      },
      players: playerRows,
      matches: ((matches ?? []) as Array<Record<string, unknown>>).map((match) => ({
        ...match,
        player1: firstRelation(match.player1 as TournamentMatchProfileRelation),
        player2: firstRelation(match.player2 as TournamentMatchProfileRelation),
        winner: firstRelation(match.winner as TournamentMatchProfileRelation),
        match: firstRelation(match.match as TournamentMatchGameRelation),
      })),
      viewer: {
        joined: Boolean(viewerPlayer),
        isOrganizer: authUser.id === tournament.organizer_id,
        paymentStatus: viewerPlayer?.payment_status ?? null,
      },
    });
  } catch (err) {
    console.error('[Tournament GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
