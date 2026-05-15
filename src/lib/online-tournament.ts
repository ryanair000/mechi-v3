import type { GameKey } from '@/types';
import { PLAYMECHI_WHATSAPP_GROUP_URL } from '@/lib/social-links';

export type OnlineTournamentGameKey = Extract<GameKey, 'pubgm' | 'codm' | 'efootball' | 'mystery'>;

export type OnlineTournamentDisputeCategory =
  | 'wrongdoing'
  | 'rule_break'
  | 'score_issue'
  | 'room_issue'
  | 'technical_issue'
  | 'other';

export type OnlineTournamentEligibilityStatus =
  | 'pending'
  | 'verified'
  | 'ineligible'
  | 'disqualified';

export type OnlineTournamentCheckInStatus = 'registered' | 'checked_in' | 'no_show';

export type OnlineTournamentPaymentStatus =
  | 'pending_payment'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'manual_review';

export type OnlineTournamentPaymentTier = 'early_bird' | 'regular' | 'late';

export type OnlineTournamentGameConfig = {
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
  format: string;
  matchCount: string;
  scoring: string;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  whatsappGroupUrl: string;
  deskRules?: {
    heading: string;
    sections: Array<{
      title: string;
      items: string[];
    }>;
  };
};

export const ONLINE_TOURNAMENT_DEVICE_SERIAL_LAST6_REGEX = /^[A-Z0-9]{6}$/;

export const ONLINE_TOURNAMENT_SLUG = 'mechi-club-online-gaming-tournament-2026-05';
export const ONLINE_TOURNAMENT_TITLE = 'Playmechi Launch';
export const ONLINE_TOURNAMENT_PUBLIC_PATH = '/playmechi';
export const ONLINE_TOURNAMENT_ARENA_PATH = `${ONLINE_TOURNAMENT_PUBLIC_PATH}/tournament`;
export const ONLINE_TOURNAMENT_CHECK_IN_PATH = `${ONLINE_TOURNAMENT_PUBLIC_PATH}/check-in`;
export const ONLINE_TOURNAMENT_CODM_MODERATOR_PATH = '/moderators';
export const ONLINE_TOURNAMENT_REGISTRATION_PATH = `${ONLINE_TOURNAMENT_PUBLIC_PATH}/register`;
export const ONLINE_TOURNAMENT_DISPUTE_PATH = `${ONLINE_TOURNAMENT_PUBLIC_PATH}/createdispute`;
export const ONLINE_TOURNAMENT_REGISTRATION_API_PATH =
  '/api/events/mechi-online-gaming-tournament/register';
export const ONLINE_TOURNAMENT_DISPUTE_API_PATH =
  '/api/events/mechi-online-gaming-tournament/disputes';
export const ONLINE_TOURNAMENT_EVENT_DATES = '8-10 May 2026';
export const ONLINE_TOURNAMENT_GAME_LIST_LABEL = 'PUBG Mobile, CODM, and eFootball';
export const ONLINE_TOURNAMENT_CASH_PRIZE_POOL = 6000;
export const ONLINE_TOURNAMENT_PAYMENT_CONFIRMATION_ENABLED = false;
export const ONLINE_TOURNAMENT_STREAM_CHANNEL = 'PlayMechi';
export const ONLINE_TOURNAMENT_STREAMER = 'Kabaka Mwangi';
export const ONLINE_TOURNAMENT_INSTAGRAM = 'PlayMechi';
export const ONLINE_TOURNAMENT_YOUTUBE = 'PlayMechi';
export const ONLINE_TOURNAMENT_TIKTOK = 'PlayMechi';
export const ONLINE_TOURNAMENT_INSTAGRAM_URL = 'https://www.instagram.com/playmechi/';
export const ONLINE_TOURNAMENT_YOUTUBE_URL = 'https://www.youtube.com/@playmechi';
export const ONLINE_TOURNAMENT_TIKTOK_URL = 'https://www.tiktok.com/@playmechi';
export const ONLINE_TOURNAMENT_WHATSAPP_GROUP_URL = PLAYMECHI_WHATSAPP_GROUP_URL;
export const ONLINE_TOURNAMENT_DISPUTE_WINDOW_MINUTES = 20;
export const ONLINE_TOURNAMENT_PAYOUT_WINDOW_HOURS = 48;
export const ONLINE_TOURNAMENT_STREAM_PLATFORMS = [
  {
    key: 'instagram',
    label: 'Instagram',
    handle: `@${ONLINE_TOURNAMENT_INSTAGRAM.toLowerCase()}`,
    href: ONLINE_TOURNAMENT_INSTAGRAM_URL,
    role: 'Fast clips and match-day updates',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    handle: `@${ONLINE_TOURNAMENT_TIKTOK.toLowerCase()}`,
    href: ONLINE_TOURNAMENT_TIKTOK_URL,
    role: 'Short live reactions and discovery',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    handle: `@${ONLINE_TOURNAMENT_YOUTUBE.toLowerCase()}`,
    href: ONLINE_TOURNAMENT_YOUTUBE_URL,
    role: 'Main long-form stream and replays',
  },
] as const;
export const ONLINE_TOURNAMENT_PAYMENT_STATUSES: OnlineTournamentPaymentStatus[] = [
  'pending_payment',
  'paid',
  'failed',
  'refunded',
  'manual_review',
];

