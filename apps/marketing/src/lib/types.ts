export type Game = "efootball" | "codm" | "pubgm";
export type TournamentStatus = "upcoming" | "live" | "completed";
export type BountyStatus = "draft" | "active" | "claimed" | "cancelled";
export type DayType =
  | "monday_announce"
  | "thursday_countdown"
  | "saturday_winner"
  | "wednesday_bounty_update"
  | "custom";
export type AdPlatform = "meta" | "tiktok" | "twitter";

export interface CampaignSeedWeek {
  week_number: number;
  week_start: string;
  week_end: string;
  tournament_game: Game;
  notes: string | null;
}

export interface CampaignWeek extends CampaignSeedWeek {
  id: string;
  created_at?: string;
}

export interface Tournament {
  id: string;
  week_id: string;
  game: Game;
  date: string;
  prize_pool_kes: number;
  status: TournamentStatus;
  participant_count: number | null;
  first_place_name: string | null;
  first_place_phone: string | null;
  first_place_kes: number | null;
  first_place_paid: boolean;
  first_place_paid_at: string | null;
  second_place_name: string | null;
  second_place_phone: string | null;
  second_place_kes: number | null;
  second_place_paid: boolean;
  second_place_paid_at: string | null;
  winner_screenshot_url: string | null;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Bounty {
  id: string;
  week_id: string;
  title: string;
  description: string;
  trigger_label: string;
  game: Game | null;
  prize_kes: number;
  status: BountyStatus;
  winner_name: string | null;
  winner_phone: string | null;
  claimed_at: string | null;
  paid: boolean;
  paid_at: string | null;
  activated_at: string | null;
  notes: string | null;
  rolled_over_to_week_id: string | null;
  rolled_over_from_bounty_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContentItem {
  id: string;
  week_id: string;
  scheduled_date: string;
  day_type: DayType;
  title: string;
  description: string | null;
  posted_tiktok: boolean;
  posted_instagram: boolean;
  posted_twitter: boolean;
  posted_whatsapp: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdSpendEntry {
  id: string;
  week_id: string;
  platform: AdPlatform;
  amount_kes: number;
  description: string | null;
  date: string;
  created_at?: string;
}

export interface CommunitySnapshot {
  id: string;
  week_id: string;
  snapshot_date: string;
  whatsapp_efootball: number | null;
  whatsapp_codm: number | null;
  whatsapp_pubgm: number | null;
  followers_tiktok: number | null;
  followers_instagram: number | null;
  followers_twitter: number | null;
  mechi_registered: number | null;
  notes: string | null;
  created_at?: string;
}

export interface MarketingSettings {
  singleton?: true;
  total_budget_kes: number;
  meta_budget_kes: number;
  tiktok_budget_kes: number;
  twitter_budget_kes: number;
  created_at?: string;
  updated_at?: string;
}

export interface AutoContentTemplate {
  day_type: Exclude<DayType, "wednesday_bounty_update" | "custom">;
  day_offset: number;
  titlePrefix: string;
  description: string;
}

export interface BountySeed {
  title: string;
  description: string;
  trigger_label: string;
  game: Game | null;
  prize_kes: number;
}

export interface NavigationWeek {
  id: string;
  week_number: number;
  game: Game;
  label: string;
  href: string | null;
  disabled?: boolean;
}

export interface OverviewStats {
  totalPrizePaid: number;
  totalPrizePending: number;
  totalAdSpend: number;
  activeBounties: number;
}

export interface PayoutRow {
  id: string;
  source_id: string;
  source_type: "tournament" | "bounty";
  placement?: "first" | "second";
  date: string;
  type: "Tournament" | "Bounty";
  game: Game | null;
  winner: string;
  amount_kes: number;
  phone: string | null;
  paid: boolean;
}

export interface OverviewData {
  seeded: boolean;
  weeks: CampaignWeek[];
  currentWeek: CampaignWeek | null;
  currentTournament: Tournament | null;
  currentWeekActiveBounties: Bounty[];
  currentWeekContent: ContentItem[];
  stats: OverviewStats;
  payoutRows: PayoutRow[];
  progress: {
    daysElapsed: number;
    totalDays: number;
    daysRemaining: number;
    percentage: number;
    dateRangeLabel: string;
  };
}

export interface WeekDetailData {
  week: CampaignWeek;
  tournament: Tournament | null;
  bounties: Bounty[];
  contentItems: ContentItem[];
  adSpendEntries: AdSpendEntry[];
  settings: MarketingSettings;
}

export interface TournamentsPageData {
  weeks: CampaignWeek[];
  tournaments: Tournament[];
}

export interface BountiesPageData {
  weeks: CampaignWeek[];
  bounties: Bounty[];
}

export interface ContentPageData {
  weeks: CampaignWeek[];
  items: ContentItem[];
}

export interface AdsPageData {
  weeks: CampaignWeek[];
  entries: AdSpendEntry[];
  settings: MarketingSettings;
}

export interface CommunityPageData {
  weeks: CampaignWeek[];
  snapshots: CommunitySnapshot[];
}
