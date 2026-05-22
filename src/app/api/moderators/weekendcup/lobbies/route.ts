import { NextRequest, NextResponse } from 'next/server';
import { requireModeratorTournamentScope } from '@/lib/moderator-tournament-access';
import { createServiceClient } from '@/lib/supabase';
import { WEEKEND_CUP_SLUG, isWeekendCupGame } from '@/lib/weekend-cup';
import type { WeekendCupLobby, WeekendCupLobbyStatus } from '@/lib/weekend-cup-match-day';

function cleanText(value: unknown, maxLength = 100): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value, 10);
  return null;
}

const LOBBY_STATUSES: WeekendCupLobbyStatus[] = ['pending', 'active', 'completed', 'cancelled'];

function isLobbyStatus(value: unknown): value is WeekendCupLobbyStatus {
  return typeof value === 'string' && LOBBY_STATUSES.includes(value as WeekendCupLobbyStatus);
}

export async function GET(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;

  const { searchParams } = new URL(request.url);
  const gameParam = cleanText(searchParams.get('game'), 20);
  const game = isWeekendCupGame(gameParam) ? gameParam : null;

  if (!scope.isAdmin && scope.assignment?.game !== game) {
    return NextResponse.json({ error: 'Access limited to your assigned game' }, { status: 403 });
  }

  const supabase = createServiceClient();
  let query = supabase
    .from('weekend_cup_lobbies')
    .select('*')
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .order('lobby_number', { ascending: true })
    .order('match_number', { ascending: true });

  if (game) {
    query = query.eq('game', game);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[WeekendCupLobbies GET] Error:', error);
    return NextResponse.json({ error: 'Could not load lobbies' }, { status: 500 });
  }

  return NextResponse.json({ lobbies: (data ?? []) as WeekendCupLobby[] });
}

export async function POST(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const game = cleanText(body.game, 20);
  if (!isWeekendCupGame(game)) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
  }

  if (!scope.isAdmin && scope.assignment?.game !== game) {
    return NextResponse.json({ error: 'You can only create lobbies for your assigned game' }, { status: 403 });
  }

  const lobbyNumber = readInteger(body.lobby_number);
  const matchNumber = readInteger(body.match_number) ?? 1;
  const roomId = cleanText(body.room_id, 50) || null;
  const roomPassword = cleanText(body.room_password, 50) || null;

  if (!lobbyNumber || lobbyNumber < 1) {
    return NextResponse.json({ error: 'Lobby number is required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('weekend_cup_lobbies')
    .insert({
      event_slug: WEEKEND_CUP_SLUG,
      game,
      lobby_number: lobbyNumber,
      match_number: matchNumber,
      room_id: roomId,
      room_password: roomPassword,
      status: 'pending',
      created_by: scope.profile?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Lobby already exists for this game/match' }, { status: 409 });
    }
    console.error('[WeekendCupLobbies POST] Error:', error);
    return NextResponse.json({ error: 'Could not create lobby' }, { status: 500 });
  }

  return NextResponse.json({ lobby: data as WeekendCupLobby });
}

export async function PATCH(request: NextRequest) {
  const scope = await requireModeratorTournamentScope(request);
  if (scope.response) return scope.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const lobbyId = cleanText(body.lobby_id, 50);
  if (!lobbyId) {
    return NextResponse.json({ error: 'Lobby ID is required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: existing, error: readError } = await supabase
    .from('weekend_cup_lobbies')
    .select('id, game')
    .eq('id', lobbyId)
    .eq('event_slug', WEEKEND_CUP_SLUG)
    .maybeSingle();

  if (readError || !existing) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  const lobbyGame = (existing as { game?: string }).game;
  if (!scope.isAdmin && scope.assignment?.game !== lobbyGame) {
    return NextResponse.json({ error: 'You can only update lobbies for your assigned game' }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (Object.prototype.hasOwnProperty.call(body, 'room_id')) {
    updates.room_id = cleanText(body.room_id, 50) || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'room_password')) {
    updates.room_password = cleanText(body.room_password, 50) || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (!isLobbyStatus(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updates.status = body.status;
    if (body.status === 'active') {
      updates.started_at = updates.updated_at;
    } else if (body.status === 'completed') {
      updates.completed_at = updates.updated_at;
    }
  }

  const { data, error } = await supabase
    .from('weekend_cup_lobbies')
    .update(updates)
    .eq('id', lobbyId)
    .select()
    .single();

  if (error) {
    console.error('[WeekendCupLobbies PATCH] Error:', error);
    return NextResponse.json({ error: 'Could not update lobby' }, { status: 500 });
  }

  return NextResponse.json({ lobby: data as WeekendCupLobby });
}
