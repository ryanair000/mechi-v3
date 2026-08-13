export type PlayerDashboardActionKind =
  | 'active_match'
  | 'check_in'
  | 'incoming_challenge'
  | 'payment'
  | 'result_review'
  | 'profile_setup'
  | 'upcoming_tournament'
  | 'discover';

export type PlayerDashboardAction = {
  kind: PlayerDashboardActionKind;
  eyebrow: string;
  title: string;
  description: string;
  owner: string;
  label: string;
  href: string;
  deadline_at?: string | null;
  secondary_label?: string;
  secondary_href?: string;
};

export type PlayerDashboardTodayItem = {
  id: string;
  kind: PlayerDashboardActionKind | 'team_invitation' | 'waiting_for_opponent';
  title: string;
  detail: string;
  href: string;
  action_label: string;
  deadline_at?: string | null;
};

type MatchContext = {
  id: string;
  opponentName: string;
  gameLabel: string;
};

type TournamentContext = {
  id: string;
  slug: string;
  title: string;
  gameLabel: string;
  scheduledAt?: string | null;
  scheduledLabel: string;
};

type ChallengeContext = {
  id: string;
  challengerName: string;
  gameLabel: string;
  expiresAt?: string | null;
};

type PaymentContext = TournamentContext & {
  paymentStatus: string;
};

type ResultContext = MatchContext & {
  disputed: boolean;
};

type SetupContext = {
  description: string;
  label: string;
};

export type PlayerDashboardPriorityInput = {
  activeMatch?: MatchContext | null;
  checkIn?: TournamentContext | null;
  incomingChallenge?: ChallengeContext | null;
  interruptedRegistration?: PaymentContext | null;
  resultResponse?: ResultContext | null;
  setupBlocker?: SetupContext | null;
  upcomingTournament?: TournamentContext | null;
};

export function choosePlayerDashboardAction(
  input: PlayerDashboardPriorityInput
): PlayerDashboardAction {
  if (input.activeMatch) {
    return {
      kind: 'active_match',
      eyebrow: 'Match room is open',
      title: `Play ${input.activeMatch.opponentName}`,
      description: `${input.activeMatch.gameLabel} is ready. Open the match room before starting another match.`,
      owner: `You and ${input.activeMatch.opponentName}`,
      label: 'Open match room',
      href: `/match/${input.activeMatch.id}`,
    };
  }

  if (input.checkIn) {
    return {
      kind: 'check_in',
      eyebrow: 'Check-in is open',
      title: `Check in for ${input.checkIn.title}`,
      description: `Confirm that you are ready before ${input.checkIn.scheduledLabel}.`,
      owner: 'You',
      label: 'Check in now',
      href: `/t/${input.checkIn.slug}`,
      deadline_at: input.checkIn.scheduledAt,
    };
  }

  if (input.incomingChallenge) {
    return {
      kind: 'incoming_challenge',
      eyebrow: '1v1 invite to answer',
      title: `${input.incomingChallenge.challengerName} wants to play`,
      description: `Accept or decline the ${input.incomingChallenge.gameLabel} invite before it expires.`,
      owner: 'You',
      label: 'Answer invite',
      href: `/challenges#challenge-${input.incomingChallenge.id}`,
      deadline_at: input.incomingChallenge.expiresAt,
    };
  }

  if (input.interruptedRegistration) {
    const failed = input.interruptedRegistration.paymentStatus === 'failed';
    return {
      kind: 'payment',
      eyebrow: 'Finish registration',
      title: `Complete ${input.interruptedRegistration.title} registration`,
      description: failed
        ? 'The previous payment did not complete. Review the registration before trying again.'
        : 'Your tournament place is waiting for payment confirmation.',
      owner: 'You',
      label: 'Resume registration',
      href: `/t/${input.interruptedRegistration.slug}`,
    };
  }

  if (input.resultResponse) {
    return {
      kind: 'result_review',
      eyebrow: 'Result needs attention',
      title: input.resultResponse.disputed
        ? `Resolve the result with ${input.resultResponse.opponentName}`
        : `Confirm the result from ${input.resultResponse.opponentName}`,
      description: input.resultResponse.disputed
        ? 'The reports do not match. Open the match to review the score, proof, and next step.'
        : 'Your opponent submitted a result. Confirm it or report the correct score.',
      owner: 'You',
      label: 'Review result',
      href: `/match/${input.resultResponse.id}`,
    };
  }

  if (input.setupBlocker) {
    return {
      kind: 'profile_setup',
      eyebrow: 'Finish player setup',
      title: input.setupBlocker.label,
      description: input.setupBlocker.description,
      owner: 'You',
      label: 'Finish player setup',
      href: '/profile/settings',
    };
  }

  if (input.upcomingTournament) {
    return {
      kind: 'upcoming_tournament',
      eyebrow: 'Coming up',
      title: input.upcomingTournament.title,
      description: `${input.upcomingTournament.gameLabel} · ${input.upcomingTournament.scheduledLabel}`,
      owner: 'You',
      label: 'View tournament',
      href: `/t/${input.upcomingTournament.slug}`,
      deadline_at: input.upcomingTournament.scheduledAt,
    };
  }

  return {
    kind: 'discover',
    eyebrow: 'Ready when you are',
    title: 'Choose how you want to play',
    description: 'Join a tournament, play a direct 1v1, or create a team with friends.',
    owner: 'You',
    label: 'Find a tournament',
    href: '/tournaments',
    secondary_label: 'Play 1v1',
    secondary_href: '/challenges',
  };
}

