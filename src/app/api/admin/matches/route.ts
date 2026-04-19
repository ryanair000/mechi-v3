import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { GAMES, getCanonicalGameKey } from '@/lib/config';
import {
  countOpenMatchEscalations,
  listOpenMatchEscalationCounts,
} from '@/lib/match-escalations';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey, MatchStatus } from '@/types';

const MATCH_ROW_SELECT =
  'id, game, platform, region, status, winner_id, player1_score, player2_score, created_at, completed_at, dispute_screenshot_url, dispute_requested_by, tournament_id, player1:player1_id(id, username), player2:player2_id(id, username)';

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
  a: { status: MatchStatus; created_at: string; open_escalation_count?: number | null },
  b: { status: MatchStatus; created_at: string; open_escalation_count?: number | null }
) {
  const escalationDiff = (b.open_escalation_count ?? 0) - (a.open_escalation_count ?? 0);
  if (escalationDiff !== 0) {
    return escalationDiff;
  }

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
    const gameFilter = game && GAMES[game as GameKey] ? getCanonicalGameKey(game as GameKey) : null;

    if (status === 'attention') {
      const openEscalationCounts = await listOpenMatchEscalationCounts();
      const openEscalationMatchIds = [...openEscalationCounts.keys()];

      let disputedQuery = supabase
        .from('matches')
        .select(MATCH_ROW_SELECT)
        .eq('status', 'disputed')
        .order('created_at', { ascending: false });

      if (gameFilter) {
        disputedQuery = disputedQuery.eq('game', gameFilter);
      }

      let escalatedQuery = openEscalationMatchIds.length
        ? supabase
            .from('matches')
            .select(MATCH_ROW_SELECT)
            .in('id', openEscalationMatchIds)
            .order('created_at', { ascending: false })
        : null;

      if (escalatedQuery && gameFilter) {
        escalatedQuery = escalatedQuery.eq('game', gameFilter);
      }

      const [disputedResult, escalatedResult] = await Promise.all([
        disputedQuery,
        escalatedQuery ?? Promise.resolve({ data: [], error: null }),
      ]);

      if (disputedResult.error || escalatedResult.error) {
        return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
      }

      const mergedMatches = new Map<string, Record<string, unknown>>();
      [...(disputedResult.data ?? []), ...(escalatedResult.data ?? [])].forEach((row) => {
        mergedMatches.set(String(row.id), row as Record<string, unknown>);
      });

      const matches = [...mergedMatches.values()]
        .map((row) => ({
          ...row,
          open_escalation_count: openEscalationCounts.get(String(row.id)) ?? 0,
        }))
        .sort((a, b) =>
          compareMatchesByUrgency(
            a as { status: MatchStatus; created_at: string; open_escalation_count?: number | null },
            b as { status: MatchStatus; created_at: string; open_escalation_count?: number | null }
          )
        )
        .slice(offset, offset + limit);

      return NextResponse.json({ matches });
    }

    let query = supabase
      .from('matches')
      .select(MATCH_ROW_SELECT)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') query = query.eq('status', status);
    if (gameFilter) query = query.eq('game', gameFilter);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    const rows = [...(data ?? [])];
    const escalationCounts = await countOpenMatchEscalations(
      rows.map((row) => String(row.id))
    );
    const matches = rows
      .map((row) => ({
        ...row,
        open_escalation_count: escalationCounts.get(String(row.id)) ?? 0,
      }))
      .sort((a, b) =>
        compareMatchesByUrgency(
          a as { status: MatchStatus; created_at: string; open_escalation_count?: number | null },
          b as { status: MatchStatus; created_at: string; open_escalation_count?: number | null }
        )
      );

    return NextResponse.json({ matches });
  } catch (err) {
    console.error('[Admin Matches] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
