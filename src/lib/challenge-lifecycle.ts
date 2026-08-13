import type { MatchChallenge } from '@/types';

export type ChallengeDirection = 'incoming' | 'sent';

export type ChallengeLifecyclePresentation = {
  label: string;
  description: string;
  tone: 'positive' | 'neutral' | 'warning';
  actionLabel: string | null;
  actionHref: string | null;
};

export function challengeItemHref(challengeId: string): string {
  return `/challenges#challenge-${challengeId}`;
}

export function getChallengeLifecyclePresentation(
  challenge: Pick<MatchChallenge, 'id' | 'status' | 'match_id'>,
  direction: ChallengeDirection
): ChallengeLifecyclePresentation {
  const opponent = direction === 'incoming' ? 'the challenger' : 'the other player';

  switch (challenge.status) {
    case 'accepted':
      return {
        label: 'Accepted',
        description: challenge.match_id
          ? 'The match is live and ready to open.'
          : 'The invite was accepted. Refresh if the match link is still loading.',
        tone: 'positive',
        actionLabel: challenge.match_id ? 'Open match' : null,
        actionHref: challenge.match_id ? `/match/${challenge.match_id}` : null,
      };
    case 'declined':
      return {
        label: 'Declined',
        description:
          direction === 'incoming'
            ? 'You declined this invite. A new invite is needed to play.'
            : `${opponent} declined. You can choose another opponent.`,
        tone: 'neutral',
        actionLabel: null,
        actionHref: null,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        description:
          direction === 'sent'
            ? 'You cancelled this invite before it was answered.'
            : 'The challenger cancelled this invite.',
        tone: 'neutral',
        actionLabel: null,
        actionHref: null,
      };
    case 'expired':
      return {
        label: 'Expired',
        description: 'The response window ended. Send a new invite when both players are ready.',
        tone: 'warning',
        actionLabel: null,
        actionHref: null,
      };
    case 'pending':
    default:
      return {
        label: direction === 'incoming' ? 'Needs your answer' : 'Waiting for player',
        description:
          direction === 'incoming'
            ? 'Accept to create the match, or decline to close the invite.'
            : 'You can cancel this invite before the other player answers.',
        tone: 'warning',
        actionLabel: null,
        actionHref: challengeItemHref(challenge.id),
      };
  }
}

export function challengeOperationError(message: string): {
  status: number;
  error: string;
} {
  if (message.includes('CHALLENGE_NOT_FOUND') || message.includes('CHALLENGE_PLAYER_MISSING')) {
    return { status: 404, error: 'This 1v1 invite is no longer available.' };
  }
  if (message.includes('CHALLENGE_FORBIDDEN')) {
    return { status: 403, error: 'Only the invited player can accept this 1v1.' };
  }
  if (message.includes('CHALLENGE_QUEUE_CONFLICT')) {
    return {
      status: 409,
      error: 'Leave the ranked queue before accepting this 1v1 invite.',
    };
  }
  if (message.includes('CHALLENGE_MATCH_CONFLICT')) {
    return {
      status: 409,
      error: 'One of you already has a live match. Finish or cancel it, then try again.',
    };
  }
  if (message.includes('CHALLENGE_NOT_PENDING')) {
    return {
      status: 409,
      error: 'This invite changed while you were viewing it. Refresh to see its current state.',
    };
  }
  return { status: 500, error: 'Could not accept this 1v1 invite.' };
}
