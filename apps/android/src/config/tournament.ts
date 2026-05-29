import type { OnlineTournamentGameKey, OnlineTournamentRegistrationSummary } from '../types';

type TournamentDeskRules = {
  heading: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
};

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
  checkInCap: number;
  entryFeeKes: number;
  entryFeeLabel: string;
  format: string;
  matchCount: string;
  scoring: string;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  whatsappGroupUrl: string;
  deskRules?: TournamentDeskRules;
};

const DEVICE_SERIAL_LAST6_REGEX = /^[A-Z0-9]{6}$/;

export const TOURNAMENT_TITLE = 'PlayMechi Weekend Cup Season 1';
export const TOURNAMENT_PUBLIC_URL = 'https://mechi.club/weekendcup';
export const TOURNAMENT_REGISTER_URL = 'https://mechi.club/weekendcup/register';
export const TOURNAMENT_DATES = '29-31 May 2026';
export const TOURNAMENT_TIME = '8:00 PM EAT';
export const TOURNAMENT_TOTAL_SLOTS = 272;
export const TOURNAMENT_TOTAL_CHECK_IN_CAP = 272;
export const TOURNAMENT_PRIZE_POOL = 'Prize pool up to KSh 10,500';
export const TOURNAMENT_ACTIVE_PAYMENT_TIER = 'regular';
export const TOURNAMENT_ENTRY_FROM_LABEL = 'Entry from KSh 75';
export const TOURNAMENT_REGULAR_PRICING_LABEL = 'Regular pricing is live';
export const TOURNAMENT_MOBILE_ENTRY_FEE_KES = 75;
export const TOURNAMENT_EFOOTBALL_ENTRY_FEE_KES = 125;
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
    dateLabel: 'Friday 29 May 2026',
    timeLabel: TOURNAMENT_TIME,
    matchStartsAt: '2026-05-29T20:00:00+03:00',
    registrationClosesAt: '2026-05-29T19:00:00+03:00',
    slots: 80,
    checkInCap: 80,
    entryFeeKes: TOURNAMENT_MOBILE_ENTRY_FEE_KES,
    entryFeeLabel: 'Regular KSh 75',
    format: 'Solo battle royale room',
    matchCount: '3 matches',
    scoring: '1 kill = 1 point. Frag smart, stay alive.',
    firstPrize: 'KSh 1,500',
    secondPrize: 'KSh 1,000',
    thirdPrize: 'KSh 500',
    whatsappGroupUrl: 'https://chat.whatsapp.com/HDZwDyft00kIVHb6vYVbJv',
  },
  {
    game: 'codm',
    label: 'Call of Duty Mobile',
    shortLabel: 'CODM',
    dateLabel: 'Saturday 30 May 2026',
    timeLabel: TOURNAMENT_TIME,
    matchStartsAt: '2026-05-30T20:00:00+03:00',
    registrationClosesAt: '2026-05-30T19:00:00+03:00',
    slots: 80,
    checkInCap: 80,
    entryFeeKes: TOURNAMENT_MOBILE_ENTRY_FEE_KES,
    entryFeeLabel: 'Regular KSh 75',
    format: 'Solo battle royale room',
    matchCount: '3 matches',
    scoring: '1 kill = 3 points. Placement matters too.',
    firstPrize: 'KSh 1,500',
    secondPrize: 'KSh 1,000',
    thirdPrize: 'KSh 500',
    whatsappGroupUrl: 'https://chat.whatsapp.com/JmizQcphVYR2LiRYcrHEaC',
    deskRules: {
      heading: 'CODM rules',
      sections: [
        {
          title: 'Loadout limits',
          items: [
            'Banned guns: none.',
            'Banned attachments: all thermite and concussion mags.',
            'Banned classes: Igniter, Quick Strike, Trap Master, Shockwave, Desperado, Spotter, Clown, and Ravager Launcher.',
            'Banned vehicles: tanks, Jackal, and hoverbike.',
            'Banned items: SMRS, Thumper, and all ballistic items.',
          ],
        },
        {
          title: 'Placement points',
          items: [
            '#1 = 20 points',
            '#2 = 15 points',
            '#3 = 10 points',
            '#4 = 5 points',
            '#5-25 = 3 points',
            '1 kill = 3 points',
          ],
        },
        {
          title: 'Penalties',
          items: [
            'Rule break: kill points are removed, even if placement is valid.',
            'Repeated rule break: 4-week season ban.',
          ],
        },
      ],
    },
  },
  {
    game: 'efootball',
    label: 'eFootball',
    shortLabel: 'eFootball',
    dateLabel: 'Sunday 31 May 2026',
    timeLabel: '7:30 PM EAT',
    matchStartsAt: '2026-05-31T19:30:00+03:00',
    registrationClosesAt: '2026-05-31T19:00:00+03:00',
    slots: 32,
    checkInCap: 32,
    entryFeeKes: TOURNAMENT_EFOOTBALL_ENTRY_FEE_KES,
    entryFeeLabel: 'Regular KSh 125',
    format: '1v1 knockout bracket with bronze match',
    matchCount: 'Round of 32 to final',
    scoring: 'Single-leg bracket from Round of 32. If level, settle it in extra time or penalties.',
    firstPrize: 'KSh 1,000',
    secondPrize: 'KSh 500',
    thirdPrize: '',
    whatsappGroupUrl: 'https://chat.whatsapp.com/Cf9R0k2dPeP683wpNnib1N',
  },
  {
    game: 'freefire',
    label: 'Free Fire',
    shortLabel: 'Free Fire',
    dateLabel: 'Sunday 31 May 2026',
    timeLabel: TOURNAMENT_TIME,
    matchStartsAt: '2026-05-31T20:00:00+03:00',
    registrationClosesAt: '2026-05-31T19:00:00+03:00',
    slots: 80,
    checkInCap: 80,
    entryFeeKes: TOURNAMENT_MOBILE_ENTRY_FEE_KES,
    entryFeeLabel: 'Regular KSh 75',
    format: 'Solo battle royale room',
    matchCount: '3 matches',
    scoring: '1 kill = 1 point. Frag smart, stay alive.',
    firstPrize: 'KSh 1,500',
    secondPrize: 'KSh 1,000',
    thirdPrize: 'KSh 500',
    whatsappGroupUrl: PLAYMECHI_SUPPORT_URL,
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
  'Register and confirm regular-price payment on mechi.club.',
  'Use the exact in-game name you registered with.',
  'Join on time. Late entry can be disqualified.',
  'No cheating, teaming, scripts, emulator abuse, or unfair tools.',
  'Submit clear proof right after each match.',
  'Follow Instagram and subscribe on YouTube to stay reward-eligible.',
  'Admin decisions are final after review and dispute checks.',
];