export function buildPlayerDashboardTodayItems(
  input: PlayerDashboardPriorityInput & {
    waitingForOpponent?: MatchContext | null;
    teamInvitation?: {
      id: string;
      teamName: string;
      inviterName: string;
      expiresAt?: string | null;
    } | null;
  }
): PlayerDashboardTodayItem[] {
  const items: PlayerDashboardTodayItem[] = [];

  if (input.activeMatch) {
    items.push({
      id: `match:${input.activeMatch.id}`,
      kind: 'active_match',
      title: `Match room with ${input.activeMatch.opponentName}`,
      detail: `${input.activeMatch.gameLabel} is ready to play.`,
      href: `/match/${input.activeMatch.id}`,
      action_label: 'Open room',
    });
  }

  if (input.checkIn) {
    items.push({
      id: `check-in:${input.checkIn.id}`,
      kind: 'check_in',
      title: `Check in for ${input.checkIn.title}`,
      detail: input.checkIn.scheduledLabel,
      href: `/t/${input.checkIn.slug}`,
      action_label: 'Check in',
      deadline_at: input.checkIn.scheduledAt,
    });
  }

  if (input.incomingChallenge) {
    items.push({
      id: `challenge:${input.incomingChallenge.id}`,
      kind: 'incoming_challenge',
      title: `${input.incomingChallenge.challengerName} invited you to play`,
      detail: input.incomingChallenge.gameLabel,
      href: `/challenges#challenge-${input.incomingChallenge.id}`,
      action_label: 'Answer',
      deadline_at: input.incomingChallenge.expiresAt,
    });
  }

  if (input.interruptedRegistration) {
    items.push({
      id: `payment:${input.interruptedRegistration.id}`,
      kind: 'payment',
      title: `Finish ${input.interruptedRegistration.title} registration`,
      detail:
        input.interruptedRegistration.paymentStatus === 'failed'
          ? 'Payment did not complete.'
          : 'Payment confirmation is still needed.',
      href: `/t/${input.interruptedRegistration.slug}`,
      action_label: 'Resume',
    });
  }

  if (input.resultResponse) {
    items.push({
      id: `result:${input.resultResponse.id}`,
      kind: 'result_review',
      title: input.resultResponse.disputed
        ? `Resolve the result with ${input.resultResponse.opponentName}`
        : `Confirm ${input.resultResponse.opponentName}'s result`,
      detail: input.resultResponse.gameLabel,
      href: `/match/${input.resultResponse.id}`,
      action_label: 'Review',
    });
  }

  if (input.teamInvitation) {
    items.push({
      id: `team-invitation:${input.teamInvitation.id}`,
      kind: 'team_invitation',
      title: `${input.teamInvitation.inviterName} invited you to ${input.teamInvitation.teamName}`,
      detail: 'Accept or decline the team invitation.',
      href: '/teams',
      action_label: 'Answer',
      deadline_at: input.teamInvitation.expiresAt,
    });
  }

  if (input.waitingForOpponent) {
    items.push({
      id: `waiting-result:${input.waitingForOpponent.id}`,
      kind: 'waiting_for_opponent',
      title: `Waiting for ${input.waitingForOpponent.opponentName}`,
      detail: `Your ${input.waitingForOpponent.gameLabel} result was submitted.`,
      href: `/match/${input.waitingForOpponent.id}`,
      action_label: 'View match',
    });
  }

  if (items.length < 4 && input.upcomingTournament) {
    items.push({
      id: `tournament:${input.upcomingTournament.id}`,
      kind: 'upcoming_tournament',
      title: input.upcomingTournament.title,
      detail: `${input.upcomingTournament.gameLabel} · ${input.upcomingTournament.scheduledLabel}`,
      href: `/t/${input.upcomingTournament.slug}`,
      action_label: 'View',
      deadline_at: input.upcomingTournament.scheduledAt,
    });
  }

  return items.slice(0, 4);
}