export const ONLINE_TOURNAMENT_PAYMENT_TIERS: OnlineTournamentPaymentTier[] = [
  'early_bird',
  'regular',
  'late',
];

export const ONLINE_TOURNAMENT_ENTRY_PRICING = {
  earlyBirdKes: 0,
  regularKes: 0,
  lateKes: 0,
  earlyBirdPaidLimit: 0,
  entryFromLabel: 'Free entry',
  earlyBirdLabel: 'Free entry',
  regularLabel: 'Free entry',
  lateLabel: 'Free entry',
  pricingLineLabel: 'Free entry',
  earlyBirdLimitLabel: 'No payment required',
  earlyBirdPolicyLabel: 'No payment is required for this tournament.',
  confirmedAfterPaymentLabel: 'Registration is confirmed once you submit it.',
  pendingPaymentLabel: 'Registration confirmed',
  pendingPaymentMessage: 'This tournament is free. Your registration is already confirmed.',
} as const;

export function formatTournamentKes(value: number) {
  return `KSh ${value.toLocaleString('en-KE')}`;
}

export function getOnlineTournamentPaymentTierAmount(
  tier: OnlineTournamentPaymentTier
) {
  switch (tier) {
    case 'early_bird':
      return ONLINE_TOURNAMENT_ENTRY_PRICING.earlyBirdKes;
    case 'late':
      return ONLINE_TOURNAMENT_ENTRY_PRICING.lateKes;
    case 'regular':
    default:
      return ONLINE_TOURNAMENT_ENTRY_PRICING.regularKes;
  }
}

export function getOnlineTournamentPaymentTierLabel(
  tier: OnlineTournamentPaymentTier
) {
  switch (tier) {
    case 'early_bird':
      return ONLINE_TOURNAMENT_ENTRY_PRICING.earlyBirdLabel;
    case 'late':
      return ONLINE_TOURNAMENT_ENTRY_PRICING.lateLabel;
    case 'regular':
    default:
      return ONLINE_TOURNAMENT_ENTRY_PRICING.regularLabel;
  }
}

export function isOnlineTournamentPaymentStatus(
  value: unknown
): value is OnlineTournamentPaymentStatus {
  return (
    typeof value === 'string' &&
    ONLINE_TOURNAMENT_PAYMENT_STATUSES.includes(value as OnlineTournamentPaymentStatus)
  );
}

export function isOnlineTournamentPaymentTier(
  value: unknown
): value is OnlineTournamentPaymentTier {
  return (
    typeof value === 'string' &&
    ONLINE_TOURNAMENT_PAYMENT_TIERS.includes(value as OnlineTournamentPaymentTier)
  );
}

export function isOnlineTournamentPaidStatus(value: unknown) {
  return !ONLINE_TOURNAMENT_PAYMENT_CONFIRMATION_ENABLED || value === 'paid';
}

export function getOnlineTournamentDefaultPaymentForConfirmation(confirmedPaidCount: number) {
  const tier =
    confirmedPaidCount < ONLINE_TOURNAMENT_ENTRY_PRICING.earlyBirdPaidLimit
      ? 'early_bird'
      : 'regular';

  return {
    tier,
    amountKes: getOnlineTournamentPaymentTierAmount(tier),
  } satisfies {
    tier: OnlineTournamentPaymentTier;
    amountKes: number;
  };
}
export const ONLINE_TOURNAMENT_DISPUTE_CATEGORIES = [
  { value: 'wrongdoing', label: 'Wrongdoing or cheating' },
  { value: 'rule_break', label: 'Rule break or unfair conduct' },
  { value: 'score_issue', label: 'Score or result issue' },
  { value: 'room_issue', label: 'Room, lobby, or match access issue' },
  { value: 'technical_issue', label: 'Technical issue' },
  { value: 'other', label: 'Other tournament issue' },
] as const satisfies ReadonlyArray<{
  value: OnlineTournamentDisputeCategory;
  label: string;
}>;

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

