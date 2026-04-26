import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { GAMES, PLATFORMS, getCanonicalGameKey } from '@/lib/config';
import {
  canUserChallengeGame,
  expirePendingChallenges,
  mapChallengeRelations,
  MATCH_CHALLENGE_EXPIRY_HOURS,
  resolveChallengePlatform,
} from '@/lib/challenges';
import { sendChallengeReceivedEmail } from '@/lib/email';
import { createNotifications } from '@/lib/notifications';
import { expireWaitingQueueEntries } from '@/lib/queue';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { APP_URL } from '@/lib/urls';
import { notifyChallengeReceived } from '@/lib/whatsapp';
import type { GameKey, PlatformKey } from '@/types';

type ChallengeProfile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  plan?: string | null;
  plan_expires_at?: string | null;
  region?: string | null;
  email?: string | null;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean | null;
  selected_games?: string[] | null;
  platforms?: PlatformKey[] | null;
  game_ids?: Record<string, string> | null;
};

const CHALLENGE_SELECT =
  '*, challenger:challenger_id(id, username, avatar_url, plan), opponent:opponent_id(id, username, avatar_url, plan)';

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

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();
    await expirePendingChallenges(supabase);

    const [inboundResult, outboundResult] = await Promise.all([
      supabase
        .from('match_challenges')
        .select(CHALLENGE_SELECT)
        .eq('opponent_id', authUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('match_challenges')
        .select(CHALLENGE_SELECT)
        .eq('challenger_id', authUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    return NextResponse.json({
      inbound: ((inboundResult.data ?? []) as Record<string, unknown>[]).map(mapChallengeRelations),
      outbound: ((outboundResult.data ?? []) as Record<string, unknown>[]).map(mapChallengeRelations),
    });
  } catch (error) {
    console.error('[Challenges GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const opponentId = String(body.opponent_id ?? '').trim();
    const requestedGame = String(body.game ?? '').trim() as GameKey;
    const platform = String(body.platform ?? '').trim() as PlatformKey;
    const message = String(body.message ?? '').trim();

    if (!opponentId || opponentId === authUser.id) {
      return NextResponse.json({ error: 'Pick a valid opponent' }, { status: 400 });
    }

    if (!GAMES[requestedGame] || GAMES[requestedGame].mode !== '1v1') {
      return NextResponse.json({ error: 'Pick a supported 1-on-1 game' }, { status: 400 });
    }

    const game = getCanonicalGameKey(requestedGame);
    const challengeRateLimit = checkRateLimit(
      `challenge-create:${authUser.id}:${opponentId}:${game}:${getClientIp(request)}`,
      4,
      30 * 60 * 1000
    );
    if (!challengeRateLimit.allowed) {
      return rateLimitResponse(challengeRateLimit.retryAfterSeconds);
    }

    const supabase = createServiceClient();
    await expirePendingChallenges(supabase);

    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select(
        'id, username, avatar_url, plan, plan_expires_at, region, email, whatsapp_number, whatsapp_notifications, selected_games, platforms, game_ids'
      )
      .in('id', [authUser.id, opponentId]);

    const profiles = (profileRows ?? []) as ChallengeProfile[];
    const challenger = profiles.find((profile) => profile.id === authUser.id);
    const opponent = profiles.find((profile) => profile.id === opponentId);

    if (profilesError || !challenger || !opponent) {
      return NextResponse.json({ error: 'Could not load both player profiles' }, { status: 404 });
    }

    if (!canUserChallengeGame(game, challenger)) {
      return NextResponse.json(
        { error: `Add ${GAMES[game].label} to your profile before sending a challenge` },
        { status: 400 }
      );
    }

    if (!canUserChallengeGame(game, opponent)) {
      return NextResponse.json(
        { error: `${opponent.username} is not set up for ${GAMES[game].label} right now` },
        { status: 400 }
      );
    }

    const resolvedPlatform = resolveChallengePlatform(game, platform, challenger, opponent);
    if (!resolvedPlatform) {
      return NextResponse.json(
        {
          error: `${challenger.username} and ${opponent.username} are not aligned on ${GAMES[game].label} ${platform}`,
        },
        { status: 400 }
      );
    }

    const { waitingQueue, activeMatches } = await hasBlockingState([authUser.id, opponentId], supabase);
    if (waitingQueue.length > 0) {
      return NextResponse.json(
        { error: 'Leave the ranked queue before sending a direct challenge' },
        { status: 409 }
      );
    }

    if (activeMatches.length > 0) {
      return NextResponse.json(
        { error: 'One of these players already has a live match' },
        { status: 409 }
      );
    }

    const { data: duplicates } = await supabase
      .from('match_challenges')
      .select('id, challenger_id, opponent_id')
      .eq('status', 'pending')
      .eq('game', game)
      .eq('platform', resolvedPlatform)
      .in('challenger_id', [authUser.id, opponentId])
      .in('opponent_id', [authUser.id, opponentId]);

    const hasDuplicate = (duplicates ?? []).some((challenge) => {
      const challengerId = challenge.challenger_id as string;
      const targetId = challenge.opponent_id as string;
      return (
        (challengerId === authUser.id && targetId === opponentId) ||
        (challengerId === opponentId && targetId === authUser.id)
      );
    });

    if (hasDuplicate) {
      return NextResponse.json(
        { error: 'There is already a live challenge between you and this player' },
        { status: 409 }
      );
    }

    const expiresAt = new Date(
      Date.now() + MATCH_CHALLENGE_EXPIRY_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: challengeRow, error: insertError } = await supabase
      .from('match_challenges')
      .insert({
        challenger_id: authUser.id,
        opponent_id: opponentId,
        game,
        platform: resolvedPlatform,
        message: message || null,
        expires_at: expiresAt,
      })
      .select(CHALLENGE_SELECT)
      .single();

    if (insertError || !challengeRow) {
      return NextResponse.json({ error: 'Could not send challenge' }, { status: 500 });
    }

    const challenge = mapChallengeRelations(challengeRow as Record<string, unknown>);
    const challengeHref = '/challenges';
    const challengeUrl = `${APP_URL}${challengeHref}`;
    await createNotifications(
      [
        {
          user_id: opponentId,
          type: 'challenge_received',
          title: `${challenger.username} challenged you`,
          body: `${GAMES[game].label} on ${resolvedPlatform.toUpperCase()} is waiting in your inbox.`,
          href: challengeHref,
          metadata: {
            challenge_id: challenge.id,
            game,
            platform: resolvedPlatform,
            challenger_id: authUser.id,
          },
        },
        {
          user_id: authUser.id,
          type: 'challenge_sent',
          title: `Challenge sent to ${opponent.username}`,
          body: `${GAMES[game].label} on ${resolvedPlatform.toUpperCase()} is waiting for a reply.`,
          href: challengeHref,
          metadata: {
            challenge_id: challenge.id,
            game,
            platform: resolvedPlatform,
            opponent_id: opponentId,
          },
        },
      ],
      supabase
    );

    const platformLabel = PLATFORMS[resolvedPlatform]?.label ?? resolvedPlatform;
    const deliveryTasks: Promise<void>[] = [];
    const opponentWhatsAppEnabled =
      ('whatsapp_notifications' in opponent
        ? Boolean(opponent.whatsapp_notifications)
        : Boolean(opponent.whatsapp_number)) && Boolean(opponent.whatsapp_number);

    if (opponent.email) {
      deliveryTasks.push(
        sendChallengeReceivedEmail({
          to: opponent.email,
          username: opponent.username,
          challengerUsername: challenger.username,
          game: GAMES[game].label,
          platform: platformLabel,
          challengeUrl,
          message: message || null,
        })
      );
    }

    if (opponentWhatsAppEnabled && opponent.whatsapp_number) {
      deliveryTasks.push(
        notifyChallengeReceived({
          whatsappNumber: opponent.whatsapp_number,
          username: opponent.username,
          challengerUsername: challenger.username,
          game: GAMES[game].label,
          platform: platformLabel,
          challengeUrl,
          message: message || null,
        })
      );
    }

    if (deliveryTasks.length > 0) {
      await Promise.allSettled(deliveryTasks);
    }

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error('[Challenges POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
