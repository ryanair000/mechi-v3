import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import {
  CONFIRMED_PAYMENT_STATUSES,
  firstRelation,
  isActiveTournamentPlayerStatus,
  releaseExpiredTournamentReservations,
} from '@/lib/tournaments';

const TOURNAMENT_DETAIL_SELECT =
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const authUser = getAuthUser(request);

  try {
    const supabase = createServiceClient();
    const { data: tournamentBySlug, error } = await supabase
      .from('tournaments')
      .select(TOURNAMENT_DETAIL_SELECT)
      .eq('slug', slug)
      .single();

    if (error || !tournamentBySlug) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    await releaseExpiredTournamentReservations(supabase, tournamentBySlug.id);

    const { data: refreshedTournament } = await supabase
      .from('tournaments')
      .select(TOURNAMENT_DETAIL_SELECT)
      .eq('id', tournamentBySlug.id)
      .single();

    const tournament = (refreshedTournament ?? tournamentBySlug) as typeof tournamentBySlug;

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
    const confirmedCount = playerRows.filter((player) =>
      CONFIRMED_PAYMENT_STATUSES.includes(
        player.payment_status as (typeof CONFIRMED_PAYMENT_STATUSES)[number]
      )
    ).length;
    const viewerPlayer = authUser
      ? playerRows.find((player) => player.user_id === authUser.sub) ?? null
      : null;

    return NextResponse.json({
      tournament: {
        ...tournament,
        confirmed_count: confirmedCount,
        slots_left: Math.max(0, tournament.size - confirmedCount),
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
        isOrganizer: authUser?.sub === tournament.organizer_id,
        paymentStatus: viewerPlayer?.payment_status ?? null,
      },
    });
  } catch (err) {
    console.error('[Tournament GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
