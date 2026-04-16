import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
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
    const metricSelect = ['id', 'username', 'selected_games', ratingKey, winsKey, lossesKey].join(', ');

    let fallbackToDefaults = false;
    let playersRaw: unknown = null;
    let error: unknown = null;

    const initialResult = await supabase
      .from('profiles')
      .select(metricSelect)
      .contains('selected_games', [game])
      .limit(100);

    playersRaw = initialResult.data;
    error = initialResult.error;

    if (
      error &&
      (isMissingColumnError(error, `profiles.${ratingKey}`) ||
        isMissingColumnError(error, `profiles.${winsKey}`) ||
        isMissingColumnError(error, `profiles.${lossesKey}`))
    ) {
      fallbackToDefaults = true;
      const fallbackResult = await supabase
        .from('profiles')
        .select('id, username, selected_games')
        .contains('selected_games', [game])
        .limit(100);

      playersRaw = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error('[Leaderboard] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    const players = (playersRaw as unknown as Record<string, unknown>[] | null) ?? [];

    const sorted = players.sort(
      (a, b) =>
        fallbackToDefaults
          ? String(a.username ?? '').localeCompare(String(b.username ?? ''))
          : ((b[ratingKey] as number) ?? 1000) - ((a[ratingKey] as number) ?? 1000)
    ).slice(0, 50);

    const leaderboard = sorted.map((p, index) => {
      const rating = fallbackToDefaults ? 1000 : (p[ratingKey] as number | undefined) ?? 1000;

      return {
        rank: index + 1,
        id: p.id,
        username: p.username,
        rating,
        division: getRankDivision(rating).label,
        level: 1,
        wins: fallbackToDefaults ? 0 : (p[winsKey] as number | undefined) ?? 0,
        losses: fallbackToDefaults ? 0 : (p[lossesKey] as number | undefined) ?? 0,
      };
    });

    return NextResponse.json({ leaderboard, game });
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
