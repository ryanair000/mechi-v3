import { CAMPAIGN_TOTAL_DAYS, CAMPAIGN_WEEKS, DEFAULT_SETTINGS } from "@/lib/constants";
import { formatDateRange } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase";
import type {
  AdSpendEntry,
  BountiesPageData,
  Bounty,
  CampaignWeek,
  CommunityPageData,
  CommunitySnapshot,
  ContentItem,
  ContentPageData,
  NavigationWeek,
  OverviewData,
  PayoutRow,
  MarketingSettings,
  Tournament,
  TournamentsPageData,
  WeekDetailData,
  AdsPageData,
} from "@/lib/types";
import { clamp, formatGameLabel, parseDate, toDateString } from "@/lib/utils";

function ensureSettings(row: Partial<MarketingSettings> | null | undefined): MarketingSettings {
  return {
    singleton: true,
    total_budget_kes: row?.total_budget_kes ?? DEFAULT_SETTINGS.total_budget_kes,
    meta_budget_kes: row?.meta_budget_kes ?? DEFAULT_SETTINGS.meta_budget_kes,
    tiktok_budget_kes: row?.tiktok_budget_kes ?? DEFAULT_SETTINGS.tiktok_budget_kes,
    twitter_budget_kes: row?.twitter_budget_kes ?? DEFAULT_SETTINGS.twitter_budget_kes,
    created_at: row?.created_at,
    updated_at: row?.updated_at,
  };
}

