import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { expirePendingChallenges } from '@/lib/challenges';
import { createNotifications } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import type { MatchChallenge } from '@/types';

type ProfileRow = {
  id: string;
  username: string;
};

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
      return NextResponse.json({ error: 'Only the challenged player can decline' }, { status: 403 });
    }

    if (challenge.status !== 'pending') {
      return NextResponse.json({ error: 'This challenge is no longer active' }, { status: 400 });
    }

    await supabase
      .from('match_challenges')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', challenge.id);

    const { data: profilesRaw } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', [challenge.challenger_id, challenge.opponent_id]);

    const profiles = (profilesRaw ?? []) as ProfileRow[];
    const challenger = profiles.find((profile) => profile.id === challenge.challenger_id);
    const opponent = profiles.find((profile) => profile.id === challenge.opponent_id);

    await createNotifications(
      [
        {
          user_id: challenge.challenger_id,
          type: 'challenge_declined',
          title: `${opponent?.username ?? 'Your opponent'} declined the challenge`,
          body: 'That direct 1-on-1 is closed. Send another when both sides are ready.',
          href: '/notifications',
          metadata: {
            challenge_id: challenge.id,
            game: challenge.game,
            platform: challenge.platform,
          },
        },
        {
          user_id: challenge.opponent_id,
          type: 'challenge_declined',
          title: `Challenge declined`,
          body: `You passed on ${challenger?.username ?? 'that player'}'s challenge.`,
          href: '/notifications',
          metadata: {
            challenge_id: challenge.id,
            game: challenge.game,
            platform: challenge.platform,
          },
        },
      ],
      supabase
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Challenge Decline] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
