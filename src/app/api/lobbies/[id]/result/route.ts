import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';

const LOBBY_GAMES = ['codm', 'pubgm', 'freefire', 'fortnite'] as const;
type LobbyGame = (typeof LOBBY_GAMES)[number];

function isLobbyGame(game: string): game is LobbyGame {
  return (LOBBY_GAMES as readonly string[]).includes(game);
}

function calcLobbyScore(placement: number, kills: number, totalPlayers: number): number {
  const placementScore = Math.max(0, (totalPlayers + 1 - placement) * 10);
  return placementScore + kills;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;
  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const placement =
      typeof body.placement === 'number'
        ? body.placement
        : parseInt(String(body.placement ?? ''), 10);
    const kills =
      typeof body.kills === 'number'
        ? body.kills
        : parseInt(String(body.kills ?? '0'), 10);
    const totalPlayers =
      typeof body.total_players === 'number' ? body.total_players : 12;

    if (!Number.isFinite(placement) || placement < 1) {
      return NextResponse.json(
        { error: 'placement must be a positive integer' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(kills) || kills < 0) {
      return NextResponse.json(
        { error: 'kills must be 0 or higher' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: lobbyRaw, error: lobbyError } = await supabase
      .from('lobbies')
      .select('id, game, host_id, status, max_players')
      .eq('id', id)
      .single();

    if (lobbyError || !lobbyRaw) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
    }

    const lobby = lobbyRaw as {
      id: string;
      game: string;
      host_id: string;
      status: string;
      max_players: number;
    };

    if (!isLobbyGame(lobby.game)) {
      return NextResponse.json(
        { error: 'This lobby game does not support performance reporting' },
        { status: 400 }
      );
    }

    if (lobby.status !== 'active' && lobby.status !== 'closed') {
      return NextResponse.json({ error: 'Lobby is not active' }, { status: 400 });
    }

    const { data: memberRaw } = await supabase
      .from('lobby_members')
      .select('id')
      .eq('lobby_id', id)
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (!memberRaw) {
      return NextResponse.json(
        { error: 'You are not in this lobby' },
        { status: 403 }
      );
    }

    const effectiveTotalPlayers = Math.max(totalPlayers, lobby.max_players);
    const scoreGained = calcLobbyScore(placement, kills, effectiveTotalPlayers);
    const scoreKey = `lobby_score_${lobby.game}`;
    const gameLabel = GAMES[lobby.game as GameKey]?.label ?? lobby.game;

    const { data: currentProfileRaw } = await supabase
      .from('profiles')
      .select(scoreKey)
      .eq('id', authUser.id)
      .single();

    const currentScore =
      (currentProfileRaw as Record<string, number> | null)?.[scoreKey] ?? 0;

    await supabase
      .from('profiles')
      .update({ [scoreKey]: currentScore + scoreGained })
      .eq('id', authUser.id);

    return NextResponse.json({
      ok: true,
      score_gained: scoreGained,
      new_total: currentScore + scoreGained,
      placement,
      kills,
      game: lobby.game,
      game_label: gameLabel,
    });
  } catch (err) {
    console.error('[Lobby Result] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
