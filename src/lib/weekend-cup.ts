import {
  formatEatDateTime,
  normalizeSocialHandle,
  type OnlineTournamentCheckInStatus,
  type OnlineTournamentEligibilityStatus,
  type OnlineTournamentGameConfig,
  type OnlineTournamentGameKey,
  type OnlineTournamentPaymentStatus,
  type OnlineTournamentPaymentTier,
} from '@/lib/online-tournament';
import {
  CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL,
  getCustomerWhatsAppSupportUrl,
} from '@/lib/social-links';

export type WeekendCupBallotStatus = 'open' | 'review' | 'locked';
export type WeekendCupBallotPlatform = 'mobile' | 'console' | 'mixed';

export type WeekendCupBallotSeed = {
  slug: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  themeLabel: string;
  status: WeekendCupBallotStatus;
  options: Array<{
    slug: string;
    label: string;
    platform: WeekendCupBallotPlatform;
    description: string;
    isOfficial: boolean;
  }>;
};

export type WeekendCupRegistrationSummary = {
  games: Record<OnlineTournamentGameKey, WeekendCupGameRegistrationCount>;
  registrations: WeekendCupPlayerRegistration[];
  prefill?: Partial<Record<OnlineTournamentGameKey, WeekendCupRegistrationPrefill>>;
  payment: {
    earlyBirdPaidCount: number;
    earlyBirdPaidLimit: number;
    earlyBirdRemaining: number;
  };
};

export type WeekendCupRegistrationPrefill = {
  game: OnlineTournamentGameKey;
  in_game_username: string;
  instagram_username: string | null;
  youtube_name: string | null;
  followed_instagram: boolean;
  subscribed_youtube: boolean;
  available_at_8pm: boolean;
  game_uid: string | null;
  whatsapp_number: string | null;
  device_model: string | null;
  device_serial_last6: string | null;
};

