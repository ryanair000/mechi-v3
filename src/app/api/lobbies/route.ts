import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import {
  GAMES,
  getCanonicalGameKey,
  getDefaultLobbyMode,
  getLobbyModeOptions,
  getLobbyPopularMaps,
  supportsLobbyMode,
} from '@/lib/config';
import { filterVisibleLobbies, shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { notifyGameAudienceAboutLobby } from '@/lib/game-audience';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import type { GameKey, LobbyVisibility } from '@/types';

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

function normalizeLobbyVisibility(value: unknown): LobbyVisibility | null {
  const normalized = String(value ?? 'public').trim().toLowerCase();

  if (normalized === 'public' || normalized === 'private') {
    return normalized;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');
    const supabase = createServiceClient();
    const canonicalGame = game && GAMES[game as GameKey] ? getCanonicalGameKey(game as GameKey) : null;
    const baseSelect = '*, host:host_id(id, username), member_count:lobby_members(count)';
    let publicQuery = supabase
      .from('lobbies')
      .select(baseSelect)
      .eq('visibility', 'public')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(30);

    if (canonicalGame) {
      publicQuery = publicQuery.eq('game', canonicalGame);
    }

    if (shouldHideE2EFixtures()) {
      publicQuery = publicQuery
        .not('title', 'ilike', '%e2e%')
        .not('room_code', 'ilike', '%e2e%');
    }

    const [{ data: publicLobbies, error: publicError }, { data: memberships, error: membershipError }] =
      await Promise.all([
        publicQuery,
        supabase.from('lobby_members').select('lobby_id').eq('user_id', authUser.id),
      ]);

    if (publicError || membershipError) {
      return NextResponse.json({ error: 'Failed to fetch lobbies' }, { status: 500 });
    }

    const joinedLobbyIds = Array.from(
      new Set(
        ((memberships ?? []) as Array<{ lobby_id?: string | null }>)
          .map((membership) => membership.lobby_id)
          .filter((lobbyId): lobbyId is string => typeof lobbyId === 'string' && lobbyId.length > 0)
      )
    );
    const joinedLobbyIdSet = new Set(joinedLobbyIds);
    const privateFilters = [`host_id.eq.${authUser.id}`];

    if (joinedLobbyIds.length > 0) {
      privateFilters.push(`id.in.(${joinedLobbyIds.join(',')})`);
    }

    let privateQuery = supabase
      .from('lobbies')
      .select(baseSelect)
      .eq('visibility', 'private')
      .in('status', ['open', 'in_progress'])
      .or(privateFilters.join(','))
      .order('created_at', { ascending: false })
      .limit(30);

    if (canonicalGame) {
      privateQuery = privateQuery.eq('game', canonicalGame);
    }

    if (shouldHideE2EFixtures()) {
      privateQuery = privateQuery
        .not('title', 'ilike', '%e2e%')
        .not('room_code', 'ilike', '%e2e%');
    }

    const { data: privateLobbies, error: privateError } = await privateQuery;

    if (privateError) {
      return NextResponse.json({ error: 'Failed to fetch lobbies' }, { status: 500 });
    }

    const mergedLobbies = filterVisibleLobbies([
      ...((publicLobbies ?? []) as Array<Record<string, unknown>>),
      ...((privateLobbies ?? []) as Array<Record<string, unknown>>),
    ]);
    const dedupedLobbies = Array.from(new Map(mergedLobbies.map((lobby) => [String(lobby.id), lobby])).values());
    const normalizedLobbies = dedupedLobbies
      .sort(
        (left, right) =>
          new Date(String(right.created_at ?? '')).getTime() - new Date(String(left.created_at ?? '')).getTime()
      )
      .slice(0, 30)
      .map((lobby) => ({
        ...lobby,
        member_count: readRelationCount(lobby.member_count),
        is_member: joinedLobbyIdSet.has(String(lobby.id)),
      }));

    return NextResponse.json({ lobbies: normalizedLobbies });
  } catch (err) {
    console.error('[Lobbies GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const body = await request.json();
    const { game: requestedGame, title, visibility: requestedVisibility, mode, map_name, scheduled_for } = body;
    const game = requestedGame && GAMES[requestedGame as GameKey]
      ? getCanonicalGameKey(requestedGame as GameKey)
      : requestedGame;
    const visibility = normalizeLobbyVisibility(requestedVisibility);
    const normalizedTitle = String(title ?? '').trim();
    const normalizedSchedule = String(scheduled_for ?? '').trim();

    if (!game || !normalizedTitle) {
      return NextResponse.json({ error: 'Game and title are required' }, { status: 400 });
    }

    if (!visibility) {
      return NextResponse.json({ error: 'Select public or private' }, { status: 400 });
    }

    const createRateLimit = await checkPersistentRateLimit(
      `lobby-create:${authUser.id}:${game}:${getClientIp(request)}`,
      3,
      30 * 60 * 1000
    );
    if (!createRateLimit.allowed) {
      return rateLimitResponse(createRateLimit.retryAfterSeconds);
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
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', authUser.id)
      .maybeSingle();

    const { data: lobby, error } = await supabase
      .from('lobbies')
      .insert({
        host_id: authUser.id,
        game,
        visibility,
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
      user_id: authUser.id,
    });

    if (visibility === 'public') {
      try {
        await notifyGameAudienceAboutLobby({
          supabase,
          actorUserId: authUser.id,
          game: game as GameKey,
          hostName: String((hostProfile as { username?: string } | null)?.username ?? 'A player'),
          lobbyId: String(lobby.id),
          title: normalizedTitle,
          mode: normalizedMode || getDefaultLobbyMode(game as GameKey),
          mapName: normalizedMap || null,
          scheduledFor: scheduledAt.toISOString(),
          excludeUserIds: [authUser.id],
        });
      } catch (broadcastError) {
        console.error('[Lobbies POST] Broadcast error:', broadcastError);
      }
    }

    return NextResponse.json({ lobby }, { status: 201 });
  } catch (err) {
    console.error('[Lobbies POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
