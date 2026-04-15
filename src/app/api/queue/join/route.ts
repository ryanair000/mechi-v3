import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { GAMES, getConfiguredPlatformForGame, isValidGamePlatform } from '@/lib/config';
import { runMatchmaking } from '@/lib/matchmaking';
import type { GameKey, PlatformKey } from '@/types';

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { game, platform } = body;

    if (!game || !GAMES[game as GameKey]) {
      return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get user profile for region and rating
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('id, region, platforms, game_ids, rating_efootball, rating_fc26, rating_mk11, rating_nba2k26, rating_tekken8, rating_sf6')
      .eq('id', authUser.sub)
      .single();

    if (profileError || !profileRaw) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = profileRaw as Record<string, unknown>;
    const ratingKey = `rating_${game}`;
    const rating = (profile[ratingKey] as number) ?? 1000;
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

    // Check if already in queue
    const { data: existingQueue } = await supabase
      .from('queue')
      .select('id, status')
      .eq('user_id', authUser.sub)
      .eq('status', 'waiting')
      .maybeSingle();

    if (existingQueue) {
      return NextResponse.json({ error: 'Already in queue' }, { status: 409 });
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

    const { data: entry, error: insertError } = await supabase
      .from('queue')
      .insert({
        user_id: authUser.sub,
        game,
        platform: queuePlatform,
        region: (profile.region as string) ?? 'kenya',
        rating,
        status: 'waiting',
      })
      .select()
      .single();

    if (insertError || !entry) {
      console.error('[Queue Join] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
    }

    // AWAIT matchmaking — must complete before response on Vercel serverless
    try {
      await runMatchmaking(supabase);
    } catch (e) {
      console.error('[Queue Join] Matchmaking error:', e);
    }

    return NextResponse.json({ entry });
  } catch (err) {
    console.error('[Queue Join] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
