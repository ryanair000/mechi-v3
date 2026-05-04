import type { OnlineTournamentGameKey, OnlineTournamentRegistrationSummary } from '../types';

export type TournamentGameConfig = {
  game: OnlineTournamentGameKey;
  label: string;
  shortLabel: string;
  dateLabel: string;
  timeLabel: string;
  matchStartsAt: string;
  registrationClosesAt: string;
  registrationClosed?: boolean;
  slots: number;
  format: string;
  matchCount: string;
  scoring: string;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  whatsappGroupUrl: string;
};

export const TOURNAMENT_TITLE = 'PlayMechi Launch';
export const TOURNAMENT_PUBLIC_URL = 'https://mechi.club/playmechi';
export const TOURNAMENT_REGISTER_URL = 'https://mechi.club/playmechi/register';
export const TOURNAMENT_DATES = '8-10 May 2026';
export const TOURNAMENT_TIME = '8:00 PM EAT';
export const TOURNAMENT_TOTAL_SLOTS = 216;
export const TOURNAMENT_PRIZE_POOL = 'KSh 6,000';
export const PLAYMECHI_INSTAGRAM_URL = 'https://www.instagram.com/playmechi/';
export const PLAYMECHI_YOUTUBE_URL = 'https://www.youtube.com/@playmechi';
export const PLAYMECHI_SUPPORT_LABEL = '+254 733 638 841';
export const PLAYMECHI_SUPPORT_URL =
  'https://wa.me/254733638841?text=Hi%20PlayMechi%2C%20I%20need%20help%20with%20the%20tournament.';

export const TOURNAMENT_GAMES: TournamentGameConfig[] = [
  {
    game: 'pubgm',
    label: 'PUBG Mobile',
    shortLabel: 'PUBG',
    dateLabel: 'Friday 8 May 2026',
    timeLabel: TOURNAMENT_TIME,
    matchStartsAt: '2026-05-08T20:00:00+03:00',
    registrationClosesAt: '2026-05-08T19:30:00+03:00',
    slots: 100,
    format: 'Individual Battle Royale room',
    matchCount: '3 matches',
    scoring: '1 kill = 1 point. No placement points.',
    firstPrize: 'KSh 1,500',
    secondPrize: 'KSh 1,000',
    thirdPrize: '60 UC',
    whatsappGroupUrl: 'https://chat.whatsapp.com/Cf9R0k2dPeP683wpNnib1N',
  },
  {
    game: 'codm',
    label: 'Call of Duty Mobile',
    shortLabel: 'CODM',
    dateLabel: 'Saturday 9 May 2026',
    timeLabel: TOURNAMENT_TIME,
    matchStartsAt: '2026-05-09T20:00:00+03:00',
    registrationClosesAt: '2026-05-09T19:30:00+03:00',
    slots: 100,
    format: 'Individual Battle Royale room',
    matchCount: '3 matches',
    scoring: '1 kill = 1 point. No placement points.',
    firstPrize: 'KSh 1,200',
    secondPrize: 'KSh 800',
    thirdPrize: '80 CP',
    whatsappGroupUrl: 'https://chat.whatsapp.com/JmizQcphVYR2LiRYcrHEaC',
  },
  {
    game: 'efootball',
    label: 'eFootball',
    shortLabel: 'eFootball',
    dateLabel: 'Sunday 10 May 2026',
    timeLabel: TOURNAMENT_TIME,
    matchStartsAt: '2026-05-10T20:00:00+03:00',
    registrationClosesAt: '2026-05-10T19:30:00+03:00',
    registrationClosed: true,
    slots: 16,
    format: '1v1 knockout bracket',
    matchCount: 'Round of 16 to final',
    scoring: 'One leg per fixture. Draws go to extra time, penalties, or golden goal replay.',
    firstPrize: 'KSh 1,000',
    secondPrize: 'KSh 500',
    thirdPrize: '315 Coins',
    whatsappGroupUrl: 'https://chat.whatsapp.com/Cf9R0k2dPeP683wpNnib1N',
  },
];

export const TOURNAMENT_GAME_BY_KEY = TOURNAMENT_GAMES.reduce(
  (games, game) => {
    games[game.game] = game;
    return games;
  },
  {} as Record<OnlineTournamentGameKey, TournamentGameConfig>
);

export const TOURNAMENT_RULES = [
  'Registration is free and fully online.',
  'Use the exact in-game username you register with.',
  'Join on time. Late players may be disqualified.',
  'Cheating, teaming, scripts, emulator abuse, and unfair tools are banned.',
  'Submit screenshots/results immediately after matches.',
  'Follow PlayMechi on Instagram and subscribe on YouTube to qualify for rewards.',
  'Admin decisions are final after review and dispute handling.',
];

export function isTournamentGame(value: unknown): value is OnlineTournamentGameKey {
  return value === 'pubgm' || value === 'codm' || value === 'efootball';
}

export function getTournamentGame(value: OnlineTournamentGameKey) {
  return TOURNAMENT_GAME_BY_KEY[value];
}

export function getFallbackTournamentSummary(): OnlineTournamentRegistrationSummary {
  return {
    games: TOURNAMENT_GAMES.reduce(
      (counts, game) => {
        const closed = Boolean(game.registrationClosed);
        counts[game.game] = {
          registered: 0,
          slots: game.slots,
          spotsLeft: closed ? 0 : game.slots,
          full: closed,
        };
        return counts;
      },
      {} as OnlineTournamentRegistrationSummary['games']
    ),
    registrations: [],
  };
}

export function getTournamentTotals(summary: OnlineTournamentRegistrationSummary) {
  return TOURNAMENT_GAMES.reduce(
    (totals, game) => {
      const gameSummary = summary.games[game.game];
      const slots = gameSummary?.slots ?? game.slots;
      const registered = gameSummary?.registered ?? 0;
      const spotsLeft =
        gameSummary?.spotsLeft ?? (game.registrationClosed ? 0 : Math.max(0, slots - registered));

      return {
        registered: totals.registered + registered,
        slots: totals.slots + slots,
        spotsLeft: totals.spotsLeft + Math.max(0, spotsLeft),
      };
    },
    { registered: 0, slots: 0, spotsLeft: 0 }
  );
}

export function formatStatus(value: string | null | undefined) {
  return String(value ?? 'pending').replace(/_/g, ' ');
}

export function isBattleRoyaleTournamentGame(game: OnlineTournamentGameKey) {
  return game === 'pubgm' || game === 'codm';
}

export function getPrizeLabels(game: OnlineTournamentGameKey) {
  const config = getTournamentGame(game);
  return [config.firstPrize, config.secondPrize, config.thirdPrize];
}

export function getGameFromParam(value: unknown, fallback: OnlineTournamentGameKey = 'pubgm') {
  const raw = Array.isArray(value) ? value[0] : value;
  return isTournamentGame(raw) ? raw : fallback;
}
