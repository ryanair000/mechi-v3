import type {
  AutoContentTemplate,
  BountySeed,
  CampaignSeedWeek,
  MarketingSettings,
} from "@/lib/types";

export const SESSION_COOKIE_NAME = "mkt_session";
export const CAMPAIGN_TOTAL_DAYS = 28;

export const CAMPAIGN_WEEKS: CampaignSeedWeek[] = [
  {
    week_number: 1,
    week_start: "2026-04-27",
    week_end: "2026-05-03",
    tournament_game: "efootball",
    notes: null,
  },
  {
    week_number: 2,
    week_start: "2026-05-04",
    week_end: "2026-05-10",
    tournament_game: "codm",
    notes: null,
  },
  {
    week_number: 3,
    week_start: "2026-05-11",
    week_end: "2026-05-17",
    tournament_game: "pubgm",
    notes: null,
  },
  {
    week_number: 4,
    week_start: "2026-05-18",
    week_end: "2026-05-24",
    tournament_game: "efootball",
    notes: null,
  },
];

export const DEFAULT_SETTINGS: MarketingSettings = {
  singleton: true,
  total_budget_kes: 15000,
  meta_budget_kes: 8000,
  tiktok_budget_kes: 5000,
  twitter_budget_kes: 2000,
};

export const AUTO_CONTENT_TEMPLATES: AutoContentTemplate[] = [
  {
    day_type: "monday_announce",
    day_offset: 0,
    titlePrefix: "Tournament week is live",
    description:
      "Announce the game, prize pool, and Friday showdown window for this week's campaign push.",
  },
  {
    day_type: "thursday_countdown",
    day_offset: 3,
    titlePrefix: "24-hour countdown",
    description:
      "Drive late registrations, remind the community about the prize pool, and tease active bounties.",
  },
  {
    day_type: "saturday_winner",
    day_offset: 5,
    titlePrefix: "Winner recap",
    description:
      "Share the podium, winnings, and social proof after the Friday tournament wraps.",
  },
];

export const WEEK_ONE_BOUNTIES: BountySeed[] = [
  {
    title: "Play your first match today",
    description: "Reward the first push into active play on launch week.",
    trigger_label: "Play first match today",
    prize_kes: 50,
    game: null,
  },
  {
    title: "Win 3 matches in a row",
    description: "Spotlight streak players and create momentum for the tournament week.",
    trigger_label: "Win 3 matches in a row",
    prize_kes: 100,
    game: null,
  },
  {
    title: "Complete your profile",
    description: "Use setup friction as a low-cost conversion win before tournament day.",
    trigger_label: "Complete your profile",
    prize_kes: 50,
    game: null,
  },
  {
    title: "Refer a player who registers",
    description: "Push organic player acquisition with a high-value referral conversion reward.",
    trigger_label: "Refer a player who registers",
    prize_kes: 200,
    game: null,
  },
  {
    title: "Reach 1,000 RP lifetime",
    description: "Celebrate a visible progression milestone that players can understand instantly.",
    trigger_label: "Reach 1,000 RP lifetime",
    prize_kes: 100,
    game: null,
  },
  {
    title: "Finish top 3 on leaderboard",
    description: "Reward leaderboard status as social proof for the campaign.",
    trigger_label: "Finish top 3 on leaderboard",
    prize_kes: 200,
    game: null,
  },
];

export const CHANNEL_FIELDS = [
  "posted_tiktok",
  "posted_instagram",
  "posted_twitter",
  "posted_whatsapp",
] as const;
