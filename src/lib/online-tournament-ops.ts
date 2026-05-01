import {
  ONLINE_TOURNAMENT_GAME_BY_KEY,
  type OnlineTournamentEligibilityStatus,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';

export type OnlineTournamentBattleRoyaleGameKey = Extract<
  OnlineTournamentGameKey,
  'pubgm' | 'codm'
>;

export type OnlineTournamentRoomStatus =
  | 'draft'
  | 'released'
  | 'locked'
  | 'completed'
  | 'cancelled';

export type OnlineTournamentResultStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'disputed';

export type OnlineTournamentFixtureStatus =
  | 'pending'
  | 'ready'
  | 'completed'
  | 'disputed'
  | 'bye';

export type OnlineTournamentDisputeStatus = 'open' | 'resolved' | 'dismissed';

export type OnlineTournamentPayoutStatus =
  | 'pending'
  | 'approved'
  | 'paid'
  | 'failed'
  | 'ineligible';

export type OnlineTournamentRegistrationOpsRow = {
  id: string;
  event_slug: string;
  user_id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  instagram_username: string | null;
  youtube_name: string | null;
  followed_instagram: boolean;
  subscribed_youtube: boolean;
  available_at_8pm: boolean;
  accepted_rules: boolean;
  reward_eligible: boolean;
  eligibility_status: OnlineTournamentEligibilityStatus;
  check_in_status: 'registered' | 'checked_in' | 'no_show';
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    phone?: string | null;
    email?: string | null;
  } | null;
};