export function normalizeTournamentDeviceSerialLast6(value: unknown) {
  return String(value ?? '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(-6);
}

export function isValidTournamentDeviceSerialLast6(value: unknown) {
  return ONLINE_TOURNAMENT_DEVICE_SERIAL_LAST6_REGEX.test(
    normalizeTournamentDeviceSerialLast6(value)
  );
}

export function requiresTournamentDeviceSerialLast6(game: OnlineTournamentGameKey) {
  switch (game) {
    default:
      return false;
  }
}

export const ONLINE_TOURNAMENT_GAMES: OnlineTournamentGameConfig[] = [
  {
    game: 'pubgm',
    label: 'PUBG Mobile',
    shortLabel: 'PUBG',
    dateLabel: 'Friday 8 May 2026',
    timeLabel: '8:00 PM EAT',
    matchStartsAt: '2026-05-08T20:00:00+03:00',
    registrationClosesAt: '2026-05-08T19:30:00+03:00',
    slots: 200,
    checkInCap: 100,
    format: 'Individual Battle Royale tournament room',
    matchCount: '3 matches',
    scoring: '1 kill = 1 point. Placement has no points.',
    firstPrize: 'KSh 1,500',
    secondPrize: 'KSh 1,000',
    thirdPrize: '60 UC',
    whatsappGroupUrl: 'https://chat.whatsapp.com/HDZwDyft00kIVHb6vYVbJv',
  },
  {
    game: 'codm',
    label: 'Call of Duty Mobile',
    shortLabel: 'CODM',
    dateLabel: 'Saturday 9 May 2026',
    timeLabel: '8:00 PM EAT',
    matchStartsAt: '2026-05-09T20:00:00+03:00',
    registrationClosesAt: '2026-05-09T19:30:00+03:00',
    slots: 200,
    checkInCap: 100,
    format: 'Individual Battle Royale tournament room',
    matchCount: '3 matches',
    scoring: '1 kill = 3 points. Placement: #1 20, #2 15, #3 10, #4 5, #5-25 3.',
    firstPrize: 'KSh 1,200',
    secondPrize: 'KSh 800',
    thirdPrize: '80 CP',
    whatsappGroupUrl: 'https://chat.whatsapp.com/JmizQcphVYR2LiRYcrHEaC',
    deskRules: {
      heading: 'CODM Battle Royale rules',
      sections: [
        {
          title: 'Restricted loadout',
          items: [
            'Banned guns: none.',
            'Banned attachments: all thermite and concussion mags.',
            'Banned classes: Igniter, Quick Strike, Trap Master, Shockwave, Desperado, Spotter, Clown, and Ravager Launcher.',
            'Banned vehicles: tanks, Jackal, and hoverbike.',
            'Banned items: SMRS, Thumper, and all ballistic items.',
          ],
        },
        {
          title: 'Placement and points',
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
            'Rule break: no kill points, regardless of placement or kills scored.',
            'Repeated rule break: 1 season ban (4 weeks).',
          ],
        },
      ],
    },
  },
  {
    game: 'efootball',
    label: 'eFootball',
    shortLabel: 'eFootball',
    dateLabel: 'Sunday 10 May 2026',
    timeLabel: '8:00 PM EAT',
    matchStartsAt: '2026-05-10T20:00:00+03:00',
    registrationClosesAt: '2026-05-10T19:30:00+03:00',
    slots: 200,
    checkInCap: 16,
    format: '1v1 knockout bracket with bronze match',
    matchCount: 'Round of 16 to final',
    scoring: 'One leg per fixture. Draws go to extra time, penalties, or golden goal replay.',
    firstPrize: 'KSh 1,000',
    secondPrize: 'KSh 500',
    thirdPrize: '315 Coins',
    whatsappGroupUrl: 'https://chat.whatsapp.com/Cf9R0k2dPeP683wpNnib1N',
  },
];

export const ONLINE_TOURNAMENT_CODM_MATCH_DETAILS = {
  anchorId: 'codm-match',
  eyebrow: 'CODM match desk',
  title: 'CODM match details drop on match day.',
  dateLabel: 'Saturday 9 May 2026',
  timeLabel: '8:00 PM EAT',
  inviteHref: `${ONLINE_TOURNAMENT_REGISTRATION_PATH}?game=codm`,
  inviteLabel: 'Register for CODM',
  roomCode: 'Shared on match day',
  password: 'Shared on match day',
  notes: [
    'Register first, then wait for the CODM room ID and password to be shared by the moderators.',
    'Join with the same CODM username you registered with on Mechi.',
    'Keep WhatsApp open for lobby drops, scoring reminders, and match-day updates from the desk.',
  ],
} as const;

export const ONLINE_TOURNAMENT_TOTAL_SLOTS = ONLINE_TOURNAMENT_GAMES.reduce(
  (total, game) => total + game.slots,
  0
);

