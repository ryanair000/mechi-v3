import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { ACHIEVEMENTS, getLevelFromXp, getRankDivision } from '@/lib/gamification';

/** Public endpoint — returns profile data for share pages and OG images (no auth). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const games = (profile.selected_games as string[]) ?? [];
    let bestRating = 1000;
    let totalWins = 0;
    let totalLosses = 0;

    for (const game of games) {
      const rating = ((profile as Record<string, unknown>)[`rating_${game}`] as number) ?? 1000;
      const wins = ((profile as Record<string, unknown>)[`wins_${game}`] as number) ?? 0;
      const losses = ((profile as Record<string, unknown>)[`losses_${game}`] as number) ?? 0;
      if (rating > bestRating) bestRating = rating;
      totalWins += wins;
      totalLosses += losses;
    }

    let achievementKeys: string[] = [];
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('achievement_key, unlocked_at')
      .eq('user_id', profile.id)
      .order('unlocked_at', { ascending: false })
      .limit(3);

    if (!achievementsError) {
      achievementKeys = (achievements ?? []).map((entry) => entry.achievement_key);
    }

    const topAchievements = achievementKeys
      .map((key) => ACHIEVEMENTS.find((achievement) => achievement.key === key))
      .filter((achievement): achievement is (typeof ACHIEVEMENTS)[number] => Boolean(achievement))
      .map((achievement) => ({
        key: achievement.key,
        title: achievement.title,
        emoji: achievement.emoji,
      }));

    const xp = (profile.xp as number | null) ?? 0;
    const level = (profile.level as number | null) ?? getLevelFromXp(xp);
    const division = getRankDivision(bestRating);

    return NextResponse.json({
      profile: {
        username: profile.username,
        region: profile.region,
        platforms: profile.platforms,
        selectedGames: profile.selected_games,
        bestRating,
        division: division.label,
        level,
        totalWins,
        totalLosses,
        gamesCount: games.length,
        topAchievements,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
