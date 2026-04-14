import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/** Public endpoint — returns profile data for share pages and OG images (no auth) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  try {
    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, region, platforms, selected_games, rating_efootball, rating_fc26, rating_mk11, rating_nba2k26, rating_tekken8, rating_sf6, wins_efootball, wins_fc26, wins_mk11, wins_nba2k26, wins_tekken8, wins_sf6, losses_efootball, losses_fc26, losses_mk11, losses_nba2k26, losses_tekken8, losses_sf6')
      .ilike('username', username)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Calculate best rating and total stats
    const games = (profile.selected_games as string[]) ?? [];
    let bestRating = 1000;
    let totalWins = 0;
    let totalLosses = 0;

    for (const g of games) {
      const r = (profile as Record<string, unknown>)[`rating_${g}`] as number ?? 1000;
      const w = (profile as Record<string, unknown>)[`wins_${g}`] as number ?? 0;
      const l = (profile as Record<string, unknown>)[`losses_${g}`] as number ?? 0;
      if (r > bestRating) bestRating = r;
      totalWins += w;
      totalLosses += l;
    }

    return NextResponse.json({
      profile: {
        username: profile.username,
        region: profile.region,
        platforms: profile.platforms,
        selectedGames: profile.selected_games,
        bestRating,
        totalWins,
        totalLosses,
        gamesCount: games.length,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
