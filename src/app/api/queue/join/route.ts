import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import {
  GAMES,
  getCanonicalGameKey,
  getConfiguredPlatformForGame,
  getGameRatingKey,
  isValidGamePlatform,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
import { notifyGameAudienceAboutQueue } from '@/lib/game-audience';
import { resolveProfileLocation, UNSPECIFIED_LOCATION_LABEL } from '@/lib/location';
import { canStartMatch } from '@/lib/plans';
import { runMatchmaking } from '@/lib/matchmaking';
import { expireWaitingQueueEntries } from '@/lib/queue';
import { getTodayMatchCount, maybeExpireProfilePlan } from '@/lib/subscription';
import type { GameKey, PlatformKey } from '@/types';

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { game: requestedGame, platform } = body;

    if (!requestedGame || !GAMES[requestedGame as GameKey]) {
      return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
    }

    const game = getCanonicalGameKey(requestedGame as GameKey);

    if (GAMES[game].mode !== '1v1') {
      return NextResponse.json({ error: 'Use lobbies for this game' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get user profile for region and rating
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.sub)
      .single();

    if (profileError || !profileRaw) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = profileRaw as Record<string, unknown>;
    const plan = await maybeExpireProfilePlan(
      {
        id: profile.id as string,
        plan: profile.plan as string | null | undefined,
        plan_expires_at: profile.plan_expires_at as string | null | undefined,
      },
      supabase
    );
    const usedToday = await getTodayMatchCount(authUser.sub, supabase);

    if (!canStartMatch(plan, usedToday)) {
      return NextResponse.json(
        {
          error: 'Daily match limit reached',
          limit_reached: true,
          plan,
          used: usedToday,
          upgrade_url: '/pricing',
        },
        { status: 429 }
      );
    }

    const ratingKey = getGameRatingKey(game);
    const rating = (profile[ratingKey] as number) ?? 1000;
    const selectedGames = normalizeSelectedGameKeys((profile.selected_games as string[]) ?? []);
    if (!selectedGames.includes(game)) {
      const gameLabel = GAMES[game as GameKey]?.label ?? game;
      return NextResponse.json(
        { error: `Add ${gameLabel} to your profile before joining queue` },
        { status: 400 }
      );
    }

    const profilePlatforms = ((profile.platforms as PlatformKey[]) ?? []);
    const profileGameIds = ((profile.game_ids as Record<string, string>) ?? {});
    const requestedPlatform = platform as PlatformKey | undefined;
    const queuePlatform =
      requestedPlatform && isValidGamePlatform(game as GameKey, requestedPlatform)
        ? requestedPlatform
        : getConfiguredPlatformForGame(game as GameKey, profileGameIds, profilePlatforms);

    if (!queuePlatform || !profilePlatforms.includes(queuePlatform)) {
      return NextResponse.json(
        { error: 'Set a platform for this game before joining queue' },
        { status: 400 }
      );
    }

    await expireWaitingQueueEntries(supabase, authUser.sub);

    // Check if already in queue
    let existingQueueResult = await supabase
      .from('queue')
      .select('id, game, platform, status')
      .eq('user_id', authUser.sub)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingQueueResult.error && isMissingColumnError(existingQueueResult.error, 'queue.platform')) {
      existingQueueResult = await supabase
        .from('queue')
        .select('id, game, status')
        .eq('user_id', authUser.sub)
        .eq('status', 'waiting')
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    }

    const existingQueue = existingQueueResult.data;

    if (existingQueue) {
      return NextResponse.json(
        {
          error: 'Already in queue',
          queueEntry: {
            ...existingQueue,
            platform:
              (existingQueue as Record<string, unknown>).platform ?? queuePlatform ?? null,
          },
        },
        { status: 409 }
      );
    }

    // Check for active match
    const { data: activeMatch } = await supabase
      .from('matches')
      .select('id')
      .or(`player1_id.eq.${authUser.sub},player2_id.eq.${authUser.sub}`)
      .eq('status', 'pending')
      .maybeSingle();

    if (activeMatch) {
      return NextResponse.json(
        { error: 'You have an active match', matchId: activeMatch.id },
        { status: 409 }
      );
    }

    const profileLocation = resolveProfileLocation(profile);
    const queuePayload = {
      user_id: authUser.sub,
      game,
      platform: queuePlatform,
      region: profileLocation.label || UNSPECIFIED_LOCATION_LABEL,
      rating,
      status: 'waiting',
    };

    let insertResult = await supabase
      .from('queue')
      .insert(queuePayload)
      .select()
      .single();

    if (insertResult.error && isMissingColumnError(insertResult.error, 'queue.platform')) {
      const legacyQueuePayload = {
        user_id: authUser.sub,
        game,
        region: profileLocation.label || UNSPECIFIED_LOCATION_LABEL,
        rating,
        status: 'waiting' as const,
      };
      insertResult = await supabase
        .from('queue')
        .insert(legacyQueuePayload)
        .select()
        .single();
    }

    const entry = insertResult.data;
    const insertError = insertResult.error;

    if (insertError || !entry) {
      console.error('[Queue Join] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
    }

    // AWAIT matchmaking - must complete before response on Vercel serverless
    try {
      await runMatchmaking(supabase);
    } catch (e) {
      console.error('[Queue Join] Matchmaking error:', e);
    }

    const { data: latestQueueEntry } = await supabase
      .from('queue')
      .select('status')
      .eq('id', entry.id)
      .maybeSingle();

    if (latestQueueEntry?.status === 'waiting') {
      try {
        await notifyGameAudienceAboutQueue({
          supabase,
          game,
          username: String(profile.username ?? 'A player'),
          platform: queuePlatform,
          excludeUserIds: [authUser.sub],
        });
      } catch (broadcastError) {
        console.error('[Queue Join] Broadcast error:', broadcastError);
      }
    }

    return NextResponse.json({
      entry: {
        ...(entry as Record<string, unknown>),
        platform: (entry as Record<string, unknown>).platform ?? queuePlatform ?? null,
      },
    });
  } catch (err) {
    console.error('[Queue Join] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
