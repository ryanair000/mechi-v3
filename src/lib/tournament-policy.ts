export const PAID_TOURNAMENT_APPROVAL_MESSAGE =
  'Paid or rewarded tournaments must be approved by Mechi before players can join or the tournament can start.';

export const FREE_TOURNAMENT_REWARD_MESSAGE =
  'Free tournaments cannot include a cash prize or reward.';

type TournamentMoneyPolicyInput = {
  entryFee?: number | null;
  prizePool?: number | null;
  prizePoolMode?: string | null;
  valuableRewardExists?: boolean | null;
  sponsorFundedRewardExists?: boolean | null;
  manualRiskFlagExists?: boolean | null;
};

type TournamentParticipationPolicyInput = TournamentMoneyPolicyInput & {
  approvalStatus?: string | null;
};

export function isPaidTournament(entryFee: number | null | undefined) {
  return Number(entryFee ?? 0) > 0;
}

export function getTournamentCreationApprovalStatus(
  input: number | null | undefined | TournamentMoneyPolicyInput
): 'approved' | 'pending' {
  const classification = getTournamentApprovalClassification(
    typeof input === 'number' || input == null ? { entryFee: input } : input
  );
  return classification.required ? 'pending' : 'approved';
}

export type TournamentApprovalReason =
  | 'paid_entry'
  | 'cash_prize'
  | 'valuable_reward'
  | 'sponsor_funded_reward'
  | 'manual_risk_flag';

export function getTournamentApprovalClassification(input: TournamentMoneyPolicyInput) {
  const reasons: TournamentApprovalReason[] = [];
  if (Number(input.entryFee ?? 0) > 0) reasons.push('paid_entry');
  if (Number(input.prizePool ?? 0) > 0 || input.prizePoolMode === 'specified') reasons.push('cash_prize');
  if (input.valuableRewardExists) reasons.push('valuable_reward');
  if (input.sponsorFundedRewardExists) reasons.push('sponsor_funded_reward');
  if (input.manualRiskFlagExists) reasons.push('manual_risk_flag');
  return { required: reasons.length > 0, reasons } as const;
}

export function getFreeTournamentConfigurationError(
  _input: TournamentMoneyPolicyInput
): string | null {
  void _input;
  // A KES 0-entry tournament may still offer a prize or valuable reward, but it is
  // a rewarded tournament and must pass Mechi approval. It must not be rejected as
  // an invalid "free tournament" or published through the no-reward fast path.
  return null;
}

export function getTournamentParticipationPolicyError(
  input: TournamentParticipationPolicyInput
): string | null {
  const explicitlyAwaitingApproval = Boolean(
    input.approvalStatus && input.approvalStatus !== 'approved'
  );
  if (
    explicitlyAwaitingApproval ||
    (getTournamentApprovalClassification(input).required && input.approvalStatus !== 'approved')
  ) {
    return PAID_TOURNAMENT_APPROVAL_MESSAGE;
  }
  return null;
}

export function isTournamentPubliclyAccessible(input: TournamentParticipationPolicyInput) {
  return getTournamentParticipationPolicyError(input) === null;
}
