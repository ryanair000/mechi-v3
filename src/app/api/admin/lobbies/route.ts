import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { GAMES, getCanonicalGameKey } from '@/lib/config';
import { firstRelation } from '@/lib/tournaments';
import type { AdminLobbySummary, GameKey, UserRole } from '@/types';

type LobbyHostRelation = {
  id: string;
  username: string;
  phone?: string | null;
  email?: string | null;
  role?: UserRole | null;
  is_banned?: boolean | null;
};

function safeSearch(value: string) {
  return value.replace(/[%,]/g, '').trim().toLowerCase();
}

function readRelationCount(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0] as { count?: unknown } | undefined;
    return typeof first?.count === 'number' ? first.count : 0;
  }

  if (value && typeof value === 'object' && 'count' in value) {
    const count = (value as { count?: unknown }).count;
    return typeof count === 'number' ? count : 0;
  }

  return 0;
}

function toLobbySummary(row: Record<string, unknown>): AdminLobbySummary {
  const host = firstRelation(row.host as LobbyHostRelation | LobbyHostRelation[] | null | undefined);

  return {
    id: row.id as string,
    host_id: row.host_id as string,
    game: row.game as GameKey,
    mode: row.mode as string,
    map_name: (row.map_name as string | null | undefined) ?? null,
    scheduled_for: (row.scheduled_for as string | null | undefined) ?? null,
    title: row.title as string,
    max_players: (row.max_players as number | undefined) ?? 0,
    room_code: row.room_code as string,
    status: row.status as AdminLobbySummary['status'],
    created_at: row.created_at as string,
    member_count: readRelationCount(row.member_count),
    host: host
      ? {
          id: host.id,
          username: host.username,
          phone: host.phone ?? null,
          email: host.email ?? null,
          role: host.role ?? undefined,
          is_banned: host.is_banned ?? undefined,
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
    const search = safeSearch(searchParams.get('q') ?? '');
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const fetchSize = search ? Math.min(offset + limit + 80, 250) : limit;
    const supabase = createServiceClient();

    let query = supabase
      .from('lobbies')
      .select(
        'id, host_id, game, mode, map_name, scheduled_for, title, max_players, room_code, status, created_at, host:host_id(id, username, phone, email, role, is_banned), member_count:lobby_members(count)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (status && ['open', 'full', 'in_progress', 'closed'].includes(status)) {
      query = query.eq('status', status);
    }

    if (game && GAMES[game as GameKey]) {
      query = query.eq('game', getCanonicalGameKey(game as GameKey));
    }

    if (!search) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(fetchSize);
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch lobbies' }, { status: 500 });
    }

    const summaries = ((data ?? []) as Array<Record<string, unknown>>).map(toLobbySummary);
    const filtered = search
      ? summaries.filter((lobby) => {
          const values = [lobby.title, lobby.room_code, lobby.host?.username ?? '', lobby.game]
            .join(' ')
            .toLowerCase();
          return values.includes(search);
        })
      : summaries;

    const lobbies = search ? filtered.slice(offset, offset + limit) : filtered;

    return NextResponse.json({
      lobbies,
      total: search ? filtered.length : count ?? filtered.length,
    });
  } catch (err) {
    console.error('[Admin Lobbies] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
