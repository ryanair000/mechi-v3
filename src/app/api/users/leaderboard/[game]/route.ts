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
      .select(
        [
          'id',
          'username',
          'selected_games',
          'level',
          'rating_efootball',
          'rating_efootball_mobile',
          'rating_fc26',
          'rating_mk11',
          'rating_nba2k26',
          'rating_tekken8',
          'rating_sf6',
          'wins_efootball',
          'wins_efootball_mobile',
          'wins_fc26',
          'wins_mk11',
          'wins_nba2k26',
          'wins_tekken8',
          'wins_sf6',
          'losses_efootball',
          'losses_efootball_mobile',
          'losses_fc26',
          'losses_mk11',
          'losses_nba2k26',
          'losses_tekken8',
          'losses_sf6',
        ].join(', ')
      )
      .contains('selected_games', [game])
      .limit(100);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    const players = (playersRaw as unknown as Record<string, unknown>[] | null) ?? [];

    const sorted = players.sort(
      (a, b) => ((b[ratingKey] as number) ?? 1000) - ((a[ratingKey] as number) ?? 1000)
    ).slice(0, 50);

    const leaderboard = sorted.map((p, index) => {
      const rating = (p[ratingKey] as number | undefined) ?? 1000;

      return {
        rank: index + 1,
        id: p.id,
        username: p.username,
        rating,
        division: getRankDivision(rating).label,
        level: p.level ?? 1,
        wins: p[winsKey] ?? 0,
        losses: p[lossesKey] ?? 0,
      };
    });

    return NextResponse.json({ leaderboard, game });
  } catch (err) {
    console.error('[Leaderboard] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
