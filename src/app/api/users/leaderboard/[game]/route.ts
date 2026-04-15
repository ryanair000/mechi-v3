import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import type { GameKey } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game } = await params;

  if (!game || !GAMES[game as GameKey]) {
    return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const ratingKey = `rating_${game}`;
    const winsKey = `wins_${game}`;
    const lossesKey = `losses_${game}`;

    const { data: playersRaw, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(100);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    const players = ((playersRaw as Record<string, unknown>[] | null) ?? []).filter((player) => {
      const selectedGames = Array.isArray(player.selected_games)
        ? player.selected_games.filter((value): value is string => typeof value === 'string')
        : [];

      return selectedGames.includes(game);
    });

    const sorted = players.sort(
      (a, b) => ((b[ratingKey] as number) ?? 1000) - ((a[ratingKey] as number) ?? 1000)
    ).slice(0, 50);

    const leaderboard = sorted.map((p, index) => ({
      rank: index + 1,
      id: p.id,
      username: p.username,
      rating: p[ratingKey] ?? 1000,
      division: getRankDivision((p[ratingKey] as number) ?? 1000).label,
      level: (p.level as number) ?? 1,
      wins: p[winsKey] ?? 0,
      losses: p[lossesKey] ?? 0,
    }));

    return NextResponse.json({ leaderboard, game });
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
