import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import { firstRelation } from '@/lib/tournaments';
import type { AdminQueueEntry, GameKey, MatchStatus, PlatformKey, UserRole } from '@/types';

type QueueUserRelation = {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  region: string;
  role: UserRole | null;
  is_banned: boolean | null;
};

type PendingMatchRelation = {
  id: string;
  game: GameKey;
  status: MatchStatus;
  created_at: string;
  player1_id: string;
  player2_id: string;
  player1?: { id: string; username: string } | Array<{ id: string; username: string }> | null;
  player2?: { id: string; username: string } | Array<{ id: string; username: string }> | null;
};

function safeSearch(value: string) {
  return value.replace(/[%,]/g, '').trim().toLowerCase();
}

function toQueueEntry(
  row: Record<string, unknown>,
  activeMatchMap: Map<string, PendingMatchRelation>
): AdminQueueEntry {
  const user = firstRelation(row.user as QueueUserRelation | QueueUserRelation[] | null | undefined);
  const userId = row.user_id as string;
  const activeMatch = activeMatchMap.get(userId);
  const player1 = firstRelation(activeMatch?.player1);
  const player2 = firstRelation(activeMatch?.player2);
  const opponent =
    activeMatch && player1 && player2
      ? activeMatch.player1_id === userId
        ? player2
        : player1
      : null;

  return {
    id: row.id as string,
    user_id: userId,
    game: row.game as GameKey,
    platform: (row.platform as PlatformKey | null | undefined) ?? null,
    region: row.region as string,
    rating: (row.rating as number | undefined) ?? 1000,
    status: row.status as AdminQueueEntry['status'],
    joined_at: row.joined_at as string,
    user: user
      ? {
          id: user.id,
          username: user.username,
          phone: user.phone ?? null,
          email: user.email ?? null,
          region: user.region,
          role: user.role ?? 'user',
          is_banned: Boolean(user.is_banned),
        }
      : null,
    active_match: activeMatch
      ? {
          id: activeMatch.id,
          game: activeMatch.game,
          status: activeMatch.status,
          created_at: activeMatch.created_at,
          opponent: opponent ? { id: opponent.id, username: opponent.username } : null,
        }
      : null,
  };
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
    const platform = searchParams.get('platform');
    const region = searchParams.get('region');
    const search = safeSearch(searchParams.get('q') ?? '');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const fetchSize = search ? Math.min(offset + limit + 80, 250) : limit;
    const supabase = createServiceClient();

    let query = supabase
      .from('queue')
      .select(
        'id, user_id, game, platform, region, rating, status, joined_at, user:user_id(id, username, phone, email, region, role, is_banned)',
        { count: 'exact' }
      )
      .order('joined_at', { ascending: true });

    if (status && ['waiting', 'matched', 'cancelled'].includes(status)) {
      query = query.eq('status', status);
    }

    if (game && GAMES[game as GameKey]) {
      query = query.eq('game', game);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (region) {
      query = query.eq('region', region);
    }

    if (!search) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(fetchSize);
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch queue entries' }, { status: 500 });
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const userIds = rows.map((row) => row.user_id as string);
    const matchSelect =
      'id, game, status, created_at, player1_id, player2_id, player1:player1_id(id, username), player2:player2_id(id, username)';

    const [player1Matches, player2Matches] = userIds.length
      ? await Promise.all([
          supabase
            .from('matches')
            .select(matchSelect)
            .eq('status', 'pending')
            .in('player1_id', userIds),
          supabase
            .from('matches')
            .select(matchSelect)
            .eq('status', 'pending')
            .in('player2_id', userIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (player1Matches.error || player2Matches.error) {
      return NextResponse.json({ error: 'Failed to fetch queue-linked matches' }, { status: 500 });
    }

    const activeMatchMap = new Map<string, PendingMatchRelation>();
    const pendingMatches = [
      ...((player1Matches.data ?? []) as PendingMatchRelation[]),
      ...((player2Matches.data ?? []) as PendingMatchRelation[]),
    ];

    for (const match of pendingMatches) {
      if (!activeMatchMap.has(match.player1_id)) {
        activeMatchMap.set(match.player1_id, match);
      }
      if (!activeMatchMap.has(match.player2_id)) {
        activeMatchMap.set(match.player2_id, match);
      }
    }

    const entries = rows.map((row) => toQueueEntry(row, activeMatchMap));
    const filteredEntries = search
      ? entries.filter((entry) => {
          const values = [
            entry.user?.username,
            entry.user?.phone,
            entry.user?.email,
            entry.region,
            entry.game,
            entry.platform ?? '',
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return values.includes(search);
        })
      : entries;

    const pagedEntries = search ? filteredEntries.slice(offset, offset + limit) : filteredEntries;

    return NextResponse.json({
      entries: pagedEntries,
      total: search ? filteredEntries.length : count ?? filteredEntries.length,
    });
  } catch (err) {
    console.error('[Admin Queue] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
