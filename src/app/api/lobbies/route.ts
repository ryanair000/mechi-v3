import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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
      query = query.eq('game', game);
    }

    const { data: lobbies, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch lobbies' }, { status: 500 });
    }

    return NextResponse.json({ lobbies: lobbies ?? [] });
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
    const { game, title, mode } = body;

    if (!game || !title) {
      return NextResponse.json({ error: 'Game and title are required' }, { status: 400 });
    }

    const gameConfig = GAMES[game as GameKey];
    if (!gameConfig) {
      return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: lobby, error } = await supabase
      .from('lobbies')
      .insert({
        host_id: authUser.sub,
        game,
        mode: mode ?? gameConfig.mode,
        title: title.trim(),
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
