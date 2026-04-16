import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_PROFILE_SHARE_SELECT, getProfileShareStats } from '@/lib/share';
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
      .select(PUBLIC_PROFILE_SHARE_SELECT)
      .ilike('username', username)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const { games, bestRating, totalWins, totalLosses } = getProfileShareStats(
      profile as Record<string, unknown>
    );

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
