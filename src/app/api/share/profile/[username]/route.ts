import { NextRequest, NextResponse } from 'next/server';
import { getPublicProfileData } from '@/lib/public-profile';

/** Public endpoint — returns profile data for share pages and OG images (no auth) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const profile = await getPublicProfileData(username);

    if (!profile) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        username: profile.username,
        country: profile.country,
        region: profile.region,
        location: profile.location_label,
        platforms: profile.platforms,
        selectedGames: profile.selected_games,
        bestRating: profile.bestRating,
        totalWins: profile.totalWins,
        totalLosses: profile.totalLosses,
        gamesCount: profile.games.length,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
