import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { GAMES, getCanonicalGameKey } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey, MatchStatus } from '@/types';

function getMatchUrgencyRank(status: MatchStatus) {
  switch (status) {
    case 'disputed':
      return 0;
    case 'pending':
      return 1;
    case 'completed':
      return 2;
    case 'cancelled':
    default:
      return 3;
  }
}

function compareMatchesByUrgency(
  a: { status: MatchStatus; created_at: string },
  b: { status: MatchStatus; created_at: string }
) {
  const rankDiff = getMatchUrgencyRank(a.status) - getMatchUrgencyRank(b.status);
  if (rankDiff !== 0) {
    return rankDiff;
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
    const game = searchParams.get('game');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const supabase = createServiceClient();

    let query = supabase
      .from('matches')
      .select(
        'id, game, platform, region, status, winner_id, player1_score, player2_score, created_at, completed_at, dispute_screenshot_url, dispute_requested_by, tournament_id, player1:player1_id(id, username), player2:player2_id(id, username)'
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') query = query.eq('status', status);
    if (game && GAMES[game as GameKey]) query = query.eq('game', getCanonicalGameKey(game as GameKey));

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    const matches = [...(data ?? [])].sort((a, b) =>
      compareMatchesByUrgency(
        a as { status: MatchStatus; created_at: string },
        b as { status: MatchStatus; created_at: string }
      )
    );

    return NextResponse.json({ matches });
  } catch (err) {
    console.error('[Admin Matches] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