function toCampaignWeek(row: Record<string, unknown>): CampaignWeek {
  return {
    id: String(row.id),
    week_number: Number(row.week_number),
    week_start: String(row.week_start),
    week_end: String(row.week_end),
    tournament_game: String(row.tournament_game) as CampaignWeek["tournament_game"],
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function toTournament(row: Record<string, unknown>): Tournament {
  return {
    id: String(row.id),
    week_id: String(row.week_id),
    game: String(row.game) as Tournament["game"],
    date: String(row.date),
    prize_pool_kes: Number(row.prize_pool_kes ?? 1000),
    status: String(row.status ?? "upcoming") as Tournament["status"],
    participant_count: row.participant_count == null ? null : Number(row.participant_count),
    first_place_name: typeof row.first_place_name === "string" ? row.first_place_name : null,
    first_place_phone: typeof row.first_place_phone === "string" ? row.first_place_phone : null,
    first_place_kes: row.first_place_kes == null ? 700 : Number(row.first_place_kes),
    first_place_paid: Boolean(row.first_place_paid),
    first_place_paid_at:
      typeof row.first_place_paid_at === "string" ? row.first_place_paid_at : null,
    second_place_name: typeof row.second_place_name === "string" ? row.second_place_name : null,
    second_place_phone:
      typeof row.second_place_phone === "string" ? row.second_place_phone : null,
    second_place_kes: row.second_place_kes == null ? 300 : Number(row.second_place_kes),
    second_place_paid: Boolean(row.second_place_paid),
    second_place_paid_at:
      typeof row.second_place_paid_at === "string" ? row.second_place_paid_at : null,
    winner_screenshot_url:
      typeof row.winner_screenshot_url === "string" ? row.winner_screenshot_url : null,
    paid: Boolean(row.paid),
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function toBounty(row: Record<string, unknown>): Bounty {
  return {
    id: String(row.id),
    week_id: String(row.week_id),
    title: String(row.title),
    description: String(row.description),
    trigger_label: String(row.trigger_label),
    game: row.game ? (String(row.game) as Bounty["game"]) : null,
    prize_kes: Number(row.prize_kes),
    status: String(row.status ?? "draft") as Bounty["status"],
    winner_name: typeof row.winner_name === "string" ? row.winner_name : null,
    winner_phone: typeof row.winner_phone === "string" ? row.winner_phone : null,
    claimed_at: typeof row.claimed_at === "string" ? row.claimed_at : null,
    paid: Boolean(row.paid),
    paid_at: typeof row.paid_at === "string" ? row.paid_at : null,
    activated_at: typeof row.activated_at === "string" ? row.activated_at : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    rolled_over_to_week_id:
      typeof row.rolled_over_to_week_id === "string" ? row.rolled_over_to_week_id : null,
    rolled_over_from_bounty_id:
      typeof row.rolled_over_from_bounty_id === "string"
        ? row.rolled_over_from_bounty_id
        : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function toContentItem(row: Record<string, unknown>): ContentItem {
  return {
    id: String(row.id),
    week_id: String(row.week_id),
    scheduled_date: String(row.scheduled_date),
    day_type: String(row.day_type) as ContentItem["day_type"],
    title: String(row.title),
    description: typeof row.description === "string" ? row.description : null,
    posted_tiktok: Boolean(row.posted_tiktok),
    posted_instagram: Boolean(row.posted_instagram),
    posted_twitter: Boolean(row.posted_twitter),
    posted_whatsapp: Boolean(row.posted_whatsapp),
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function toAdSpendEntry(row: Record<string, unknown>): AdSpendEntry {
  return {
    id: String(row.id),
    week_id: String(row.week_id),
    platform: String(row.platform) as AdSpendEntry["platform"],
    amount_kes: Number(row.amount_kes),
    description: typeof row.description === "string" ? row.description : null,
    date: String(row.date),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function toCommunitySnapshot(row: Record<string, unknown>): CommunitySnapshot {
  return {
    id: String(row.id),
    week_id: String(row.week_id),
    snapshot_date: String(row.snapshot_date),
    whatsapp_efootball:
      row.whatsapp_efootball == null ? null : Number(row.whatsapp_efootball),
    whatsapp_codm: row.whatsapp_codm == null ? null : Number(row.whatsapp_codm),
    whatsapp_pubgm: row.whatsapp_pubgm == null ? null : Number(row.whatsapp_pubgm),
    followers_tiktok: row.followers_tiktok == null ? null : Number(row.followers_tiktok),
    followers_instagram:
      row.followers_instagram == null ? null : Number(row.followers_instagram),
    followers_twitter: row.followers_twitter == null ? null : Number(row.followers_twitter),
    mechi_registered: row.mechi_registered == null ? null : Number(row.mechi_registered),
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

function getTodayDateString() {
  return toDateString(new Date());
}

function resolveCurrentWeekBase(
  weeks: Array<{ week_number: number; week_start: string; week_end: string }>,
) {
  const today = getTodayDateString();
  const liveWeek = weeks.find((week) => today >= week.week_start && today <= week.week_end);
  if (liveWeek) return liveWeek.week_number;
  const nextWeek = weeks.find((week) => today < week.week_start);
  if (nextWeek) return nextWeek.week_number;
  return weeks.at(-1)?.week_number ?? 1;
}

function buildProgress(weeks: Array<{ week_start: string; week_end: string }>) {
  const firstWeek = weeks[0] ?? CAMPAIGN_WEEKS[0];
  const lastWeek = weeks.at(-1) ?? CAMPAIGN_WEEKS.at(-1)!;
  const campaignStart = parseDate(firstWeek.week_start).getTime();
  const campaignEnd = parseDate(lastWeek.week_end).getTime();
  const today = parseDate(getTodayDateString()).getTime();
  const totalDays =
    Math.round((campaignEnd - campaignStart) / 86_400_000) + 1 || CAMPAIGN_TOTAL_DAYS;
  const elapsedRaw =
    today < campaignStart
      ? 0
      : Math.floor((Math.min(today, campaignEnd) - campaignStart) / 86_400_000) + 1;
  const daysElapsed = clamp(elapsedRaw, 0, totalDays);
  const percentage = Math.round((daysElapsed / totalDays) * 100);

  return {
    daysElapsed,
    totalDays,
    daysRemaining: Math.max(totalDays - daysElapsed, 0),
    percentage,
    dateRangeLabel: formatDateRange(firstWeek.week_start, lastWeek.week_end),
  };
}

function sortByDateAsc<T extends { date?: string; created_at?: string; scheduled_date?: string }>(
  items: T[],
) {
  return [...items].sort((left, right) => {
    const leftKey = left.date ?? left.scheduled_date ?? left.created_at ?? "";
    const rightKey = right.date ?? right.scheduled_date ?? right.created_at ?? "";
    return leftKey.localeCompare(rightKey);
  });
}

function buildPayoutRows(
  tournaments: Tournament[],
  bounties: Bounty[],
): PayoutRow[] {
  const rows: PayoutRow[] = [];

  tournaments.forEach((tournament) => {
    if (tournament.first_place_name || tournament.first_place_phone) {
      rows.push({
        id: `${tournament.id}-first`,
        source_id: tournament.id,
        source_type: "tournament",
        placement: "first",
        date: tournament.first_place_paid_at ?? tournament.date,
        type: "Tournament",
        game: tournament.game,
        winner: tournament.first_place_name ?? "1st place pending",
        amount_kes: tournament.first_place_kes ?? 700,
        phone: tournament.first_place_phone,
        paid: tournament.first_place_paid,
      });
    }

    if (tournament.second_place_name || tournament.second_place_phone) {
      rows.push({
        id: `${tournament.id}-second`,
        source_id: tournament.id,
        source_type: "tournament",
        placement: "second",
        date: tournament.second_place_paid_at ?? tournament.date,
        type: "Tournament",
        game: tournament.game,
        winner: tournament.second_place_name ?? "2nd place pending",
        amount_kes: tournament.second_place_kes ?? 300,
        phone: tournament.second_place_phone,
        paid: tournament.second_place_paid,
      });
    }
  });

  bounties.forEach((bounty) => {
    if (bounty.winner_name || bounty.winner_phone || bounty.claimed_at) {
      rows.push({
        id: bounty.id,
        source_id: bounty.id,
        source_type: "bounty",
        date: bounty.paid_at ?? bounty.claimed_at ?? bounty.created_at ?? getTodayDateString(),
        type: "Bounty",
        game: bounty.game,
        winner: bounty.winner_name ?? bounty.title,
        amount_kes: bounty.prize_kes,
        phone: bounty.winner_phone,
        paid: bounty.paid,
      });
    }
  });

  return rows.sort((left, right) => right.date.localeCompare(left.date));
}

function getPrizeTotals(tournaments: Tournament[], bounties: Bounty[]) {
  const tournamentPaid = tournaments.reduce((total, tournament) => {
    const first = tournament.first_place_paid ? tournament.first_place_kes ?? 700 : 0;
    const second = tournament.second_place_paid ? tournament.second_place_kes ?? 300 : 0;
    return total + first + second;
  }, 0);

  const tournamentPending = tournaments.reduce((total, tournament) => {
    const first =
      (tournament.first_place_name || tournament.first_place_phone) && !tournament.first_place_paid
        ? tournament.first_place_kes ?? 700
        : 0;
    const second =
      (tournament.second_place_name || tournament.second_place_phone) &&
      !tournament.second_place_paid
        ? tournament.second_place_kes ?? 300
        : 0;
    return total + first + second;
  }, 0);

  const bountyPaid = bounties.reduce(
    (total, bounty) => total + (bounty.paid ? bounty.prize_kes : 0),
    0,
  );
  const bountyPending = bounties.reduce((total, bounty) => {
    if (bounty.status !== "claimed" || bounty.paid) return total;
    return total + bounty.prize_kes;
  }, 0);

  return {
    totalPrizePaid: tournamentPaid + bountyPaid,
    totalPrizePending: tournamentPending + bountyPending,
  };
}

async function queryWeeks() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("campaign_weeks").select("*").order("week_number");
  return ((data ?? []) as Record<string, unknown>[]).map(toCampaignWeek);
}

async function queryTournaments() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("tournaments").select("*").order("date");
  return ((data ?? []) as Record<string, unknown>[]).map(toTournament);
}

async function queryBounties() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("bounties").select("*").order("created_at");
  return ((data ?? []) as Record<string, unknown>[]).map(toBounty);
}

async function queryContentItems() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .order("scheduled_date")
    .order("created_at");
  return ((data ?? []) as Record<string, unknown>[]).map(toContentItem);
}

async function queryAdSpendEntries() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("ad_spend_entries").select("*").order("date");
  return ((data ?? []) as Record<string, unknown>[]).map(toAdSpendEntry);
}

async function queryCommunitySnapshots() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("community_snapshots")
    .select("*")
    .order("snapshot_date");
  return ((data ?? []) as Record<string, unknown>[]).map(toCommunitySnapshot);
}

export async function getMarketingSettings() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("marketing_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  return ensureSettings((data ?? null) as Partial<MarketingSettings> | null);
}

export async function getCampaignWeeks() {
  return queryWeeks();
}

export async function getNavigationWeeks(): Promise<{
  weeks: NavigationWeek[];
  currentWeekNumber: number;
}> {
  const weeks = await queryWeeks();
  if (weeks.length === 0) {
    return {
      weeks: CAMPAIGN_WEEKS.map((week) => ({
        id: `seed-${week.week_number}`,
        week_number: week.week_number,
        game: week.tournament_game,
        label: `Week ${week.week_number} ${formatGameLabel(week.tournament_game)}`,
        href: null,
        disabled: true,
      })),
      currentWeekNumber: resolveCurrentWeekBase(CAMPAIGN_WEEKS),
    };
  }

  return {
    weeks: weeks.map((week) => ({
      id: week.id,
      week_number: week.week_number,
      game: week.tournament_game,
      label: `Week ${week.week_number} ${formatGameLabel(week.tournament_game)}`,
      href: `/week/${week.id}`,
    })),
    currentWeekNumber: resolveCurrentWeekBase(weeks),
  };
}

export async function getOverviewData(): Promise<OverviewData> {
  const [weeks, tournaments, bounties, contentItems, adSpendEntries] = await Promise.all([
    queryWeeks(),
    queryTournaments(),
    queryBounties(),
    queryContentItems(),
    queryAdSpendEntries(),
  ]);

  const seeded = weeks.length > 0;
  const currentWeek =
    weeks.find((week) => week.week_number === resolveCurrentWeekBase(weeks)) ?? null;
  const currentTournament = currentWeek
    ? tournaments.find((tournament) => tournament.week_id === currentWeek.id) ?? null
    : null;
  const currentWeekActiveBounties = currentWeek
    ? bounties.filter(
        (bounty) => bounty.week_id === currentWeek.id && bounty.status === "active",
      )
    : [];
  const currentWeekContent = currentWeek
    ? sortByDateAsc(contentItems.filter((item) => item.week_id === currentWeek.id))
    : [];
  const prizeTotals = getPrizeTotals(tournaments, bounties);

  return {
    seeded,
    weeks,
    currentWeek,
    currentTournament,
    currentWeekActiveBounties,
    currentWeekContent,
    stats: {
      totalPrizePaid: prizeTotals.totalPrizePaid,
      totalPrizePending: prizeTotals.totalPrizePending,
      totalAdSpend: adSpendEntries.reduce((total, entry) => total + entry.amount_kes, 0),
      activeBounties: bounties.filter((bounty) => bounty.status === "active").length,
    },
    payoutRows: buildPayoutRows(tournaments, bounties).slice(0, 10),
    progress: buildProgress(seeded ? weeks : CAMPAIGN_WEEKS),
  };
}

export async function getWeekDetailData(id: string): Promise<WeekDetailData | null> {
  const supabase = createServiceClient();
  const { data: weekRaw } = await supabase
    .from("campaign_weeks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!weekRaw) return null;

  const [tournamentRaw, bountiesRaw, contentRaw, adsRaw, settings] = await Promise.all([
    supabase.from("tournaments").select("*").eq("week_id", id).maybeSingle(),
    supabase.from("bounties").select("*").eq("week_id", id).order("created_at"),
    supabase
      .from("content_items")
      .select("*")
      .eq("week_id", id)
      .order("scheduled_date")
      .order("created_at"),
    supabase.from("ad_spend_entries").select("*").eq("week_id", id).order("date"),
    getMarketingSettings(),
  ]);

  return {
    week: toCampaignWeek(weekRaw as Record<string, unknown>),
    tournament: tournamentRaw.data
      ? toTournament(tournamentRaw.data as Record<string, unknown>)
      : null,
    bounties: ((bountiesRaw.data ?? []) as Record<string, unknown>[]).map(toBounty),
    contentItems: ((contentRaw.data ?? []) as Record<string, unknown>[]).map(toContentItem),
    adSpendEntries: ((adsRaw.data ?? []) as Record<string, unknown>[]).map(toAdSpendEntry),
    settings,
  };
}

export async function getTournamentsPageData(): Promise<TournamentsPageData> {
  const [weeks, tournaments] = await Promise.all([queryWeeks(), queryTournaments()]);
  return { weeks, tournaments };
}

export async function getBountiesPageData(): Promise<BountiesPageData> {
  const [weeks, bounties] = await Promise.all([queryWeeks(), queryBounties()]);
  return { weeks, bounties };
}

export async function getContentPageData(): Promise<ContentPageData> {
  const [weeks, items] = await Promise.all([queryWeeks(), queryContentItems()]);
  return { weeks, items };
}

export async function getAdsPageData(): Promise<AdsPageData> {
  const [weeks, entries, settings] = await Promise.all([
    queryWeeks(),
    queryAdSpendEntries(),
    getMarketingSettings(),
  ]);
  return { weeks, entries, settings };
}

export async function getCommunityPageData(): Promise<CommunityPageData> {
  const [weeks, snapshots] = await Promise.all([queryWeeks(), queryCommunitySnapshots()]);
  return { weeks, snapshots };
}
