import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  canUserChallengeGame,
  expirePendingChallenges,
  resolveChallengePlatform,
} from '@/lib/challenges';
import { challengeOperationError } from '@/lib/challenge-lifecycle';
import { GAMES, getCanonicalGameKey } from '@/lib/config';
import { resolveProfileLocation, UNSPECIFIED_LOCATION_LABEL } from '@/lib/location';
import { createNotifications } from '@/lib/notifications';
import { hasPassportBlockBetween } from '@/lib/passport-social';
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

type ChallengeAcceptanceRow = {
  challenge_id: string;
  challenge_status: string;
  match_id: string | null;
  replayed: boolean;
};

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

    if (challenge.opponent_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the challenged player can accept' }, { status: 403 });
    }

    if (await hasPassportBlockBetween(challenge.challenger_id, challenge.opponent_id)) {
      return NextResponse.json({ error: 'This player is unavailable for challenges' }, { status: 403 });
    }

    if (challenge.status === 'accepted' && challenge.match_id) {
      return NextResponse.json({
        success: true,
        challenge: {
          ...challenge,
          status: 'accepted',
        },
        match_id: challenge.match_id,
        match_href: `/match/${challenge.match_id}`,
        replayed: true,
        next_action: {
          label: 'Open match',
          href: `/match/${challenge.match_id}`,
          owner: 'Both players',
        },
      });
    }

    if (challenge.status !== 'pending') {
      return NextResponse.json(
        {
          error:
            challenge.status === 'expired'
              ? 'This 1v1 invite expired. Ask the player to send a new one.'
              : `This 1v1 invite was already ${challenge.status}.`,
          code: `challenge_${challenge.status}`,
          recover_href: '/challenges',
        },
        { status: challenge.status === 'expired' ? 410 : 409 }
      );
    }

    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await supabase
        .from('match_challenges')
        .update({
          status: 'expired',
          responded_at: new Date().toISOString(),
        })
        .eq('id', challenge.id);
      return NextResponse.json(
        {
          error: 'This 1v1 invite expired. Ask the player to send a new one.',
          code: 'challenge_expired',
          recover_href: '/challenges',
        },
        { status: 410 }
      );
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

    await Promise.all(
      [challenge.challenger_id, challenge.opponent_id].map((userId) =>
        expireWaitingQueueEntries(supabase, userId)
      )
    );

    const challengerLocation = resolveProfileLocation(challenger);
    const opponentLocation = resolveProfileLocation(opponent);
    const matchLocationLabel =
      challengerLocation.label ||
      opponentLocation.label ||
      UNSPECIFIED_LOCATION_LABEL;

    const { data: acceptanceData, error: acceptanceError } = await supabase.rpc(
      'accept_match_challenge',
      {
        p_challenge_id: challenge.id,
        p_actor_id: authUser.id,
        p_region: matchLocationLabel,
      }
    );

    if (acceptanceError) {
      const mapped = challengeOperationError(acceptanceError.message ?? '');
      return NextResponse.json(
        {
          error: mapped.error,
          code: 'challenge_accept_conflict',
          recover_href: '/challenges',
        },
        { status: mapped.status }
      );
    }

    const acceptance = (
      Array.isArray(acceptanceData) ? acceptanceData[0] : acceptanceData
    ) as ChallengeAcceptanceRow | null;
    if (acceptance?.challenge_status === 'expired') {
      return NextResponse.json(
        {
          error: 'This 1v1 invite expired. Ask the player to send a new one.',
          code: 'challenge_expired',
          recover_href: '/challenges',
        },
        { status: 410 }
      );
    }

    if (!acceptance?.match_id) {
      return NextResponse.json({ error: 'Could not create the match room.' }, { status: 500 });
    }

    const matchId = acceptance.match_id;

    if (!acceptance.replayed) {
      await Promise.allSettled([
        incrementMatchUsage(challenge.challenger_id, supabase),
        incrementMatchUsage(challenge.opponent_id, supabase),
      ]);
    }

    if (!acceptance.replayed) {
      await createNotifications(
      [
        {
          user_id: challenge.challenger_id,
          type: 'challenge_accepted',
          title: `${opponent.username} accepted your challenge`,
          body: `${GAMES[game].label} is live. Tap in and run it.`,
          href: `/match/${matchId}`,
          metadata: {
            challenge_id: challenge.id,
            match_id: matchId,
            game,
            platform,
          },
        },
        {
          user_id: challenge.opponent_id,
          type: 'challenge_accepted',
          title: `Challenge accepted`,
          body: `${challenger.username} is ready. Your ${GAMES[game].label} match is live now.`,
          href: `/match/${matchId}`,
          metadata: {
            challenge_id: challenge.id,
            match_id: matchId,
            game,
            platform,
          },
        },
      ],
      supabase
      );
    }

    return NextResponse.json({
      success: true,
      challenge: {
        ...challenge,
        status: 'accepted',
        match_id: matchId,
        responded_at: new Date().toISOString(),
      },
      match_id: matchId,
      match_href: `/match/${matchId}`,
      replayed: acceptance.replayed,
      next_action: {
        label: 'Open match',
        href: `/match/${matchId}`,
        owner: 'Both players',
      },
    });
  } catch (error) {
    console.error('[Challenge Accept] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
