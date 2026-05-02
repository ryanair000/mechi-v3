import type { GameKey } from '@/types';
import { PLAYMECHI_WHATSAPP_GROUP_URL } from '@/lib/social-links';

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
  whatsappGroupUrl: string;
};

export const ONLINE_TOURNAMENT_SLUG = 'mechi-club-online-gaming-tournament-2026-05';
export const ONLINE_TOURNAMENT_TITLE = 'Playmechi Launch';
export const ONLINE_TOURNAMENT_PUBLIC_PATH = '/playmechi';
export const ONLINE_TOURNAMENT_ARENA_PATH = `${ONLINE_TOURNAMENT_PUBLIC_PATH}/tournament`;
export const ONLINE_TOURNAMENT_REGISTRATION_PATH = `${ONLINE_TOURNAMENT_PUBLIC_PATH}/register`;
export const ONLINE_TOURNAMENT_REGISTRATION_API_PATH =
  '/api/events/mechi-online-gaming-tournament/register';
export const ONLINE_TOURNAMENT_EVENT_DATES = '8-10 May 2026';
export const ONLINE_TOURNAMENT_GAME_LIST_LABEL = 'PUBG Mobile, CODM, and eFootball';
export const ONLINE_TOURNAMENT_CASH_PRIZE_POOL = 6000;
export const ONLINE_TOURNAMENT_STREAM_CHANNEL = 'PlayMechi';
export const ONLINE_TOURNAMENT_STREAMER = 'Kabaka Mwangi';
export const ONLINE_TOURNAMENT_INSTAGRAM = 'PlayMechi';
export const ONLINE_TOURNAMENT_YOUTUBE = 'PlayMechi';
export const ONLINE_TOURNAMENT_YOUTUBE_URL = 'https://www.youtube.com/@playmechi';
export const ONLINE_TOURNAMENT_WHATSAPP_GROUP_URL = PLAYMECHI_WHATSAPP_GROUP_URL;
export const ONLINE_TOURNAMENT_DISPUTE_WINDOW_MINUTES = 20;
export const ONLINE_TOURNAMENT_PAYOUT_WINDOW_HOURS = 48;

function cleanPublicEnv(value: string | undefined) {
  return value?.trim() ?? '';
}

function getYoutubeEmbedUrl() {
  const configuredEmbedUrl = cleanPublicEnv(process.env.NEXT_PUBLIC_PLAYMECHI_YOUTUBE_EMBED_URL);
  if (
    configuredEmbedUrl.startsWith('https://www.youtube.com/embed/') ||
    configuredEmbedUrl.startsWith('https://www.youtube-nocookie.com/embed/')
  ) {
    return configuredEmbedUrl;
  }

  const configuredVideoId = cleanPublicEnv(process.env.NEXT_PUBLIC_PLAYMECHI_YOUTUBE_VIDEO_ID);
  if (configuredVideoId) {
    return `https://www.youtube.com/embed/${encodeURIComponent(configuredVideoId)}`;
  }

  const configuredChannelId = cleanPublicEnv(process.env.NEXT_PUBLIC_PLAYMECHI_YOUTUBE_CHANNEL_ID);
  if (configuredChannelId) {
    return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(configuredChannelId)}`;
  }

  return '';
}

export const ONLINE_TOURNAMENT_YOUTUBE_EMBED_URL = getYoutubeEmbedUrl();

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
    whatsappGroupUrl: 'https://chat.whatsapp.com/Cf9R0k2dPeP683wpNnib1N',
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
    whatsappGroupUrl: 'https://chat.whatsapp.com/JmizQcphVYR2LiRYcrHEaC',
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
    whatsappGroupUrl: 'https://chat.whatsapp.com/Cf9R0k2dPeP683wpNnib1N',
  },
];

export const ONLINE_TOURNAMENT_TOTAL_SLOTS = ONLINE_TOURNAMENT_GAMES.reduce(
  (total, game) => total + game.slots,
  0
);

export type OnlineTournamentGameRegistrationCount = {
  registered: number;
  slots: number;
  spotsLeft: number;
  full: boolean;
};

export type OnlineTournamentRegistrationSummary = {
  games: Record<OnlineTournamentGameKey, OnlineTournamentGameRegistrationCount>;
  registrations: unknown[];
};

export type OnlineTournamentDisplayStatus = 'open' | 'active' | 'completed';

export function getFallbackOnlineTournamentSummary(): OnlineTournamentRegistrationSummary {
  return {
    games: ONLINE_TOURNAMENT_GAMES.reduce(
      (counts, game) => {
        counts[game.game] = {
          registered: 0,
          slots: game.slots,
          spotsLeft: game.slots,
          full: false,
        };
        return counts;
      },
      {} as Record<OnlineTournamentGameKey, OnlineTournamentGameRegistrationCount>
    ),
    registrations: [],
  };
}

export function getOnlineTournamentTotals(summary: OnlineTournamentRegistrationSummary) {
  const totals = ONLINE_TOURNAMENT_GAMES.reduce(
    (totals, game) => {
      const gameSummary = summary.games?.[game.game];
      const slots = Number(gameSummary?.slots ?? game.slots);
      const registered = Number(gameSummary?.registered ?? 0);

      totals.registered += registered;
      totals.slots += slots;
      return totals;
    },
    { registered: 0, slots: 0, spotsLeft: 0, full: false }
  );

  totals.spotsLeft = Math.max(0, totals.slots - totals.registered);
  totals.full = totals.registered >= totals.slots;
  return totals;
}

export function getOnlineTournamentDisplayStatus(
  now = new Date()
): OnlineTournamentDisplayStatus {
  if (
    ONLINE_TOURNAMENT_GAMES.some(
      (game) => getOnlineTournamentWindowState(game, now).isRegistrationOpen
    )
  ) {
    return 'open';
  }

  const latestMatchWindowEnd = Math.max(
    ...ONLINE_TOURNAMENT_GAMES.map((game) => {
      const startsAt = new Date(game.matchStartsAt).getTime();
      return startsAt + 6 * 60 * 60 * 1000;
    })
  );

  return now.getTime() <= latestMatchWindowEnd ? 'active' : 'completed';
}

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
