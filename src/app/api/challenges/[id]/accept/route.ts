import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  canUserChallengeGame,
  expirePendingChallenges,
  MATCH_CHALLENGE_EXPIRY_HOURS,
  resolveChallengePlatform,
} from '@/lib/challenges';
import { GAMES, getCanonicalGameKey } from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
import { resolveProfileLocation, UNSPECIFIED_LOCATION_LABEL } from '@/lib/location';
import { createNotifications } from '@/lib/notifications';
import { expireWaitingQueueEntries } from '@/lib/queue';
import { incrementMatchUsage } from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey, MatchChallenge, PlatformKey } from '@/types';

type ChallengeProfile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  country?: string | null;
  region?: string | null;
  selected_games?: string[] | null;
  platforms?: PlatformKey[] | null;
  game_ids?: Record<string, string> | null;
};

async function hasBlockingState(
  userIds: string[],
  supabase: ReturnType<typeof createServiceClient>
) {
  await Promise.all(userIds.map((userId) => expireWaitingQueueEntries(supabase, userId)));

  const [queueResult, matchResult] = await Promise.all([
    supabase
      .from('queue')
      .select('id, user_id')
      .in('user_id', userIds)
      .eq('status', 'waiting')
      .limit(4),
    supabase
      .from('matches')
      .select('id, player1_id, player2_id')
      .eq('status', 'pending')
      .or(userIds.map((userId) => `player1_id.eq.${userId},player2_id.eq.${userId}`).join(',')),
  ]);

  return {
    waitingQueue: (queueResult.data ?? []) as Array<{ id: string; user_id: string }>,
    activeMatches: (matchResult.data ?? []) as Array<{
      id: string;
      player1_id: string;
      player2_id: string;
    }>,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const supabase = createServiceClient();
    await expirePendingChallenges(supabase);

    const { data: challengeRow, error: challengeError } = await supabase
      .from('match_challenges')
      .select('*')
      .eq('id', id)
      .single();

    const challenge = challengeRow as MatchChallenge | null;
    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (challenge.opponent_id !== authUser.sub) {
      return NextResponse.json({ error: 'Only the challenged player can accept' }, { status: 403 });
    }

    if (challenge.status !== 'pending') {
      return NextResponse.json({ error: 'This challenge is no longer active' }, { status: 400 });
    }

    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await supabase
        .from('match_challenges')
        .update({
          status: 'expired',
          responded_at: new Date().toISOString(),
        })
        .eq('id', challenge.id);
      return NextResponse.json({ error: 'This challenge has expired' }, { status: 400 });
    }

    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', [challenge.challenger_id, challenge.opponent_id]);

    const profiles = (profileRows ?? []) as ChallengeProfile[];
    const challenger = profiles.find((profile) => profile.id === challenge.challenger_id);
    const opponent = profiles.find((profile) => profile.id === challenge.opponent_id);

    if (profilesError || !challenger || !opponent) {
      return NextResponse.json({ error: 'Could not load both player profiles' }, { status: 404 });
    }

    const game = getCanonicalGameKey(challenge.game as GameKey);
    const platform = challenge.platform as PlatformKey;

    if (!canUserChallengeGame(game, challenger) || !canUserChallengeGame(game, opponent)) {
      return NextResponse.json(
        { error: 'Both players must still have this title on their profile' },
        { status: 400 }
      );
    }

    if (!resolveChallengePlatform(game, platform, challenger, opponent)) {
      return NextResponse.json(
        { error: 'Both players must still share the same configured platform' },
        { status: 400 }
      );
    }

    const { waitingQueue, activeMatches } = await hasBlockingState(
      [challenge.challenger_id, challenge.opponent_id],
      supabase
    );

    if (waitingQueue.length > 0) {
      return NextResponse.json(
        { error: 'Leave the ranked queue before accepting this direct challenge' },
        { status: 409 }
      );
    }

    if (activeMatches.length > 0) {
      return NextResponse.json(
        { error: 'One of these players already has a live match' },
        { status: 409 }
      );
    }

    const challengerLocation = resolveProfileLocation(challenger);
    const opponentLocation = resolveProfileLocation(opponent);
    const matchLocationLabel =
      challengerLocation.label ||
      opponentLocation.label ||
      UNSPECIFIED_LOCATION_LABEL;

    const matchPayload = {
      player1_id: challenge.challenger_id,
      player2_id: challenge.opponent_id,
      game,
      platform,
      region: matchLocationLabel,
      status: 'pending',
    };

    let matchResult = await supabase
      .from('matches')
      .insert(matchPayload)
      .select('id')
      .single();

    if (matchResult.error && isMissingColumnError(matchResult.error, 'matches.platform')) {
      matchResult = await supabase
        .from('matches')
        .insert({
          player1_id: challenge.challenger_id,
          player2_id: challenge.opponent_id,
          game,
          region: matchLocationLabel,
          status: 'pending',
        })
        .select('id')
        .single();
    }

    const match = matchResult.data as { id: string } | null;
    if (matchResult.error || !match) {
      return NextResponse.json({ error: 'Could not create match' }, { status: 500 });
    }

    await supabase
      .from('match_challenges')
      .update({
        status: 'accepted',
        match_id: match.id,
        responded_at: new Date().toISOString(),
      })
      .eq('id', challenge.id);

    await Promise.allSettled([
      incrementMatchUsage(challenge.challenger_id, supabase),
      incrementMatchUsage(challenge.opponent_id, supabase),
    ]);

    await createNotifications(
      [
        {
          user_id: challenge.challenger_id,
          type: 'challenge_accepted',
          title: `${opponent.username} accepted your challenge`,
          body: `${GAMES[game].label} is live. Tap in and run it.`,
          href: `/match/${match.id}`,
          metadata: {
            challenge_id: challenge.id,
            match_id: match.id,
            game,
            platform,
          },
        },
        {
          user_id: challenge.opponent_id,
          type: 'challenge_accepted',
          title: `Challenge accepted`,
          body: `${challenger.username} is ready. Your ${GAMES[game].label} match is live now.`,
          href: `/match/${match.id}`,
          metadata: {
            challenge_id: challenge.id,
            match_id: match.id,
            game,
            platform,
          },
        },
      ],
      supabase
    );

    return NextResponse.json({
      success: true,
      match_id: match.id,
      expires_in_hours: MATCH_CHALLENGE_EXPIRY_HOURS,
    });
  } catch (error) {
    console.error('[Challenge Accept] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
