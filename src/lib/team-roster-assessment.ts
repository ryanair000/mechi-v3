export type TeamRosterAssessmentInput = {
  user_id: string;
  username: string;
  roster_role: 'starter' | 'substitute';
  eligible: boolean;
  blocker?: string | null;
  selected: boolean;
};

export type TeamRosterAssessment = {
  ready: boolean;
  starter_count: number;
  substitute_count: number;
  required_starters: number;
  blockers: string[];
  summary: string;
};

export function assessTeamRoster(
  roster: TeamRosterAssessmentInput[],
  requiredStarters: number
): TeamRosterAssessment {
  const selected = roster.filter((player) => player.selected);
  const starterCount = selected.filter((player) => player.roster_role === 'starter').length;
  const substituteCount = selected.length - starterCount;
  const blockers: string[] = [];
  const duplicateIds = new Set<string>();
  const seenIds = new Set<string>();

  for (const player of selected) {
    if (seenIds.has(player.user_id)) duplicateIds.add(player.user_id);
    seenIds.add(player.user_id);
    if (!player.eligible) {
      blockers.push(`${player.username}: ${player.blocker ?? 'Game setup is incomplete.'}`);
    }
  }

  if (starterCount !== requiredStarters) {
    blockers.unshift(
      `Select exactly ${requiredStarters} starter${requiredStarters === 1 ? '' : 's'}; ${starterCount} selected.`
    );
  }
  if (substituteCount > 2) {
    blockers.unshift('Select no more than 2 substitutes.');
  }
  if (duplicateIds.size > 0) {
    blockers.unshift('A player can appear only once in the roster.');
  }

  return {
    ready: blockers.length === 0,
    starter_count: starterCount,
    substitute_count: substituteCount,
    required_starters: requiredStarters,
    blockers,
    summary:
      blockers.length === 0
        ? `${starterCount} starters and ${substituteCount} substitute${substituteCount === 1 ? '' : 's'} are ready.`
        : blockers[0],
  };
}
