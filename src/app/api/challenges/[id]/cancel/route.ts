import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
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

    if (challenge.challenger_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the challenger can cancel this request' }, { status: 403 });
    }

    if (challenge.status !== 'pending') {
      return NextResponse.json({ error: 'This challenge is no longer active' }, { status: 400 });
    }

    await supabase
      .from('match_challenges')
      .update({
        status: 'cancelled',
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
          user_id: challenge.opponent_id,
          type: 'challenge_cancelled',
          title: `${challenger?.username ?? 'The challenger'} pulled back the invite`,
          body: 'That direct 1-on-1 is no longer live.',
          href: '/notifications',
          metadata: {
            challenge_id: challenge.id,
            game: challenge.game,
            platform: challenge.platform,
          },
        },
        {
          user_id: challenge.challenger_id,
          type: 'challenge_cancelled',
          title: `Challenge cancelled`,
          body: `Your invite to ${opponent?.username ?? 'that player'} is closed.`,
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
    console.error('[Challenge Cancel] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
