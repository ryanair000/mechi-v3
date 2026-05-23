import type { OnlineTournamentGameKey } from '@/lib/online-tournament';

export type WeekendCupLobbyStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type WeekendCupBracketStatus = 'pending' | 'scheduled' | 'active' | 'completed' | 'walkover' | 'cancelled';
export type WeekendCupPrizeStatus = 'pending' | 'processing' | 'paid' | 'failed';

export type WeekendCupLobby = {
  id: string;
  event_slug: string;
  game: OnlineTournamentGameKey;
  lobby_number: number;
  room_id: string | null;
  room_password: string | null;
  match_number: number;
  status: WeekendCupLobbyStatus;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WeekendCupScore = {
  id: string;
  event_slug: string;
  registration_id: string;
  lobby_id: string | null;
  match_number: number;
  kills: number;
  placement: number | null;
  placement_points: number;
  total_points: number;
  screenshot_url: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WeekendCupResult = {
  id: string;
  event_slug: string;
  game: OnlineTournamentGameKey;
  registration_id: string;
  final_rank: number;
  total_kills: number;
  total_points: number;
  prize_type: 'cash' | 'credit' | 'none' | null;
  prize_value_kes: number;
  prize_status: WeekendCupPrizeStatus;
  paid_at: string | null;
  paid_by: string | null;
  payout_reference: string | null;
  created_at: string;
};

export type WeekendCupBracketMatch = {
  id: string;
  event_slug: string;
  game: string;
  round: number;
  match_number: number;
  player1_registration_id: string | null;
  player2_registration_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_registration_id: string | null;
  loser_registration_id: string | null;
  is_bronze_match: boolean;
  status: WeekendCupBracketStatus;
  scheduled_at: string | null;
  completed_at: string | null;
  recording_url: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
};

export const WEEKEND_CUP_BRACKET_ROUNDS = {
  R32: 1,
  R16: 2,
  QF: 3,
  SF: 4,
  BRONZE: 5,
  FINAL: 6,
} as const;

export const WEEKEND_CUP_ROUND_LABELS: Record<number, string> = {
  1: 'Round of 32',
  2: 'Round of 16',
  3: 'Quarter-finals',
  4: 'Semi-finals',
  5: 'Bronze Match',
  6: 'Final',
};

export type WeekendCupBRGameKey = 'pubgm' | 'codm' | 'freefire' | 'efootball';

export const WEEKEND_CUP_BR_SCORING: Record<WeekendCupBRGameKey, {
  killPoints: number;
  placementPoints: Record<number, number>;
  matchCount: number;
}> = {
  pubgm: {
    killPoints: 1,
    placementPoints: {
      1: 15, 2: 12, 3: 10, 4: 8, 5: 6, 6: 4, 7: 2, 8: 1,
    },
    matchCount: 3,
  },
  codm: {
    killPoints: 3,
    placementPoints: {
      1: 20, 2: 15, 3: 12, 4: 10, 5: 8, 6: 6, 7: 4, 8: 2,
    },
    matchCount: 3,
  },
  freefire: {
    killPoints: 1,
    placementPoints: {
      1: 12, 2: 9, 3: 7, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1,
    },
    matchCount: 3,
  },
  efootball: {
    killPoints: 0,
    placementPoints: {},
    matchCount: 0,
  },
};

export function calculateBRMatchPoints(
  game: WeekendCupBRGameKey | string,
  kills: number,
  placement: number | null
): { killPoints: number; placementPoints: number; totalPoints: number } {
  const scoring = WEEKEND_CUP_BR_SCORING[game as WeekendCupBRGameKey];
  if (!scoring || game === 'efootball') {
    return { killPoints: 0, placementPoints: 0, totalPoints: 0 };
  }

  const killPoints = kills * scoring.killPoints;
  const placementPoints = placement ? (scoring.placementPoints[placement] ?? 0) : 0;
  return {
    killPoints,
    placementPoints,
    totalPoints: killPoints + placementPoints,
  };
}

export function generateBracketMatches(playerCount: number): Array<{
  round: number;
  match_number: number;
  is_bronze_match: boolean;
}> {
  const matches: Array<{ round: number; match_number: number; is_bronze_match: boolean }> = [];

  if (playerCount <= 0) return matches;

  const effectiveCount = Math.min(playerCount, 32);

  if (effectiveCount <= 2) {
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.FINAL, match_number: 1, is_bronze_match: false });
    return matches;
  }

  if (effectiveCount <= 4) {
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.SF, match_number: 1, is_bronze_match: false });
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.SF, match_number: 2, is_bronze_match: false });
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.BRONZE, match_number: 1, is_bronze_match: true });
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.FINAL, match_number: 1, is_bronze_match: false });
    return matches;
  }

  if (effectiveCount <= 8) {
    for (let i = 1; i <= 4; i++) {
      matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.QF, match_number: i, is_bronze_match: false });
    }
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.SF, match_number: 1, is_bronze_match: false });
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.SF, match_number: 2, is_bronze_match: false });
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.BRONZE, match_number: 1, is_bronze_match: true });
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.FINAL, match_number: 1, is_bronze_match: false });
    return matches;
  }

  if (effectiveCount <= 16) {
    for (let i = 1; i <= 8; i++) {
      matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.R16, match_number: i, is_bronze_match: false });
    }
    for (let i = 1; i <= 4; i++) {
      matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.QF, match_number: i, is_bronze_match: false });
    }
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.SF, match_number: 1, is_bronze_match: false });
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.SF, match_number: 2, is_bronze_match: false });
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.BRONZE, match_number: 1, is_bronze_match: true });
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.FINAL, match_number: 1, is_bronze_match: false });
    return matches;
  }

  for (let i = 1; i <= 16; i++) {
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.R32, match_number: i, is_bronze_match: false });
  }
  for (let i = 1; i <= 8; i++) {
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.R16, match_number: i, is_bronze_match: false });
  }
  for (let i = 1; i <= 4; i++) {
    matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.QF, match_number: i, is_bronze_match: false });
  }
  matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.SF, match_number: 1, is_bronze_match: false });
  matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.SF, match_number: 2, is_bronze_match: false });
  matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.BRONZE, match_number: 1, is_bronze_match: true });
  matches.push({ round: WEEKEND_CUP_BRACKET_ROUNDS.FINAL, match_number: 1, is_bronze_match: false });

  return matches;
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getNextRoundMatchNumber(currentRound: number, currentMatchNumber: number): number {
  return Math.ceil(currentMatchNumber / 2);
}

export function isPlayer1InNextRound(currentMatchNumber: number): boolean {
  return currentMatchNumber % 2 === 1;
}
