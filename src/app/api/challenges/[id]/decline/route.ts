import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { expirePendingChallenges } from '@/lib/challenges';
import { challengeItemHref } from '@/lib/challenge-lifecycle';
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

    if (challenge.opponent_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the challenged player can decline' }, { status: 403 });
    }

    if (challenge.status !== 'pending') {
      return NextResponse.json(
        {
          error:
            challenge.status === 'expired'
              ? 'This 1v1 invite already expired.'
              : `This 1v1 invite was already ${challenge.status}.`,
          code: `challenge_${challenge.status}`,
          recover_href: '/challenges',
        },
        { status: challenge.status === 'expired' ? 410 : 409 }
      );
    }

    const respondedAt = new Date().toISOString();
    const { data: updatedChallenge, error: updateError } = await supabase
      .from('match_challenges')
      .update({
        status: 'declined',
        responded_at: respondedAt,
      })
      .eq('id', challenge.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('[Challenge Decline] Update failed:', updateError);
      return NextResponse.json({ error: 'Could not decline this invite.' }, { status: 500 });
    }

    if (!updatedChallenge) {
      return NextResponse.json(
        {
          error: 'This invite changed while you were viewing it. Refresh to see its current state.',
          code: 'challenge_conflict',
          recover_href: '/challenges',
        },
        { status: 409 }
      );
    }

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
          href: challengeItemHref(challenge.id),
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
          href: challengeItemHref(challenge.id),
          metadata: {
            challenge_id: challenge.id,
            game: challenge.game,
            platform: challenge.platform,
          },
        },
      ],
      supabase
    );

    return NextResponse.json({
      success: true,
      challenge: {
        ...challenge,
        status: 'declined',
        responded_at: respondedAt,
      },
      next_action: {
        label: 'Find another opponent',
        href: '/challenges',
        owner: 'You',
      },
    });
  } catch (error) {
    console.error('[Challenge Decline] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
