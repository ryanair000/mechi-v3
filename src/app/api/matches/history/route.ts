import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey } from '@/types';

type MatchHistoryRow = {
  id: string;
  player1_id: string;
  player2_id: string;
  game: GameKey;
  status: string;
  winner_id: string | null;
  rating_change_p1: number | null;
  rating_change_p2: number | null;
  created_at: string;
  completed_at: string | null;
};

type MatchHistoryProfile = {
  id: string;
  username: string;
};

function getMatchResult(match: MatchHistoryRow, currentUserId: string) {
  if (match.status === 'cancelled') {
    return 'cancelled';
  }

  if (!match.winner_id) {
    return 'draw';
  }

  return match.winner_id === currentUserId ? 'win' : 'loss';
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const supabase = createServiceClient();

    const { data: matches, error } = await supabase
      .from('matches')
      .select(
        'id, player1_id, player2_id, game, status, winner_id, rating_change_p1, rating_change_p2, created_at, completed_at'
      )
      .or(`player1_id.eq.${authUser.id},player2_id.eq.${authUser.id}`)
      .in('status', ['completed', 'disputed', 'cancelled'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const matchRows = matches as MatchHistoryRow[];

    // Collect all unique player IDs
    const playerIds = [
      ...new Set(matchRows.flatMap((match) => [match.player1_id, match.player2_id])),
    ];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', playerIds);

    const profileMap = Object.fromEntries(
      ((profiles ?? []) as MatchHistoryProfile[]).map((profile) => [profile.id, profile])
    );

    const enriched = matchRows.map((match) => {
      const isPlayerOne = match.player1_id === authUser.id;
      const opponentId = isPlayerOne ? match.player2_id : match.player1_id;
      const ratingChange = isPlayerOne ? match.rating_change_p1 : match.rating_change_p2;

      return {
        id: match.id,
        game: match.game,
        opponent_id: opponentId,
        opponent_username: profileMap[opponentId]?.username ?? 'Unknown player',
        result: getMatchResult(match, authUser.id),
        is_win: match.winner_id === authUser.id,
        rating_change: ratingChange ?? 0,
        completed_at: match.completed_at ?? match.created_at,
        status: match.status,
      };
    });

    return NextResponse.json({ matches: enriched });
  } catch (err) {
    console.error('[Match History] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
