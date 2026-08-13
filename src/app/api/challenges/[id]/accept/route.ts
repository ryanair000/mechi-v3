import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  canUserChallengeGame,
  expirePendingChallenges,
  MATCH_CHALLENGE_EXPIRY_HOURS,
  resolveChallengePlatform,
} from '@/lib/challenges';
import { GAMES, PLATFORMS, getCanonicalGameKey } from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
import { sendChallengeAcceptedEmail } from '@/lib/email';
import { resolveProfileLocation, UNSPECIFIED_LOCATION_LABEL } from '@/lib/location';
import { createNotifications } from '@/lib/notifications';
import { hasPassportBlockBetween } from '@/lib/passport-social';
import { expireWaitingQueueEntries } from '@/lib/queue';
import { incrementMatchUsage } from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import { APP_URL } from '@/lib/urls';
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
  email?: string | null;
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
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

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

    const isOpenChallenge = challenge.visibility === 'open' && !challenge.opponent_id;
    if (challenge.challenger_id === authUser.id) {
      return NextResponse.json({ error: 'You cannot accept your own challenge' }, { status: 403 });
    }

    if (!isOpenChallenge && challenge.opponent_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the challenged player can accept' }, { status: 403 });
    }

    if (
      (challenge.opponent_id && await hasPassportBlockBetween(challenge.challenger_id, challenge.opponent_id))
      || (isOpenChallenge && await hasPassportBlockBetween(challenge.challenger_id, authUser.id))
    ) {
      return NextResponse.json({ error: 'This player is unavailable' }, { status: 403 });
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
      .in('id', [challenge.challenger_id, authUser.id]);

    const profiles = (profileRows ?? []) as ChallengeProfile[];
    const challenger = profiles.find((profile) => profile.id === challenge.challenger_id);
    const opponent = profiles.find((profile) => profile.id === authUser.id);

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
      [challenge.challenger_id, authUser.id],
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
      player2_id: authUser.id,
      game,
      platform,
      region: matchLocationLabel,
      status: 'pending',
    };

    const claimedAt = new Date().toISOString();
    let claimQuery = supabase
      .from('match_challenges')
      .update({ opponent_id: authUser.id, responded_at: claimedAt })
      .eq('id', challenge.id)
      .eq('status', 'pending')
      .is('responded_at', null);
    claimQuery = isOpenChallenge
      ? claimQuery.is('opponent_id', null)
      : claimQuery.eq('opponent_id', authUser.id);
    const { data: claimedChallenge, error: claimError } = await claimQuery
      .select('id')
      .maybeSingle();

    if (claimError || !claimedChallenge) {
      return NextResponse.json(
        { error: 'Another player already accepted this challenge' },
        { status: 409 }
      );
    }

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
          player2_id: authUser.id,
          game,
          region: matchLocationLabel,
          status: 'pending',
        })
        .select('id')
        .single();
    }

    const match = matchResult.data as { id: string } | null;
    if (matchResult.error || !match) {
      await supabase
        .from('match_challenges')
        .update({ opponent_id: isOpenChallenge ? null : authUser.id, responded_at: null })
        .eq('id', challenge.id)
        .eq('status', 'pending')
        .eq('responded_at', claimedAt);
      return NextResponse.json({ error: 'Could not create match' }, { status: 500 });
    }

    await supabase
      .from('match_challenges')
      .update({
        status: 'accepted',
        match_id: match.id,
        responded_at: claimedAt,
      })
      .eq('id', challenge.id)
      .eq('status', 'pending')
      .eq('opponent_id', authUser.id)
      .eq('responded_at', claimedAt);

    await Promise.allSettled([
      incrementMatchUsage(challenge.challenger_id, supabase),
      incrementMatchUsage(authUser.id, supabase),
    ]);

    await createNotifications(
      [
        {
          user_id: challenge.challenger_id,
          type: 'challenge_accepted',
          title: `${opponent.username} accepted your challenge`,
          body: `${GAMES[game].label} is live. Tap in and run it.`,
          href: `/app/player/matches/${match.id}`,
          metadata: {
            challenge_id: challenge.id,
            match_id: match.id,
            game,
            platform,
          },
        },
        {
          user_id: authUser.id,
          type: 'challenge_accepted',
          title: `Challenge accepted`,
          body: `${challenger.username} is ready. Your ${GAMES[game].label} match is live now.`,
          href: `/app/player/matches/${match.id}`,
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

    if (challenger.email) {
      await sendChallengeAcceptedEmail({
        to: challenger.email,
        username: challenger.username,
        opponentUsername: opponent.username,
        game: GAMES[game].label,
        platform: PLATFORMS[platform]?.label ?? platform,
        matchUrl: `${APP_URL}/app/player/matches/${match.id}`,
      });
    }

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
