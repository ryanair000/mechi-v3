import { randomUUID } from 'crypto';
import { tryClaimBounty } from '@/lib/bounties';
import { createNotification } from '@/lib/notifications';
import { isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import {
  applyRewardEvent,
  getWaysToEarnFromDb,
  maybeAwardProfileCompletion,
  REWARD_RULES,
} from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';
import type {
  RewardActivity,
  RewardCatalogItem,
  RewardRedemptionRequest,
  RewardSummary,
  RewardWayToEarn,
} from '@/types/rewards';

type SupabaseClient = ReturnType<typeof createServiceClient>;

type RewardProfileRow = {
  id: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  region?: string | null;
  selected_games?: string[] | null;
  game_ids?: Record<string, string> | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  invite_code?: string | null;
  invited_by?: string | null;
  reward_points_available?: number | null;
  reward_points_pending?: number | null;
  reward_points_lifetime?: number | null;
};

type RewardEventRow = {
  id: string;
  event_type: string;
  available_delta: number;
  pending_delta: number;
  created_at: string;
};

type RewardCatalogRow = {
  id: string;
  game: RewardCatalogItem['game'];
  title: string;
  reward_amount_label: string;
  cost_kes: number;
  cost_points: number;
  active: boolean;
  sort_order?: number | null;
};

type RewardRedemptionRequestRow = {
  id: string;
  catalog_id: string;
  game: RewardRedemptionRequest['game'];
  reward_amount_label: string;
  cost_kes: number;
  cost_points: number;
  mpesa_number: string;
  status: RewardRedemptionRequest['status'];
  submitted_at: string;
  processing_at?: string | null;
  completed_at?: string | null;
  rejected_at?: string | null;
  admin_note?: string | null;
};

export const REWARD_POINTS_TO_KES_DIVISOR = 10;
export const REWARD_WALLET_RATE_LABEL = '100 points = KSh 10';

const FALLBACK_WAYS_TO_EARN: RewardWayToEarn[] = [
  {
    id: 'profile_completion',
    title: 'Complete your profile',
    description: `+${REWARD_RULES.profileCompletion} RP when your profile is fully set up.`,
    rp_amount: REWARD_RULES.profileCompletion,
    category: 'general',
    frequency: 'once',
  },
  {
    id: 'first_match_of_day',
    title: 'Play your first match of the day',
    description: `+${REWARD_RULES.firstMatchOfDay} RP once per day.`,
    rp_amount: REWARD_RULES.firstMatchOfDay,
    category: 'match',
    frequency: 'daily',
  },
  {
    id: 'share_page_action',
    title: 'Share from your Share page',
    description: `+${REWARD_RULES.shareActionDaily} RP once per day for a verified share action.`,
    rp_amount: REWARD_RULES.shareActionDaily,
    category: 'social',
    frequency: 'daily',
  },
  {
    id: 'affiliate_invite_used',
    title: 'Get a signup through your invite code',
    description: `+${REWARD_RULES.affiliateInviteUsed} RP every time a new player finishes signup with your invite code.`,
    rp_amount: REWARD_RULES.affiliateInviteUsed,
    category: 'growth',
    frequency: 'per_event',
  },
];

export class RewardWalletError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RewardWalletError';
    this.status = status;
  }
}

export function pointsToKes(points: number) {
  return Number((points / REWARD_POINTS_TO_KES_DIVISOR).toFixed(1));
}

function getRewardEventTitle(eventType: string, availableDelta: number, pendingDelta: number) {
  const delta = availableDelta !== 0 ? availableDelta : pendingDelta;

  switch (eventType) {
    case 'profile_completion':
      return 'Profile completed';
    case 'match_first_of_day':
      return 'First match of the day';
    case 'streak_three_daily':
      return '3-win streak';
    case 'streak_five_weekly':
      return '5-win streak';
    case 'streak_ten_weekly':
      return '10-win streak';
    case 'share_page_action':
      return 'Share page action';
    case 'affiliate_invite_used':
      return 'Invite signup bonus';
    case 'invitee_starter':
      return 'Invitee starter bonus';
    case 'ranked_tier_up':
      return 'Rank tier advanced';
    case 'daily_login':
      return 'Daily login bonus';
    case 'tournament_win':
      return 'Tournament winner';
    case 'tournament_runner_up':
      return 'Tournament runner-up';
    case 'tournament_top_four':
      return 'Tournament top 4';
    case 'lobby_first_place':
      return 'Lobby first place';
    case 'reward_redemption_spend':
      return delta < 0 ? 'Redemption submitted' : 'Reward adjustment';
    case 'reward_redemption_reversal':
      return 'Reward points restored';
    default:
      return eventType.replace(/_/g, ' ');
  }
}

