import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import {
  GAMES,
  getCanonicalGameKey,
  getDefaultLobbyMode,
  getLobbyModeOptions,
  getLobbyPopularMaps,
  supportsLobbyMode,
} from '@/lib/config';
import type { GameKey } from '@/types';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');

    const supabase = createServiceClient();

    let query = supabase
      .from('lobbies')
      .select('*, host:host_id(id, username), member_count:lobby_members(count)')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(30);

    if (game && GAMES[game as GameKey]) {
      query = query.eq('game', getCanonicalGameKey(game as GameKey));
    }

    const { data: lobbies, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch lobbies' }, { status: 500 });
    }

    const normalizedLobbies = ((lobbies ?? []) as Array<Record<string, unknown>>).map((lobby) => ({
      ...lobby,
      member_count: readRelationCount(lobby.member_count),
    }));

    return NextResponse.json({ lobbies: normalizedLobbies });
  } catch (err) {
    console.error('[Lobbies GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { game: requestedGame, title, mode, map_name, scheduled_for } = body;
    const game = requestedGame && GAMES[requestedGame as GameKey]
      ? getCanonicalGameKey(requestedGame as GameKey)
      : requestedGame;
    const normalizedTitle = String(title ?? '').trim();
    const normalizedSchedule = String(scheduled_for ?? '').trim();

    if (!game || !normalizedTitle) {
      return NextResponse.json({ error: 'Game and title are required' }, { status: 400 });
    }

    const gameConfig = GAMES[game as GameKey];
    if (!gameConfig) {
      return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
    }
    if (!supportsLobbyMode(game as GameKey)) {
      return NextResponse.json({ error: 'Pick a supported lobby game' }, { status: 400 });
    }

    const normalizedMode = String(mode ?? '').trim();
    const normalizedMap = String(map_name ?? '').trim();
    const modeOptions = getLobbyModeOptions(game as GameKey);
    const mapOptions = getLobbyPopularMaps(game as GameKey);

    if (modeOptions.length > 0 && !modeOptions.includes(normalizedMode)) {
      return NextResponse.json({ error: 'Select a valid game mode' }, { status: 400 });
    }

    if (mapOptions.length > 0 && !normalizedMap) {
      return NextResponse.json({ error: 'Select a map or type your own' }, { status: 400 });
    }

    if (normalizedMap.length > 40) {
      return NextResponse.json({ error: 'Map name is too long' }, { status: 400 });
    }

    if (!normalizedSchedule) {
      return NextResponse.json({ error: 'Expected match date and time are required' }, { status: 400 });
    }

    const scheduledAt = new Date(normalizedSchedule);

    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: 'Pick a valid expected match date and time' }, { status: 400 });
    }

    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Expected match date and time must be in the future' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: lobby, error } = await supabase
      .from('lobbies')
      .insert({
        host_id: authUser.sub,
        game,
        mode: normalizedMode || getDefaultLobbyMode(game as GameKey),
        map_name: normalizedMap || null,
        scheduled_for: scheduledAt.toISOString(),
        title: normalizedTitle,
        max_players: gameConfig.maxPlayers ?? 2,
        room_code: generateRoomCode(),
        status: 'open',
      })
      .select()
      .single();

    if (error || !lobby) {
      return NextResponse.json({ error: 'Failed to create lobby' }, { status: 500 });
    }

    // Auto-join as host
    await supabase.from('lobby_members').insert({
      lobby_id: lobby.id,
      user_id: authUser.sub,
    });

    return NextResponse.json({ lobby }, { status: 201 });
  } catch (err) {
    console.error('[Lobbies POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