export function isTournamentGame(value: unknown): value is OnlineTournamentGameKey {
  return value === 'pubgm' || value === 'codm' || value === 'efootball' || value === 'freefire';
}

export function getTournamentGame(value: OnlineTournamentGameKey) {
  return TOURNAMENT_GAME_BY_KEY[value];
}

export function normalizeTournamentDeviceSerialLast6(value: unknown) {
  return String(value ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(-6);
}

export function isValidTournamentDeviceSerialLast6(value: unknown) {
  return DEVICE_SERIAL_LAST6_REGEX.test(normalizeTournamentDeviceSerialLast6(value));
}

export function requiresTournamentDeviceSerialLast6(game: OnlineTournamentGameKey) {
  return game === 'codm';
}

export function getTournamentWindowState(game: TournamentGameConfig, now = new Date()) {
  const closesAt = new Date(game.registrationClosesAt);
  const startsAt = new Date(game.matchStartsAt);

  return {
    isRegistrationOpen: !Boolean(game.registrationClosed) && now.getTime() < closesAt.getTime(),
    closesAt,
    startsAt,
  };
}

export function getTournamentDisplayStatus(now = new Date()): 'open' | 'active' | 'completed' {
  if (TOURNAMENT_GAMES.some((game) => getTournamentWindowState(game, now).isRegistrationOpen)) {
    return 'open';
  }

  const latestMatchWindowEnd = Math.max(
    ...TOURNAMENT_GAMES.map((game) => new Date(game.matchStartsAt).getTime() + 6 * 60 * 60 * 1000)
  );

  return now.getTime() <= latestMatchWindowEnd ? 'active' : 'completed';
}

export function formatEatDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;

  try {
    return new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Nairobi',
    }).format(date);
  } catch {
    return typeof value === 'string' ? value : date.toISOString();
  }
}