function toCatalogItem(row: RewardCatalogRow): RewardCatalogItem {
  return {
    id: row.id,
    game: row.game,
    title: row.title,
    reward_amount_label: row.reward_amount_label,
    cost_kes: Number(row.cost_kes) || 0,
    cost_points: Number(row.cost_points) || 0,
    active: Boolean(row.active),
    sort_order: row.sort_order ?? 0,
  };
}

function toRedemptionRequest(row: RewardRedemptionRequestRow): RewardRedemptionRequest {
  return {
    id: row.id,
    catalog_id: row.catalog_id,
    game: row.game,
    reward_amount_label: row.reward_amount_label,
    cost_kes: Number(row.cost_kes) || 0,
    cost_points: Number(row.cost_points) || 0,
    mpesa_number: row.mpesa_number,
    status: row.status,
    submitted_at: row.submitted_at,
    processing_at: row.processing_at ?? null,
    completed_at: row.completed_at ?? null,
    rejected_at: row.rejected_at ?? null,
    admin_note: row.admin_note ?? null,
  };
}

export async function getNativeRewardCatalog(
  supabase: SupabaseClient
): Promise<RewardCatalogItem[]> {
  const { data, error } = await supabase
    .from('reward_catalog')
    .select('id, game, title, reward_amount_label, cost_kes, cost_points, active, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RewardCatalogRow[]).map(toCatalogItem);
}

export async function getRewardCatalogForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ items: RewardCatalogItem[]; profilePhone: string | null }> {
  const [{ data: profileRaw, error: profileError }, items] = await Promise.all([
    supabase.from('profiles').select('phone').eq('id', userId).single(),
    getNativeRewardCatalog(supabase),
  ]);

  if (profileError || !profileRaw) {
    throw profileError ?? new Error('Profile not found');
  }

  return {
    items,
    profilePhone: typeof profileRaw.phone === 'string' ? profileRaw.phone : null,
  };
}

export async function getRewardWalletSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<RewardSummary> {
  const { data: profileRaw, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, username, phone, email, country, region, selected_games, game_ids, avatar_url, cover_url, invite_code, invited_by, reward_points_available, reward_points_pending, reward_points_lifetime'
    )
    .eq('id', userId)
    .single();

  if (profileError || !profileRaw) {
    throw profileError ?? new Error('Profile not found');
  }

  const profile = profileRaw as RewardProfileRow;
  await maybeAwardProfileCompletion(
    supabase,
    profile as Parameters<typeof maybeAwardProfileCompletion>[1]
  ).catch(() => null);

  const [balancesResult, activityResult, redemptionsResult, waysToEarnResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('reward_points_available, reward_points_pending, reward_points_lifetime')
      .eq('id', userId)
      .single(),
    supabase
      .from('reward_events')
      .select('id, event_type, available_delta, pending_delta, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('reward_redemption_requests')
      .select(
        'id, catalog_id, game, reward_amount_label, cost_kes, cost_points, mpesa_number, status, submitted_at, processing_at, completed_at, rejected_at, admin_note'
      )
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(8),
    getWaysToEarnFromDb(supabase).catch(() => FALLBACK_WAYS_TO_EARN),
  ]);

  if (balancesResult.error || !balancesResult.data) {
    throw balancesResult.error ?? new Error('Failed to refresh reward balances');
  }

  const balances = {
    points_available: Number(balancesResult.data.reward_points_available) || 0,
    pending: Number(balancesResult.data.reward_points_pending) || 0,
    lifetime: Number(balancesResult.data.reward_points_lifetime) || 0,
  };

  const recentActivity = ((activityResult.data ?? []) as RewardEventRow[]).map(
    (event): RewardActivity => ({
      id: event.id,
      event_type: event.event_type,
      title: getRewardEventTitle(event.event_type, event.available_delta, event.pending_delta),
      available_delta: Number(event.available_delta) || 0,
      pending_delta: Number(event.pending_delta) || 0,
      created_at: event.created_at,
    })
  );

  const recentRedemptions = ((redemptionsResult.data ?? []) as RewardRedemptionRequestRow[]).map(
    toRedemptionRequest
  );

  return {
    balances,
    wallet: {
      available_kes: pointsToKes(balances.points_available),
      rate_label: REWARD_WALLET_RATE_LABEL,
    },
    recent_activity: recentActivity,
    recent_redemptions: recentRedemptions,
    ways_to_earn: Array.isArray(waysToEarnResult) ? waysToEarnResult : FALLBACK_WAYS_TO_EARN,
  };
}