export type WeekendCupGameRegistrationCount = {
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

export type WeekendCupPlayerRegistration = {
  id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  instagram_username: string | null;
  youtube_name: string | null;
  followed_instagram: boolean;
  subscribed_youtube: boolean;
  reward_eligible: boolean;
  eligibility_status: OnlineTournamentEligibilityStatus;
  check_in_status: OnlineTournamentCheckInStatus;
  entry_fee_kes: number | null;
  payment_tier: OnlineTournamentPaymentTier | null;
  payment_status: OnlineTournamentPaymentStatus;
  payment_reference: string | null;
  payment_confirmed_at: string | null;
  payment_note: string | null;
  game_uid: string | null;
  whatsapp_number: string | null;
  device_model: string | null;
  device_serial_last6: string | null;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
};

export const WEEKEND_CUP_SLUG = 'playmechi-weekend-cup-season-1-2026-05-29';
export const WEEKEND_CUP_TITLE = 'PlayMechi Weekend Cup Season 1';
export const WEEKEND_CUP_PUBLIC_PATH = '/';
export const WEEKEND_CUP_REGISTRATION_PATH = '/weekendcup';
export const WEEKEND_CUP_DASHBOARD_PATH = '/weekendcup/dashboard';
export const WEEKEND_CUP_PROMO_IMAGE = '/images/weekendcup/season-1-promo.png';
export const WEEKEND_CUP_REGISTRATION_ENABLED = true;
export const WEEKEND_CUP_VOTING_ENABLED = true;
export const WEEKEND_CUP_EVENT_DATES = '29-31 May 2026';
export const WEEKEND_CUP_REGISTRATION_OPENS_AT = '2026-05-13T00:00:00+03:00';
export const WEEKEND_CUP_REGISTRATION_OPENS_LABEL = 'Open now';
export const WEEKEND_CUP_CASH_PRIZE_POOL = 7500;
export const WEEKEND_CUP_PRIZE_POOL_LABEL = 'Prize Pool Upto Ksh.7500';
export const WEEKEND_CUP_STREAM_LABEL = 'Live on Mechi';
export const WEEKEND_CUP_MAX_VOTE_SELECTIONS = 3;
export const WEEKEND_CUP_ACTIVE_PAYMENT_TIER: OnlineTournamentPaymentTier = 'early_bird';
export const WEEKEND_CUP_HERO_LINE =
  'Register for the fixed games now, then vote for the mystery slot.';
export const WEEKEND_CUP_SERIES_TITLE = 'PlayMechi Weekend Cup 2026';
export const WEEKEND_CUP_CHECK_IN_BLOCKED_MESSAGE =
  'Your registration is pending payment confirmation. Complete payment before check-in.';
export const WEEKEND_CUP_REGISTRATION_DISABLED_MESSAGE =
  'Weekend Cup registration is not available right now.';
export const WEEKEND_CUP_VOTING_DISABLED_MESSAGE =
  'Weekend Cup voting is paused right now. Try again in a bit.';
export const WEEKEND_CUP_PENDING_PAYMENT_HELP_COPY =
  'Payment confirms the slot after it clears. Pending players do not count as confirmed.';
export const WEEKEND_CUP_SUPPORT_NUMBER_LABEL = CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL;
export const WEEKEND_CUP_SUPPORT_URL = getCustomerWhatsAppSupportUrl(
  'Hi PlayMechi, I need Weekend Cup payment help.'
);

export const WEEKEND_CUP_GAME_ENTRY_FEES = {
  pubgm: {
    early_bird: 50,
    regular: 75,
    late: 100,
  },
  codm: {
    early_bird: 50,
    regular: 75,
    late: 100,
  },
  efootball: {
    early_bird: 100,
    regular: 125,
    late: 150,
  },
  mystery: {
    early_bird: 50,
    regular: 75,
    late: 100,
  },
} as const satisfies Record<OnlineTournamentGameKey, Record<OnlineTournamentPaymentTier, number>>;

export const WEEKEND_CUP_ENTRY_PRICING = {
  earlyBirdKes: 50,
  regularKes: 75,
  lateKes: 100,
  earlyBirdPaidLimit: 12,
  entryFromLabel: 'Entry from KSh 50',
  earlyBirdLabel: 'Early Bird',
  regularLabel: 'Phase 2',
  lateLabel: 'Final Rush',
  pricingLineLabel: 'Early Bird is active now',
  earlyBirdLimitLabel: 'Early Bird is live now',
  earlyBirdPolicyLabel: 'Payment confirms the slot automatically.',
  confirmedAfterPaymentLabel: 'Slots move from pending to confirmed after payment clears.',
  pendingPaymentLabel: 'Pending payment',
  pendingPaymentMessage: WEEKEND_CUP_CHECK_IN_BLOCKED_MESSAGE,
} as const;

export const WEEKEND_CUP_GAMES: OnlineTournamentGameConfig[] = [
  {
    game: 'pubgm',
    label: 'PUBG Mobile',
    shortLabel: 'PUBG',
    dateLabel: 'Friday 29 May 2026',
    timeLabel: '8:00 PM EAT',
    matchStartsAt: '2026-05-29T20:00:00+03:00',
    registrationClosesAt: '2026-05-29T19:00:00+03:00',
    slots: 80,
    checkInCap: 80,
    format: 'Solo battle royale room',
    matchCount: '3 matches',
    scoring: '1 kill = 1 point. Top fraggers run it up.',
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
    timeLabel: '8:00 PM EAT',
    matchStartsAt: '2026-05-30T20:00:00+03:00',
    registrationClosesAt: '2026-05-30T19:00:00+03:00',
    slots: 80,
    checkInCap: 80,
    format: 'Solo battle royale room',
    matchCount: '3 matches',
    scoring: '1 kill = 3 points. Placement matters too.',
    firstPrize: 'KSh 1,500',
    secondPrize: 'KSh 1,000',
    thirdPrize: 'KSh 500',
    whatsappGroupUrl: 'https://chat.whatsapp.com/JmizQcphVYR2LiRYcrHEaC',
  },
  {
    game: 'efootball',
    label: 'eFootball',
    shortLabel: 'eFootball',
    dateLabel: 'Sunday 31 May 2026',
    timeLabel: '7:30 PM EAT',
    matchStartsAt: '2026-05-31T19:30:00+03:00',
    registrationClosesAt: '2026-05-31T19:00:00+03:00',
    slots: 16,
    checkInCap: 16,
    format: '1v1 knockout bracket',
    matchCount: 'Round of 16 to final',
    scoring: 'Single-leg bracket. If it is level, settle it clean in extra time or pens.',
    firstPrize: 'KSh 1,000',
    secondPrize: 'KSh 500',
    thirdPrize: '',
    whatsappGroupUrl: 'https://chat.whatsapp.com/Cf9R0k2dPeP683wpNnib1N',
  },
  {
    game: 'mystery',
    label: 'Mystery Game',
    shortLabel: 'Mystery',
    dateLabel: 'Schedule drops after voting',
    timeLabel: 'TBA',
    matchStartsAt: '2026-05-31T20:00:00+03:00',
    registrationClosesAt: '2026-05-31T19:00:00+03:00',
    slots: 80,
    checkInCap: 80,
    format: 'Community-voted game slot',
    matchCount: 'Format drops with the winning game',
    scoring: 'Rules publish after voting closes and the mystery game is locked.',
    firstPrize: 'TBA',
    secondPrize: 'TBA',
    thirdPrize: '',
    whatsappGroupUrl: WEEKEND_CUP_SUPPORT_URL,
  },
];

export const WEEKEND_CUP_GAME_BY_KEY = WEEKEND_CUP_GAMES.reduce(
  (games, game) => {
    games[game.game] = game;
    return games;
  },
  {} as Record<OnlineTournamentGameKey, OnlineTournamentGameConfig>
);

export const WEEKEND_CUP_TOTAL_SLOTS = WEEKEND_CUP_GAMES.reduce(
  (total, game) => total + game.slots,
  0
);

export const WEEKEND_CUP_BALLOTS: WeekendCupBallotSeed[] = [
  {
    slug: 'weekend-cup-1-mobile',
    title: 'Mystery Game Vote',
    subtitle: 'Pick the fourth Season 1 game',
    dateLabel: '29-31 May 2026',
    themeLabel: 'Mystery slot',
    status: 'open',
    options: [
      {
        slug: 'free-fire',
        label: 'Free Fire',
        platform: 'mobile',
        description: 'Fast lobbies, quick smoke, huge casual pull.',
        isOfficial: true,
      },
      {
        slug: 'ludo',
        label: 'Ludo',
        platform: 'mobile',
        description: 'Quick rounds, easy entry, noisy finals energy.',
        isOfficial: true,
      },
      {
        slug: 'ea-sports-fc-26',
        label: 'EA SPORTS FC 26',
        platform: 'console',
        description: 'Controller classics, easy storylines, strong local banter.',
        isOfficial: true,
      },
      {
        slug: 'mortal-kombat',
        label: 'Mortal Kombat',
        platform: 'console',
        description: 'Fast sets, loud moments, clean bracket pressure.',
        isOfficial: true,
      },
      {
        slug: 'rocket-league',
        label: 'Rocket League',
        platform: 'console',
        description: 'Short matches, clutch goals, easy highlights.',
        isOfficial: true,
      },
    ],
  },
  {
    slug: 'weekend-cup-2-console',
    title: 'Weekend Cup 2',
    subtitle: 'Console Games Cup',
    dateLabel: '12-14 June 2026',
    themeLabel: 'Weekend 2',
    status: 'open',
    options: [
      {
        slug: 'fortnite',
        label: 'Fortnite',
        platform: 'console',
        description: 'Big casual pull, clean clips, and strong community reach.',
        isOfficial: true,
      },
      {
        slug: 'ea-sports-fc-26',
        label: 'EA SPORTS FC 26',
        platform: 'console',
        description: 'Easy to follow, easy to stream, always gets debate moving.',
        isOfficial: true,
      },
      {
        slug: 'mortal-kombat',
        label: 'Mortal Kombat',
        platform: 'console',
        description: 'Fast sets, loud moments, strong local comp energy.',
        isOfficial: true,
      },
      {
        slug: 'nba-2k26',
        label: 'NBA 2K26',
        platform: 'console',
        description: 'Strong culture play with a natural weekend crowd.',
        isOfficial: true,
      },
      {
        slug: 'warzone',
        label: 'Call of Duty: Warzone',
        platform: 'console',
        description: 'Bigger BR names, bigger stream moments.',
        isOfficial: true,
      },
    ],
  },
  {
    slug: 'weekend-cup-3-mixed',
    title: 'Weekend Cup 3',
    subtitle: 'Mixed Games Cup',
    dateLabel: '26-28 June 2026',
    themeLabel: 'Weekend 3',
    status: 'review',
    options: [
      {
        slug: 'mixed-mobile-console',
        label: 'Mixed format picks',
        platform: 'mixed',
        description: 'The final mix pulls the strongest-supported mobile and console titles.',
        isOfficial: true,
      },
    ],
  },
];

export function isWeekendCupGame(value: unknown): value is OnlineTournamentGameKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(WEEKEND_CUP_GAME_BY_KEY, value);
}