export function formatTournamentLobby(registration: {
  game: OnlineTournamentGameKey;
  tournament_lobby_number?: number | null;
  tournament_lobby_slot?: number | null;
}) {
  if (!registration.tournament_lobby_number || !registration.tournament_lobby_slot) {
    return 'Not assigned';
  }

  return `${TOURNAMENT_GAME_BY_KEY[registration.game].shortLabel} Lobby ${registration.tournament_lobby_number} | Slot ${registration.tournament_lobby_slot}`;
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
          checkedIn: 0,
          checkInCap: game.checkInCap,
          checkInSpotsLeft: game.checkInCap,
          checkInFull: false,
        };
        return counts;
      },
      {} as OnlineTournamentRegistrationSummary['games']
    ),
    registrations: [],
  };
}

export function getTournamentTotals(summary: OnlineTournamentRegistrationSummary) {
  const totals = TOURNAMENT_GAMES.reduce(
    (totals, game) => {
      const gameSummary = summary.games[game.game];
      const slots = gameSummary?.slots ?? game.slots;
      const registered = gameSummary?.registered ?? 0;
      const confirmed = gameSummary?.confirmed ?? 0;
      const pendingPayment = gameSummary?.pendingPayment ?? 0;
      const checkedIn = gameSummary?.checkedIn ?? 0;
      const spotsLeft =
        gameSummary?.spotsLeft ?? (game.registrationClosed ? 0 : Math.max(0, slots - registered));
      const checkInCap = gameSummary?.checkInCap ?? game.checkInCap;
      const checkInSpotsLeft =
        gameSummary?.checkInSpotsLeft ?? Math.max(0, checkInCap - checkedIn);

      return {
        registered: totals.registered + registered,
        confirmed: totals.confirmed + confirmed,
        pendingPayment: totals.pendingPayment + pendingPayment,
        slots: totals.slots + slots,
        spotsLeft: totals.spotsLeft + Math.max(0, spotsLeft),
        checkedIn: totals.checkedIn + checkedIn,
        checkInCap: totals.checkInCap + checkInCap,
        checkInSpotsLeft: totals.checkInSpotsLeft + Math.max(0, checkInSpotsLeft),
        full: false,
        checkInFull: false,
      };
    },
    {
      registered: 0,
      confirmed: 0,
      pendingPayment: 0,
      slots: 0,
      spotsLeft: 0,
      checkedIn: 0,
      checkInCap: 0,
      checkInSpotsLeft: 0,
      full: false,
      checkInFull: false,
    }
  );

  totals.full = totals.spotsLeft <= 0;
  totals.checkInFull = totals.checkInSpotsLeft <= 0;
  return totals;
}

export function formatStatus(value: string | null | undefined) {
  return String(value ?? 'pending').replace(/_/g, ' ');
}

export function isBattleRoyaleTournamentGame(game: OnlineTournamentGameKey) {
  return game === 'pubgm' || game === 'codm' || game === 'freefire';
}

export function getPrizeLabels(game: OnlineTournamentGameKey) {
  const config = getTournamentGame(game);
  return [config.firstPrize, config.secondPrize, config.thirdPrize];
}

export function getGameFromParam(value: unknown, fallback: OnlineTournamentGameKey = 'pubgm') {
  const raw = Array.isArray(value) ? value[0] : value;
  return isTournamentGame(raw) ? raw : fallback;
}
