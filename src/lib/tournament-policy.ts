export const PAID_TOURNAMENT_APPROVAL_MESSAGE =
  'Paid tournaments must be approved by Mechi before players can join or the tournament can start.';

export const FREE_TOURNAMENT_REWARD_MESSAGE =
  'Free tournaments cannot include a cash prize or reward.';

type TournamentMoneyPolicyInput = {
  entryFee?: number | null;
  prizePool?: number | null;
  prizePoolMode?: string | null;
};

type TournamentParticipationPolicyInput = TournamentMoneyPolicyInput & {
  approvalStatus?: string | null;
};

export function isPaidTournament(entryFee: number | null | undefined) {
  return Number(entryFee ?? 0) > 0;
}

export function getTournamentCreationApprovalStatus(
  entryFee: number | null | undefined
): 'approved' | 'pending' {
  return isPaidTournament(entryFee) ? 'pending' : 'approved';
}

export function getFreeTournamentConfigurationError(
  input: TournamentMoneyPolicyInput
): string | null {
  if (isPaidTournament(input.entryFee)) {
    return null;
  }

  if (input.prizePoolMode === 'specified' || Number(input.prizePool ?? 0) > 0) {
    return FREE_TOURNAMENT_REWARD_MESSAGE;
  }

  return null;
}

export function getTournamentParticipationPolicyError(
  input: TournamentParticipationPolicyInput
): string | null {
  if (isPaidTournament(input.entryFee) && input.approvalStatus !== 'approved') {
    return PAID_TOURNAMENT_APPROVAL_MESSAGE;
  }

  return getFreeTournamentConfigurationError(input);
}

export function isTournamentPubliclyAccessible(input: TournamentParticipationPolicyInput) {
  return getTournamentParticipationPolicyError(input) === null;
}
