export type TournamentSize = 4 | 8 | 16;

export interface BracketSlot {
  round: number;
  slot: number;
  p1Seed: number | null;
  p2Seed: number | null;
}

export interface Bracket {
  rounds: number;
  size: TournamentSize;
  slots: BracketSlot[];
}

export function isTournamentSize(value: number): value is TournamentSize {
  return value === 4 || value === 8 || value === 16;
}

export function generateBracket(size: TournamentSize): Bracket {
  const rounds = Math.log2(size);
  const firstRoundMatches = size / 2;
  const seedOrder = buildSeedOrder(size);
  const slots: BracketSlot[] = [];

  for (let index = 0; index < firstRoundMatches; index++) {
    slots.push({
      round: 1,
      slot: index,
      p1Seed: seedOrder[index * 2] ?? null,
      p2Seed: seedOrder[index * 2 + 1] ?? null,
    });
  }

  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = size / Math.pow(2, round);
    for (let slot = 0; slot < matchesInRound; slot++) {
      slots.push({ round, slot, p1Seed: null, p2Seed: null });
    }
  }

  return { rounds, size, slots };
}

export function getNextBracketPosition(round: number, slot: number) {
  return {
    round: round + 1,
    slot: Math.floor(slot / 2),
    side: slot % 2 === 0 ? 'player1_id' : 'player2_id',
  } as const;
}

export function getRoundLabel(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'Final';
  if (round === totalRounds - 1) return 'Semifinal';
  if (round === totalRounds - 2) return 'Quarterfinal';
  return `Round ${round}`;
}

function buildSeedOrder(size: number): number[] {
  if (size === 2) return [1, 2];

  const left = buildSeedOrder(size / 2);
  const right = left.map((seed) => size + 1 - seed).reverse();
  const result: number[] = [];

  for (let index = 0; index < left.length; index++) {
    result.push(left[index], right[index]);
  }

  return result;
}
