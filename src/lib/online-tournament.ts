import type { GameKey } from '@/types';

export type OnlineTournamentGameKey = Extract<GameKey, 'pubgm' | 'codm' | 'efootball'>;

export type OnlineTournamentEligibilityStatus =
  | 'pending'
  | 'verified'
  | 'ineligible'
  | 'disqualified';

export type OnlineTournamentCheckInStatus = 'registered' | 'checked_in' | 'no_show';

export type OnlineTournamentGameConfig = {
  game: OnlineTournamentGameKey;
  label: string;
  shortLabel: string;
  dateLabel: string;
  timeLabel: string;
  matchStartsAt: string;
  registrationClosesAt: string;
  slots: number;
  format: string;
  matchCount: string;
  scoring: string;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
};

export const ONLINE_TOURNAMENT_SLUG = 'mechi-club-online-gaming-tournament-2026-05';
export const ONLINE_TOURNAMENT_TITLE = 'Mechi.club Online Gaming Tournament';
export const ONLINE_TOURNAMENT_PUBLIC_PATH = '/playmechi';
export const ONLINE_TOURNAMENT_REGISTRATION_PATH = `${ONLINE_TOURNAMENT_PUBLIC_PATH}/register`;
export const ONLINE_TOURNAMENT_EVENT_DATES = '8-10 May 2026';
export const ONLINE_TOURNAMENT_STREAM_CHANNEL = 'PlayMechi';
export const ONLINE_TOURNAMENT_STREAMER = 'Kabaka Mwangi';
export const ONLINE_TOURNAMENT_INSTAGRAM = 'PlayMechi';
export const ONLINE_TOURNAMENT_YOUTUBE = 'PlayMechi';
export const ONLINE_TOURNAMENT_STREAM_DELAY_MINUTES = 5;
export const ONLINE_TOURNAMENT_DISPUTE_WINDOW_MINUTES = 20;
export const ONLINE_TOURNAMENT_PAYOUT_WINDOW_HOURS = 48;

export const ONLINE_TOURNAMENT_GAMES: OnlineTournamentGameConfig[] = [
  {
    game: 'pubgm',
    label: 'PUBG Mobile',
    shortLabel: 'PUBG',
    dateLabel: 'Friday 8 May 2026',
    timeLabel: '8:00 PM EAT',
    matchStartsAt: '2026-05-08T20:00:00+03:00',
    registrationClosesAt: '2026-05-08T19:30:00+03:00',
    slots: 100,
    format: 'Individual Battle Royale tournament room',
    matchCount: '3 matches',
    scoring: '1 kill = 1 point. Placement has no points.',
    firstPrize: 'KSh 1,500',
    secondPrize: 'KSh 1,000',
    thirdPrize: '60 UC',
  },
  {
    game: 'codm',
    label: 'Call of Duty Mobile',
    shortLabel: 'CODM',
    dateLabel: 'Saturday 9 May 2026',
    timeLabel: '8:00 PM EAT',
    matchStartsAt: '2026-05-09T20:00:00+03:00',
    registrationClosesAt: '2026-05-09T19:30:00+03:00',
    slots: 100,
    format: 'Individual Battle Royale tournament room',
    matchCount: '3 matches',
    scoring: '1 kill = 1 point. Placement has no points.',
    firstPrize: 'KSh 1,200',
    secondPrize: 'KSh 800',
    thirdPrize: '80 CP',
  },
  {
    game: 'efootball',
    label: 'eFootball',
    shortLabel: 'eFootball',
    dateLabel: 'Sunday 10 May 2026',
    timeLabel: '8:00 PM EAT',
    matchStartsAt: '2026-05-10T20:00:00+03:00',
    registrationClosesAt: '2026-05-10T19:30:00+03:00',
    slots: 16,
    format: '1v1 knockout bracket with bronze match',
    matchCount: 'Round of 16 to final',
    scoring: 'One leg per fixture. Draws go to extra time, penalties, or golden goal replay.',
    firstPrize: 'KSh 1,000',
    secondPrize: 'KSh 500',
    thirdPrize: '315 Coins',
  },
];

export const ONLINE_TOURNAMENT_TOTAL_SLOTS = ONLINE_TOURNAMENT_GAMES.reduce(
  (total, game) => total + game.slots,
  0
);

export const ONLINE_TOURNAMENT_GAME_BY_KEY = ONLINE_TOURNAMENT_GAMES.reduce(
  (games, game) => {
    games[game.game] = game;
    return games;
  },
  {} as Record<OnlineTournamentGameKey, OnlineTournamentGameConfig>
);

export const ONLINE_TOURNAMENT_ELIGIBILITY_STATUSES: OnlineTournamentEligibilityStatus[] = [
  'pending',
  'verified',
  'ineligible',
  'disqualified',
];

export const ONLINE_TOURNAMENT_CHECK_IN_STATUSES: OnlineTournamentCheckInStatus[] = [
  'registered',
  'checked_in',
  'no_show',
];

export function isOnlineTournamentGame(value: unknown): value is OnlineTournamentGameKey {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(ONLINE_TOURNAMENT_GAME_BY_KEY, value)
  );
}

export function normalizeSocialHandle(value: unknown): string {
  return String(value ?? '').trim().replace(/^@+/, '').slice(0, 80);
}

export function getOnlineTournamentWindowState(
  game: OnlineTournamentGameConfig,
  now = new Date()
) {
  const closesAt = new Date(game.registrationClosesAt);
  const startsAt = new Date(game.matchStartsAt);

  return {
    isRegistrationOpen: now.getTime() < closesAt.getTime(),
    closesAt,
    startsAt,
  };
}

export function formatEatDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}