export async function createNativeRewardRedemptionRequest(
  supabase: SupabaseClient,
  params: {
    userId: string;
    rewardId: string;
    mpesaNumber: string;
  }
) {
  const rewardId = params.rewardId.trim();
  const normalizedMpesaNumber = normalizePhoneNumber(params.mpesaNumber, 'kenya');

  if (!rewardId) {
    throw new RewardWalletError('reward_id is required', 400);
  }

  if (!isValidPhoneNumber(normalizedMpesaNumber, 'kenya')) {
    throw new RewardWalletError('Enter a valid Kenyan M-Pesa number', 400);
  }

  const [{ data: profileRaw, error: profileError }, { data: rewardRaw, error: rewardError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, reward_points_available')
        .eq('id', params.userId)
        .single(),
      supabase
        .from('reward_catalog')
        .select('id, game, title, reward_amount_label, cost_kes, cost_points, active, sort_order')
        .eq('id', rewardId)
        .eq('active', true)
        .maybeSingle(),
    ]);

  if (profileError || !profileRaw) {
    throw new RewardWalletError('Profile not found', 404);
  }

  if (rewardError) {
    throw rewardError;
  }

  if (!rewardRaw) {
    throw new RewardWalletError('Reward not available', 404);
  }

  const profile = profileRaw as { id: string; reward_points_available?: number | null };
  const reward = toCatalogItem(rewardRaw as RewardCatalogRow);
  const availablePoints = Number(profile.reward_points_available) || 0;

  if (availablePoints < reward.cost_points) {
    throw new RewardWalletError('Not enough reward points', 400);
  }

  const requestId = randomUUID();

  let spendResult:
    | {
        inserted: boolean;
        available: number;
        pending: number;
        lifetime: number;
      }
    | null = null;

  try {
    spendResult = await applyRewardEvent(supabase, {
      userId: profile.id,
      eventKey: `reward:redemption-request:${requestId}`,
      eventType: 'reward_redemption_spend',
      availableDelta: -reward.cost_points,
      source: 'reward_redeem',
      metadata: {
        reward_id: reward.id,
        game: reward.game,
        reward_amount_label: reward.reward_amount_label,
        cost_kes: reward.cost_kes,
        cost_points: reward.cost_points,
        mpesa_number: normalizedMpesaNumber,
      },
    });
  } catch {
    throw new RewardWalletError('Failed to deduct reward points', 500);
  }

  const { count: priorRequestCount } = await supabase
    .from('reward_redemption_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profile.id);

  const { data: requestRaw, error: insertError } = await supabase
    .from('reward_redemption_requests')
    .insert({
      id: requestId,
      user_id: profile.id,
      catalog_id: reward.id,
      game: reward.game,
      reward_amount_label: reward.reward_amount_label,
      cost_kes: reward.cost_kes,
      cost_points: reward.cost_points,
      mpesa_number: normalizedMpesaNumber,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select(
      'id, catalog_id, game, reward_amount_label, cost_kes, cost_points, mpesa_number, status, submitted_at, processing_at, completed_at, rejected_at, admin_note'
    )
    .single();

  if (insertError || !requestRaw) {
    await applyRewardEvent(supabase, {
      userId: profile.id,
      eventKey: `reward:redemption-request-reversal:${requestId}`,
      eventType: 'reward_redemption_reversal',
      availableDelta: reward.cost_points,
      source: 'reward_redeem',
      metadata: {
        reason: 'request_insert_failed',
        reward_id: reward.id,
      },
    }).catch(() => null);

    throw new RewardWalletError('Failed to create redemption request', 500);
  }

  await createNotification(
    {
      user_id: profile.id,
      type: 'reward_redemption_submitted',
      title: 'Reward redemption submitted',
      body: `${reward.title} is queued for fulfillment. We will update you here in Mechi.`,
      href: '/rewards',
      metadata: {
        reward_redemption_request_id: requestId,
        catalog_id: reward.id,
        game: reward.game,
      },
    },
    supabase
  ).catch(() => null);

  if ((priorRequestCount ?? 0) === 0) {
    void tryClaimBounty(supabase, profile.id, 'first_voucher_redeem').catch(() => null);
  }

  const remainingPoints =
    spendResult && typeof spendResult.available === 'number'
      ? spendResult.available
      : availablePoints - reward.cost_points;

  return {
    request: toRedemptionRequest(requestRaw as RewardRedemptionRequestRow),
    balances: {
      points_available: remainingPoints,
      pending: spendResult?.pending ?? 0,
      lifetime: spendResult?.lifetime ?? 0,
    },
    wallet: {
      available_kes: pointsToKes(remainingPoints),
      rate_label: REWARD_WALLET_RATE_LABEL,
    },
  };
}