export function isWeekendCupPaymentStatus(
  value: unknown
): value is OnlineTournamentPaymentStatus {
  return (
    value === 'pending_payment' ||
    value === 'paid' ||
    value === 'failed' ||
    value === 'refunded' ||
    value === 'manual_review'
  );
}

export function isWeekendCupPaymentTier(
  value: unknown
): value is OnlineTournamentPaymentTier {
  return value === 'early_bird' || value === 'regular' || value === 'late';
}

export function isWeekendCupPaidStatus(value: unknown) {
  return value === 'paid';
}

export function getWeekendCupPaymentTierAmount(
  tier: OnlineTournamentPaymentTier,
  game: OnlineTournamentGameKey = 'codm'
) {
  return WEEKEND_CUP_GAME_ENTRY_FEES[game]?.[tier] ?? WEEKEND_CUP_GAME_ENTRY_FEES.codm[tier];
}

export function getWeekendCupPaymentTierLabel(tier: OnlineTournamentPaymentTier) {
  switch (tier) {
    case 'early_bird':
      return WEEKEND_CUP_ENTRY_PRICING.earlyBirdLabel;
    case 'late':
      return WEEKEND_CUP_ENTRY_PRICING.lateLabel;
    case 'regular':
    default:
      return WEEKEND_CUP_ENTRY_PRICING.regularLabel;
  }
}

