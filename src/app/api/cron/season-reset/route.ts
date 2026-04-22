import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getRankDivision, TRACKED_RANKED_GAMES } from '@/lib/gamification';
import { getGameRatingKey } from '@/lib/config';

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data: lastSeason } = await supabase
      .from('rank_seasons')
      .select('season_number')
      .order('season_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSeasonNumber =
      ((lastSeason as { season_number?: number } | null)?.season_number ?? 0) + 1;

    const ratingColumns = TRACKED_RANKED_GAMES.map(getGameRatingKey).join(', ');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`id, ${ratingColumns}`);

    if (error) {
      console.error('[Season Reset] Query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    const seasonRows: Array<Record<string, unknown>> = [];
    const updates: Promise<unknown>[] = [];

    for (const profile of profiles ?? []) {
      const profileRecord = profile as Record<string, unknown>;
      const ratingUpdate: Record<string, number> = {};

      for (const game of TRACKED_RANKED_GAMES) {
        const ratingKey = getGameRatingKey(game);
        const currentRating =
          typeof profileRecord[ratingKey] === 'number'
            ? (profileRecord[ratingKey] as number)
            : 500;

        const { tier } = getRankDivision(currentRating);
        // 30% compression toward 1500
        const newRating = Math.round(currentRating * 0.7 + 1500 * 0.3);

        seasonRows.push({
          season_number: nextSeasonNumber,
          game,
          user_id: profileRecord.id,
          peak_rating: currentRating,
          final_rating: currentRating,
          peak_tier: tier,
          final_tier: tier,
          matches: 0,
          wins: 0,
        });

        ratingUpdate[ratingKey] = newRating;
      }

      updates.push(
        supabase
          .from('profiles')
          .update(ratingUpdate)
          .eq('id', profileRecord.id as string)
      );
    }

    // Insert season records in batches of 500
    for (let i = 0; i < seasonRows.length; i += 500) {
      await supabase.from('rank_seasons').insert(seasonRows.slice(i, i + 500));
    }

    await Promise.allSettled(updates);

    return NextResponse.json({
      ok: true,
      season: nextSeasonNumber,
      processed: (profiles ?? []).length,
    });
  } catch (err) {
    console.error('[Season Reset] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
