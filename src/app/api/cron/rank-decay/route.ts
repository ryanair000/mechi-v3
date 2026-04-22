import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { DECAY_RULES, TRACKED_RANKED_GAMES } from '@/lib/gamification';
import { getGameRatingKey } from '@/lib/config';

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DECAY_RULES.inactiveDays);
    const cutoffStamp = cutoffDate.toISOString().slice(0, 10);

    const ratingColumns = TRACKED_RANKED_GAMES.map(getGameRatingKey).join(', ');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`id, last_match_date, ${ratingColumns}`)
      .or(`last_match_date.lt.${cutoffStamp},last_match_date.is.null`);

    if (error) {
      console.error('[Rank Decay] Query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    let decayed = 0;
    const updates: Promise<unknown>[] = [];

    for (const profile of profiles ?? []) {
      const profileRecord = profile as unknown as Record<string, unknown>;
      const update: Record<string, number> = {};

      for (const game of TRACKED_RANKED_GAMES) {
        const ratingKey = getGameRatingKey(game);
        const currentRating =
          typeof profileRecord[ratingKey] === 'number'
            ? (profileRecord[ratingKey] as number)
            : 0;

        if (currentRating >= DECAY_RULES.minRating) {
          const newRating = Math.max(
            DECAY_RULES.minRating,
            currentRating - DECAY_RULES.dailyDecay
          );
          if (newRating !== currentRating) {
            update[ratingKey] = newRating;
          }
        }
      }

      if (Object.keys(update).length > 0) {
        decayed++;
        updates.push(
          Promise.resolve(
            supabase
              .from('profiles')
              .update(update)
              .eq('id', profileRecord.id as string)
          )
        );
      }
    }

    await Promise.allSettled(updates);

    return NextResponse.json({
      ok: true,
      decayed,
      checked: (profiles ?? []).length,
    });
  } catch (err) {
    console.error('[Rank Decay] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