export type OnlineTournamentRoom = {
  id: string;
  event_slug: string;
  game: OnlineTournamentBattleRoyaleGameKey;
  match_number: number;
  title: string | null;
  map_name: string | null;
  room_id: string | null;
  room_password: string | null;
  instructions: string | null;
  starts_at: string | null;
  release_at: string | null;
  status: OnlineTournamentRoomStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OnlineTournamentFixture = {
  id: string;
  event_slug: string;
  game: 'efootball';
  round: OnlineTournamentFixtureRound;
  round_label: string;
  slot: number;
  player1_registration_id: string | null;
  player2_registration_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_registration_id: string | null;
  status: OnlineTournamentFixtureStatus;
  screenshot_url: string | null;
  screenshot_public_id: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type OnlineTournamentResultSubmission = {
  id: string;
  event_slug: string;
  game: OnlineTournamentGameKey;
  registration_id: string | null;
  user_id: string | null;
  room_id: string | null;
  fixture_id: string | null;
  match_number: number | null;
  kills: number | null;
  placement: number | null;
  player1_score: number | null;
  player2_score: number | null;
  reported_winner_registration_id: string | null;
  screenshot_url: string | null;
  screenshot_public_id: string | null;
  status: OnlineTournamentResultStatus;
  admin_note: string | null;
  submitted_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  registration?: Pick<
    OnlineTournamentRegistrationOpsRow,
    'id' | 'in_game_username' | 'game' | 'user_id'
  > | null;
};

export type OnlineTournamentDispute = {
  id: string;
  event_slug: string;
  game: OnlineTournamentGameKey;
  result_submission_id: string | null;
  fixture_id: string | null;
  opened_by: string | null;
  reason: string | null;
  status: OnlineTournamentDisputeStatus;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OnlineTournamentPayout = {
  id: string;
  event_slug: string;
  game: OnlineTournamentGameKey;
  placement: number;
  registration_id: string | null;
  prize_label: string;
  prize_value_kes: number | null;
  reward_type: 'cash' | 'uc' | 'cp' | 'coins';
  eligibility_status: 'pending' | 'eligible' | 'ineligible';
  payout_status: OnlineTournamentPayoutStatus;
  payout_ref: string | null;
  admin_note: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OnlineTournamentFixtureRound =
  | 'round_of_16'
  | 'quarterfinal'
  | 'semifinal'
  | 'final'
  | 'bronze';

export type OnlineTournamentBattleRoyaleStanding = {
  rank: number;
  registration: OnlineTournamentRegistrationOpsRow;
  totalKills: number;
  matchKills: Record<1 | 2 | 3, number>;
  bestSingleMatchKills: number;
  finalMatchPlacement: number | null;
  verifiedSubmissionCount: number;
};

export const ONLINE_TOURNAMENT_BR_MATCH_NUMBERS = [1, 2, 3] as const;

export const ONLINE_TOURNAMENT_EFOOTBALL_ROUNDS: Array<{
  round: OnlineTournamentFixtureRound;
  label: string;
  slots: number;
}> = [
  { round: 'round_of_16', label: 'Round of 16', slots: 8 },
  { round: 'quarterfinal', label: 'Quarterfinal', slots: 4 },
  { round: 'semifinal', label: 'Semifinal', slots: 2 },
  { round: 'final', label: 'Final', slots: 1 },
  { round: 'bronze', label: 'Bronze Match', slots: 1 },
];

export function isBattleRoyaleTournamentGame(
  value: OnlineTournamentGameKey
): value is OnlineTournamentBattleRoyaleGameKey {
  return value === 'pubgm' || value === 'codm';
}

export function getOnlineTournamentArenaHref(game?: string | null) {
  const params = game ? `?game=${encodeURIComponent(game)}` : '';
  return `/playmechi/tournament${params}`;
}

export function getRegistrationDisplayName(
  registration: Pick<OnlineTournamentRegistrationOpsRow, 'in_game_username' | 'user'>
) {
  return registration.in_game_username || registration.user?.username || 'Player';
}

export function canRevealRoom(room: OnlineTournamentRoom, now = new Date()) {
  if (room.status === 'completed' || room.status === 'locked') {
    return true;
  }

  if (room.status !== 'released') {
    return false;
  }

  if (!room.release_at) {
    return true;
  }

  return new Date(room.release_at).getTime() <= now.getTime();
}

export function maskRoomForPlayer(room: OnlineTournamentRoom, now = new Date()) {
  const visible = canRevealRoom(room, now);

  return {
    ...room,
    room_id: visible ? room.room_id : null,
    room_password: visible ? room.room_password : null,
    credentials_released: visible,
  };
}

export function buildBattleRoyaleStandings(params: {
  game: OnlineTournamentBattleRoyaleGameKey;
  registrations: OnlineTournamentRegistrationOpsRow[];
  submissions: OnlineTournamentResultSubmission[];
}): OnlineTournamentBattleRoyaleStanding[] {
  const rows = params.registrations
    .filter(
      (registration) =>
        registration.game === params.game &&
        registration.eligibility_status !== 'disqualified'
    )
    .map((registration) => ({
      rank: 0,
      registration,
      totalKills: 0,
      matchKills: { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>,
      bestSingleMatchKills: 0,
      finalMatchPlacement: null as number | null,
      verifiedSubmissionCount: 0,
    }));

  const rowByRegistrationId = new Map(rows.map((row) => [row.registration.id, row]));
  const verifiedSubmissions = params.submissions
    .filter(
      (submission) =>
        submission.game === params.game &&
        submission.status === 'verified' &&
        submission.registration_id &&
        submission.match_number &&
        ONLINE_TOURNAMENT_BR_MATCH_NUMBERS.includes(
          submission.match_number as (typeof ONLINE_TOURNAMENT_BR_MATCH_NUMBERS)[number]
        )
    )
    .sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );

  for (const submission of verifiedSubmissions) {
    const registrationId = submission.registration_id;
    const matchNumber = submission.match_number as 1 | 2 | 3 | null;
    if (!registrationId || !matchNumber) continue;

    const row = rowByRegistrationId.get(registrationId);
    if (!row) continue;

    row.matchKills[matchNumber] = Number(submission.kills ?? 0);
    if (matchNumber === 3) {
      row.finalMatchPlacement = submission.placement ?? null;
    }
  }

  for (const row of rows) {
    row.totalKills =
      row.matchKills[1] + row.matchKills[2] + row.matchKills[3];
    row.bestSingleMatchKills = Math.max(
      row.matchKills[1],
      row.matchKills[2],
      row.matchKills[3]
    );
    row.verifiedSubmissionCount = ONLINE_TOURNAMENT_BR_MATCH_NUMBERS.filter(
      (matchNumber) => row.matchKills[matchNumber] > 0 || row.finalMatchPlacement !== null
    ).length;
  }

  return rows
    .sort((left, right) => {
      if (left.totalKills !== right.totalKills) {
        return right.totalKills - left.totalKills;
      }

      if (left.bestSingleMatchKills !== right.bestSingleMatchKills) {
        return right.bestSingleMatchKills - left.bestSingleMatchKills;
      }

      const leftFinalPlacement = left.finalMatchPlacement ?? Number.POSITIVE_INFINITY;
      const rightFinalPlacement = right.finalMatchPlacement ?? Number.POSITIVE_INFINITY;
      if (leftFinalPlacement !== rightFinalPlacement) {
        return leftFinalPlacement - rightFinalPlacement;
      }

      return (
        new Date(left.registration.created_at).getTime() -
        new Date(right.registration.created_at).getTime()
      );
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function getGamePrizeLabels(game: OnlineTournamentGameKey) {
  const config = ONLINE_TOURNAMENT_GAME_BY_KEY[game];
  return [config.firstPrize, config.secondPrize, config.thirdPrize];
}