export const ONLINE_TOURNAMENT_TOTAL_CHECK_IN_CAP = ONLINE_TOURNAMENT_GAMES.reduce(
  (total, game) => total + game.checkInCap,
  0
);

export type OnlineTournamentGameRegistrationCount = {
  registered: number;
  confirmed: number;
  pendingPayment: number;
  slots: number;
  spotsLeft: number;
  full: boolean;
  checkedIn: number;
  checkInCap: number;
  checkInSpotsLeft: number;
  checkInFull: boolean;
};

export type OnlineTournamentRegistrationSummary = {
  games: Record<OnlineTournamentGameKey, OnlineTournamentGameRegistrationCount>;
  registrations: unknown[];
  payment: {
    earlyBirdPaidCount: number;
    earlyBirdPaidLimit: number;
    earlyBirdRemaining: number;
  };
};

export type OnlineTournamentDisplayStatus = 'open' | 'active' | 'completed';

export function isOnlineTournamentRegistrationClosed(game: OnlineTournamentGameConfig) {
  return Boolean(game.registrationClosed);
}

export function getFallbackOnlineTournamentSummary(): OnlineTournamentRegistrationSummary {
  return {
    games: ONLINE_TOURNAMENT_GAMES.reduce(
      (counts, game) => {
        const registrationClosed = isOnlineTournamentRegistrationClosed(game);
        counts[game.game] = {
          registered: 0,
          confirmed: 0,
          pendingPayment: 0,
          slots: game.slots,
          spotsLeft: registrationClosed ? 0 : game.slots,
          full: registrationClosed,
          checkedIn: 0,
          checkInCap: game.checkInCap,
          checkInSpotsLeft: game.checkInCap,
          checkInFull: false,
        };
        return counts;
      },
      {} as Record<OnlineTournamentGameKey, OnlineTournamentGameRegistrationCount>
    ),
    registrations: [],
    payment: {
      earlyBirdPaidCount: 0,
      earlyBirdPaidLimit: ONLINE_TOURNAMENT_ENTRY_PRICING.earlyBirdPaidLimit,
      earlyBirdRemaining: ONLINE_TOURNAMENT_ENTRY_PRICING.earlyBirdPaidLimit,
    },
  };
}

export function getOnlineTournamentTotals(summary: OnlineTournamentRegistrationSummary) {
  const totals = ONLINE_TOURNAMENT_GAMES.reduce(
    (totals, game) => {
      const gameSummary = summary.games?.[game.game];
      const slots = Number(gameSummary?.slots ?? game.slots);
      const registered = Number(gameSummary?.registered ?? 0);
      const confirmed = Number(gameSummary?.confirmed ?? 0);
      const pendingPayment = Number(gameSummary?.pendingPayment ?? 0);
      const checkedIn = Number(gameSummary?.checkedIn ?? 0);
      const fallbackSpotsLeft = isOnlineTournamentRegistrationClosed(game)
        ? 0
        : Math.max(0, slots - confirmed);
      const spotsLeft = Number(gameSummary?.spotsLeft ?? fallbackSpotsLeft);
      const checkInCap = Number(gameSummary?.checkInCap ?? game.checkInCap);
      const fallbackCheckInSpotsLeft = Math.max(0, checkInCap - checkedIn);
      const checkInSpotsLeft = Number(
        gameSummary?.checkInSpotsLeft ?? fallbackCheckInSpotsLeft
      );

      totals.registered += registered;
      totals.confirmed += confirmed;
      totals.pendingPayment += pendingPayment;
      totals.slots += slots;
      totals.spotsLeft += Math.max(0, spotsLeft);
      totals.checkedIn += checkedIn;
      totals.checkInCap += checkInCap;
      totals.checkInSpotsLeft += Math.max(0, checkInSpotsLeft);
      return totals;
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

export function isOnlineTournamentDisputeCategory(
  value: unknown
): value is OnlineTournamentDisputeCategory {
  return (
    typeof value === 'string' &&
    ONLINE_TOURNAMENT_DISPUTE_CATEGORIES.some((category) => category.value === value)
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
    isRegistrationOpen:
      !isOnlineTournamentRegistrationClosed(game) && now.getTime() < closesAt.getTime(),
    closesAt,
    startsAt,
  };
}

export function getOnlineTournamentCapacityErrorType(
  error: unknown
): 'registration_cap' | 'check_in_cap' | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const candidate = error as {
    code?: string;
    details?: string;
    hint?: string;
    message?: string;
  };
  const text = [candidate.code, candidate.details, candidate.hint, candidate.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (text.includes('online_tournament_registration_cap_reached')) {
    return 'registration_cap';
  }

  if (text.includes('online_tournament_check_in_cap_reached')) {
    return 'check_in_cap';
  }

  return null;
}

export function formatEatDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}