export function getWeekendCupPaymentTierDisplay(
  tier: OnlineTournamentPaymentTier,
  game: OnlineTournamentGameKey
) {
  return `${getWeekendCupPaymentTierLabel(tier)} KSh ${getWeekendCupPaymentTierAmount(
    tier,
    game
  ).toLocaleString('en-KE')}`;
}

export function getWeekendCupGamePricingLine(game: OnlineTournamentGameKey) {
  const fees = WEEKEND_CUP_GAME_ENTRY_FEES[game] ?? WEEKEND_CUP_GAME_ENTRY_FEES.codm;
  return `Early Bird KSh ${fees.early_bird}`;
}

export function getWeekendCupDefaultPaymentForConfirmation(
  _confirmedPaidCount: number,
  game: OnlineTournamentGameKey = 'codm'
) {
  const tier: OnlineTournamentPaymentTier = WEEKEND_CUP_ACTIVE_PAYMENT_TIER;

  return {
    tier,
    amountKes: getWeekendCupPaymentTierAmount(tier, game),
  };
}

export function formatWeekendCupKes(value: number) {
  return `KSh ${value.toLocaleString('en-KE')}`;
}

export function getWeekendCupWindowState(game: OnlineTournamentGameConfig, now = new Date()) {
  const closesAt = new Date(game.registrationClosesAt);
  const startsAt = new Date(game.matchStartsAt);

  return {
    closesAt,
    startsAt,
    isRegistrationOpen: now.getTime() < closesAt.getTime(),
  };
}

export function isWeekendCupRegistrationOpen(now = new Date()) {
  return now.getTime() >= new Date(WEEKEND_CUP_REGISTRATION_OPENS_AT).getTime();
}

export function getWeekendCupGameRegistrationCounts() {
  return WEEKEND_CUP_GAMES.reduce(
    (counts, game) => {
      counts[game.game] = {
        registered: 0,
        confirmed: 0,
        pendingPayment: 0,
        slots: game.slots,
        spotsLeft: game.slots,
        full: false,
        checkedIn: 0,
        checkInCap: game.checkInCap,
        checkInSpotsLeft: game.checkInCap,
        checkInFull: false,
      };
      return counts;
    },
    {} as Record<OnlineTournamentGameKey, WeekendCupGameRegistrationCount>
  );
}

export function getWeekendCupFallbackSummary(): WeekendCupRegistrationSummary {
  return {
    games: getWeekendCupGameRegistrationCounts(),
    registrations: [],
    prefill: {},
    payment: {
      earlyBirdPaidCount: 0,
      earlyBirdPaidLimit: WEEKEND_CUP_ENTRY_PRICING.earlyBirdPaidLimit,
      earlyBirdRemaining: WEEKEND_CUP_ENTRY_PRICING.earlyBirdPaidLimit,
    },
  };
}

export function getWeekendCupTotals(summary: WeekendCupRegistrationSummary) {
  return WEEKEND_CUP_GAMES.reduce(
    (totals, game) => {
      const row = summary.games[game.game];
      totals.registered += row?.registered ?? 0;
      totals.confirmed += row?.confirmed ?? 0;
      totals.pendingPayment += row?.pendingPayment ?? 0;
      totals.checkedIn += row?.checkedIn ?? 0;
      totals.spotsLeft += row?.spotsLeft ?? game.slots;
      return totals;
    },
    {
      registered: 0,
      confirmed: 0,
      pendingPayment: 0,
      checkedIn: 0,
      spotsLeft: WEEKEND_CUP_TOTAL_SLOTS,
    }
  );
}

export function getWeekendCupSuggestedTierCopy(confirmedPaidCount: number) {
  return `${getWeekendCupPaymentTierLabel(WEEKEND_CUP_ACTIVE_PAYMENT_TIER)} is active right now. ${confirmedPaidCount.toLocaleString('en-KE')} paid entries confirmed.`;
}

export function formatWeekendCupPaymentStatus(status: OnlineTournamentPaymentStatus) {
  return status.replaceAll('_', ' ');
}

export function formatWeekendCupPlayerDate(value: string | Date | null | undefined) {
  if (!value) {
    return 'Not yet';
  }

  try {
    return formatEatDateTime(value);
  } catch {
    return 'Not yet';
  }
}

export function cleanWeekendCupText(value: unknown, maxLength = 120) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

export function cleanWeekendCupHandle(value: unknown, maxLength = 80) {
  return normalizeSocialHandle(cleanWeekendCupText(value, maxLength));
}
