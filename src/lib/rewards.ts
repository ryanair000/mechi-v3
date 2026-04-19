import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { getNairobiDateStamp } from '@/lib/gamification';
import { createServiceClient } from '@/lib/supabase';
import type { Profile } from '@/types';

type SupabaseClient = ReturnType<typeof createServiceClient>;

type RewardEventRpcResult = {
  inserted: boolean;
  available: number;
  pending: number;
  lifetime: number;
};

export type RewardCodeType = 'discount_code' | 'reward_claim';

export type RewardCatalogItem = {
  id: string;
  title: string;
  description: string;
  reward_type: RewardCodeType;
  points_cost: number;
  phase: string;
  active: boolean;
  expires_in_hours?: number | null;
  discount_amount_kes?: number | null;
  max_order_coverage_percent?: number | null;
  sku_name?: string | null;
  margin_class?: string | null;
};

export type RewardRedemptionRow = {
  id: string;
  reward_id: string;
  reward_type: RewardCodeType;
  title: string;
  code: string | null;
  points_cost: number;
  external_issuance_id: string | null;
  status: 'issued' | 'claimed' | 'void' | 'reversed' | 'expired';
  expires_at: string | null;
  chezahub_order_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type RewardSummary = {
  linked: boolean;
  chezahub_user_id: string | null;
  chezahub_linked_at: string | null;
  balances: {
    available: number;
    pending: number;
    lifetime: number;
  };
  referrals: {
    invited: number;
    qualified: number;
    completed: number;
    flagged: number;
  };
  recent_activity: Array<{
    id: string;
    event_type: string;
    title: string;
    available_delta: number;
    pending_delta: number;
    created_at: string;
  }>;
  active_codes: RewardRedemptionRow[];
};

export type ChezahubLinkTokenPayload = {
  mechi_user_id: string;
  username: string;
  invite_code: string | null;
  return_url: string;
  issued_at: number;
  expires_at: number;
  nonce: string;
};

export type ChezahubOrderEventPayload = {
  order_id: string;
  status: 'paid' | 'completed' | 'cancelled' | 'expired' | 'refunded' | 'abuse_review';
  chezahub_user_id: string | null;
  mechi_user_id: string | null;
  order_total_kes: number;
  customer_email?: string | null;
  customer_phone?: string | null;
  applied_discount_code?: string | null;
  reward_issuance_id?: string | null;
  reward_code?: string | null;
  reward_catalog_id?: string | null;
  occurred_at?: string | null;
  idempotency_key?: string | null;
};

type RewardProfileFields = Pick<
  Profile,
  | 'id'
  | 'username'
  | 'phone'
  | 'email'
  | 'invite_code'
  | 'invited_by'
  | 'country'
  | 'region'
  | 'selected_games'
  | 'game_ids'
  | 'avatar_url'
  | 'cover_url'
> & {
  reward_points_available?: number | null;
  reward_points_pending?: number | null;
  reward_points_lifetime?: number | null;
  chezahub_user_id?: string | null;
  chezahub_linked_at?: string | null;
};

const DEFAULT_CHEZAHUB_BASE_URL = 'https://chezahub.co.ke';
const DEFAULT_CHEZAHUB_REDEEM_URL = 'https://redeem.chezahub.co.ke';
const DEFAULT_LINK_TOKEN_TTL_MS = 1000 * 60 * 15;

export const REWARD_RULES = {
  accountLink: 200,
  profileCompletion: 200,
  firstMatchOfDay: 30,
  streak3Daily: 75,
  streak5Weekly: 150,
  shareActionDaily: 25,
  inviteeStarter: 500,
  inviterMain: 3000,
  linkedFirstPaidOrder: 250,
  qualifiedReferralMinimumKes: 2000,
  maxOrderCoveragePercent: 25,
} as const;

export const REWARD_WAYS_TO_EARN = [
  {
    id: 'account_link',
    title: 'Link ChezaHub once',
    description: `+${REWARD_RULES.accountLink} RP when your ChezaHub account is linked.`,
  },
  {
    id: 'profile_completion',
    title: 'Complete your profile',
    description: `+${REWARD_RULES.profileCompletion} RP when your profile is fully set up.`,
  },
  {
    id: 'first_match_of_day',
    title: 'Play your first match of the day',
    description: `+${REWARD_RULES.firstMatchOfDay} RP once per day.`,
  },
  {
    id: 'streak_three',
    title: 'Hit a 3-win streak',
    description: `+${REWARD_RULES.streak3Daily} RP once per day when your streak reaches 3 or more.`,
  },
  {
    id: 'streak_five',
    title: 'Hit a 5-win streak',
    description: `+${REWARD_RULES.streak5Weekly} RP once per week when your streak reaches 5 or more.`,
  },
  {
    id: 'share_page_action',
    title: 'Share from your Share page',
    description: `+${REWARD_RULES.shareActionDaily} RP once per day for a verified share action.`,
  },
  {
    id: 'invitee_starter',
    title: 'Be an invited player and play your first match',
    description: `+${REWARD_RULES.inviteeStarter} RP after you link ChezaHub and finish your first Mechi match.`,
  },
  {
    id: 'referral_main',
    title: 'Refer a buyer who completes a first order',
    description: `+${REWARD_RULES.inviterMain} RP after your invitee completes a paid ChezaHub order of at least KES ${REWARD_RULES.qualifiedReferralMinimumKes.toLocaleString()}.`,
  },
] as const;

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(',')}}`;
}

export function getChezahubBaseUrl() {
  return process.env.CHEZAHUB_BASE_URL || DEFAULT_CHEZAHUB_BASE_URL;
}

export function getChezahubRedeemBaseUrl() {
  return (
    process.env.CHEZAHUB_REDEEM_URL ||
    process.env.NEXT_PUBLIC_CHEZAHUB_REDEEM_URL ||
    DEFAULT_CHEZAHUB_REDEEM_URL
  );
}

export function getRewardSharedSecret() {
  return (
    process.env.MECHI_CHEZAHUB_SHARED_SECRET ||
    process.env.CHEZAHUB_SHARED_SECRET ||
    process.env.INTERNAL_ACTION_SECRET ||
    ''
  );
}

function createHexHmac(value: string, secret = getRewardSharedSecret()) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createChezahubLinkToken(payload: Omit<ChezahubLinkTokenPayload, 'issued_at' | 'expires_at' | 'nonce'>) {
  const issuedAt = Date.now();
  const fullPayload: ChezahubLinkTokenPayload = {
    ...payload,
    issued_at: issuedAt,
    expires_at: issuedAt + DEFAULT_LINK_TOKEN_TTL_MS,
    nonce: randomUUID(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = createHexHmac(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyChezahubLinkToken(token: string | null | undefined): ChezahubLinkTokenPayload | null {
  if (!token || !getRewardSharedSecret()) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHexHmac(encodedPayload);
  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as ChezahubLinkTokenPayload;
    if (!payload.mechi_user_id || !payload.return_url) {
      return null;
    }
    if (payload.expires_at < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createSignedActionHeaders(payload: unknown) {
  const secret = getRewardSharedSecret();
  if (!secret) {
    throw new Error('Reward integration secret is not configured');
  }

  const timestamp = Date.now().toString();
  return {
    'X-Internal-Action-Timestamp': timestamp,
    'X-Internal-Action-Signature': createHexHmac(`${timestamp}.${stableStringify(payload)}`, secret),
  };
}

export function hasValidSignedAction(
  request: NextRequest,
  payload: unknown,
  { maxAgeMs = 10 * 60 * 1000 }: { maxAgeMs?: number } = {}
) {
  const secret = getRewardSharedSecret();
  const timestamp = request.headers.get('x-internal-action-timestamp');
  const signature = request.headers.get('x-internal-action-signature');

  if (!secret || !timestamp || !signature) {
    return false;
  }

  const timestampValue = Number(timestamp);
  if (!Number.isFinite(timestampValue)) {
    return false;
  }

  if (Math.abs(Date.now() - timestampValue) > maxAgeMs) {
    return false;
  }

  const expected = createHexHmac(`${timestamp}.${stableStringify(payload)}`, secret);
  return safeCompare(signature, expected);
}

export async function applyRewardEvent(
  supabase: SupabaseClient,
  params: {
    userId: string;
    eventKey: string;
    eventType: string;
    availableDelta: number;
    pendingDelta?: number;
    lifetimeDelta?: number;
    source?: string | null;
    relatedUserId?: string | null;
    relatedMatchId?: string | null;
    relatedOrderId?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  const { data, error } = await supabase.rpc('apply_reward_event', {
    p_user_id: params.userId,
    p_event_key: params.eventKey,
    p_event_type: params.eventType,
    p_available_delta: params.availableDelta,
    p_pending_delta: params.pendingDelta ?? 0,
    p_lifetime_delta: params.lifetimeDelta ?? 0,
    p_source: params.source ?? null,
    p_related_user_id: params.relatedUserId ?? null,
    p_related_match_id: params.relatedMatchId ?? null,
    p_related_order_id: params.relatedOrderId ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    throw error;
  }

  return (data ?? null) as RewardEventRpcResult | null;
}

export async function rewardEventExists(supabase: SupabaseClient, eventKey: string) {
  const { data } = await supabase
    .from('reward_events')
    .select('id')
    .eq('event_key', eventKey)
    .maybeSingle();

  return Boolean(data);
}

export function isProfileCompleteForRewards(profile: RewardProfileFields) {
  const selectedGames = Array.isArray(profile.selected_games) ? profile.selected_games : [];
  const gameIds = profile.game_ids && typeof profile.game_ids === 'object' ? profile.game_ids : {};
  const hasGameIds = Object.keys(gameIds as Record<string, string>).length > 0;

  return Boolean(
    profile.username?.trim() &&
      profile.phone?.trim() &&
      profile.email?.trim() &&
      profile.country &&
      profile.region?.trim() &&
      selectedGames.length > 0 &&
      hasGameIds
  );
}

export async function maybeAwardProfileCompletion(
  supabase: SupabaseClient,
  profile: RewardProfileFields
) {
  if (!isProfileCompleteForRewards(profile)) {
    return null;
  }

  return applyRewardEvent(supabase, {
    userId: profile.id,
    eventKey: `reward:profile-complete:${profile.id}`,
    eventType: 'profile_completion',
    availableDelta: REWARD_RULES.profileCompletion,
    lifetimeDelta: REWARD_RULES.profileCompletion,
    source: 'mechi_profile',
    metadata: {
      selected_games: Array.isArray(profile.selected_games) ? profile.selected_games.length : 0,
    },
  });
}

export async function addRewardReviewQueueItem(
  supabase: SupabaseClient,
  params: {
    userId?: string | null;
    reason: string;
    dedupeKey?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  const dedupeKey = params.dedupeKey?.trim() ? params.dedupeKey.trim() : null;

  if (dedupeKey) {
    const { data: existingItem } = await supabase
      .from('reward_review_queue')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .in('status', ['open', 'reviewing'])
      .maybeSingle();

    if (existingItem?.id) {
      return existingItem.id;
    }
  }

  const { error } = await supabase.from('reward_review_queue').insert({
    user_id: params.userId ?? null,
    reason: params.reason,
    dedupe_key: dedupeKey,
    metadata: params.metadata ?? {},
  });

  if (error && error.code !== '23505') {
    throw error;
  }

  return null;
}

function getIsoWeekStamp(dayStamp: string) {
  const date = new Date(`${dayStamp}T00:00:00+03:00`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function processMatchRewardMilestones(
  supabase: SupabaseClient,
  params: {
    matchId: string;
    matchDate: string;
    winner: {
      id: string;
      totalMatchesBefore: number;
      firstMatchToday: boolean;
      newStreak: number;
      invitedBy: string | null;
      chezahubUserId: string | null;
    };
    loser: {
      id: string;
      totalMatchesBefore: number;
      firstMatchToday: boolean;
      invitedBy: string | null;
      chezahubUserId: string | null;
    };
  }
) {
  const weekStamp = getIsoWeekStamp(params.matchDate);
  const operations: Promise<unknown>[] = [];

  if (params.winner.firstMatchToday) {
    operations.push(
      applyRewardEvent(supabase, {
        userId: params.winner.id,
        eventKey: `reward:first-match-day:${params.winner.id}:${params.matchDate}`,
        eventType: 'match_first_of_day',
        availableDelta: REWARD_RULES.firstMatchOfDay,
        lifetimeDelta: REWARD_RULES.firstMatchOfDay,
        source: 'mechi_match',
        relatedMatchId: params.matchId,
        metadata: { stamp: params.matchDate },
      })
    );
  }

  if (params.loser.firstMatchToday) {
    operations.push(
      applyRewardEvent(supabase, {
        userId: params.loser.id,
        eventKey: `reward:first-match-day:${params.loser.id}:${params.matchDate}`,
        eventType: 'match_first_of_day',
        availableDelta: REWARD_RULES.firstMatchOfDay,
        lifetimeDelta: REWARD_RULES.firstMatchOfDay,
        source: 'mechi_match',
        relatedMatchId: params.matchId,
        metadata: { stamp: params.matchDate },
      })
    );
  }

  if (params.winner.newStreak >= 3) {
    operations.push(
      applyRewardEvent(supabase, {
        userId: params.winner.id,
        eventKey: `reward:streak-three:${params.winner.id}:${params.matchDate}`,
        eventType: 'streak_three_daily',
        availableDelta: REWARD_RULES.streak3Daily,
        lifetimeDelta: REWARD_RULES.streak3Daily,
        source: 'mechi_match',
        relatedMatchId: params.matchId,
        metadata: { streak: params.winner.newStreak, stamp: params.matchDate },
      })
    );
  }

  if (params.winner.newStreak >= 5) {
    operations.push(
      applyRewardEvent(supabase, {
        userId: params.winner.id,
        eventKey: `reward:streak-five:${params.winner.id}:${weekStamp}`,
        eventType: 'streak_five_weekly',
        availableDelta: REWARD_RULES.streak5Weekly,
        lifetimeDelta: REWARD_RULES.streak5Weekly,
        source: 'mechi_match',
        relatedMatchId: params.matchId,
        metadata: { streak: params.winner.newStreak, week: weekStamp },
      })
    );
  }

  if (
    params.winner.totalMatchesBefore === 0 &&
    params.winner.invitedBy &&
    params.winner.chezahubUserId
  ) {
    operations.push(
      applyRewardEvent(supabase, {
        userId: params.winner.id,
        eventKey: `reward:invitee-starter:${params.winner.id}`,
        eventType: 'invitee_starter',
        availableDelta: REWARD_RULES.inviteeStarter,
        lifetimeDelta: REWARD_RULES.inviteeStarter,
        source: 'mechi_match',
        relatedMatchId: params.matchId,
        relatedUserId: params.winner.invitedBy,
      })
    );
  }

  if (
    params.loser.totalMatchesBefore === 0 &&
    params.loser.invitedBy &&
    params.loser.chezahubUserId
  ) {
    operations.push(
      applyRewardEvent(supabase, {
        userId: params.loser.id,
        eventKey: `reward:invitee-starter:${params.loser.id}`,
        eventType: 'invitee_starter',
        availableDelta: REWARD_RULES.inviteeStarter,
        lifetimeDelta: REWARD_RULES.inviteeStarter,
        source: 'mechi_match',
        relatedMatchId: params.matchId,
        relatedUserId: params.loser.invitedBy,
      })
    );
  }

  await Promise.allSettled(operations);
}

function getRewardEventTitle(eventType: string, availableDelta: number, pendingDelta: number) {
  const delta = availableDelta !== 0 ? availableDelta : pendingDelta;

  switch (eventType) {
    case 'account_link':
      return 'ChezaHub linked';
    case 'profile_completion':
      return 'Profile completed';
    case 'match_first_of_day':
      return 'First match of the day';
    case 'streak_three_daily':
      return '3-win streak';
    case 'streak_five_weekly':
      return '5-win streak';
    case 'share_page_action':
      return 'Share page action';
    case 'invitee_starter':
      return 'Invitee starter bonus';
    case 'referral_main_pending':
      return 'Referral reward pending';
    case 'referral_main_vested':
      return 'Referral reward vested';
    case 'chezahub_first_paid_order':
      return 'First ChezaHub order';
    case 'reward_redemption_spend':
      return delta < 0 ? 'Reward redeemed' : 'Reward adjustment';
    case 'reward_redemption_reversal':
      return 'Reward points restored';
    default:
      return eventType.replace(/_/g, ' ');
  }
}

export async function getRewardSummaryForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<RewardSummary> {
  const { data: profileRaw, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, username, phone, email, invite_code, invited_by, country, region, selected_games, game_ids, avatar_url, cover_url, reward_points_available, reward_points_pending, reward_points_lifetime, chezahub_user_id, chezahub_linked_at'
    )
    .eq('id', userId)
    .single();

  if (profileError || !profileRaw) {
    throw profileError ?? new Error('Profile not found');
  }

  const profile = profileRaw as RewardProfileFields;
  await maybeAwardProfileCompletion(supabase, profile);

  const [referralsResult, recentEventsResult, activeCodesResult, refreshedProfileResult] = await Promise.all([
    supabase
      .from('referral_conversions')
      .select('status', { count: 'exact' })
      .eq('inviter_user_id', userId),
    supabase
      .from('reward_events')
      .select('id, event_type, available_delta, pending_delta, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('reward_redemptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['issued', 'claimed'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('profiles')
      .select('reward_points_available, reward_points_pending, reward_points_lifetime, chezahub_user_id, chezahub_linked_at')
      .eq('id', userId)
      .single(),
  ]);

  const referralRows =
    ((referralsResult.data as Array<{ status: string }> | null) ?? []).filter(Boolean);
  const recentRows =
    ((recentEventsResult.data as Array<{
      id: string;
      event_type: string;
      available_delta: number;
      pending_delta: number;
      created_at: string;
    }> | null) ?? []);
  const activeCodes =
    ((activeCodesResult.data as RewardRedemptionRow[] | null) ?? []);
  const refreshedProfile =
    (refreshedProfileResult.data as {
      reward_points_available?: number | null;
      reward_points_pending?: number | null;
      reward_points_lifetime?: number | null;
      chezahub_user_id?: string | null;
      chezahub_linked_at?: string | null;
    } | null) ?? {};

  return {
    linked: Boolean(refreshedProfile.chezahub_user_id),
    chezahub_user_id: refreshedProfile.chezahub_user_id ?? null,
    chezahub_linked_at: refreshedProfile.chezahub_linked_at ?? null,
    balances: {
      available: refreshedProfile.reward_points_available ?? 0,
      pending: refreshedProfile.reward_points_pending ?? 0,
      lifetime: refreshedProfile.reward_points_lifetime ?? 0,
    },
    referrals: {
      invited: referralRows.length,
      qualified: referralRows.filter((row) => row.status === 'qualified').length,
      completed: referralRows.filter((row) => row.status === 'completed').length,
      flagged: referralRows.filter((row) => row.status === 'flagged').length,
    },
    recent_activity: recentRows.map((event) => ({
      id: event.id,
      event_type: event.event_type,
      title: getRewardEventTitle(event.event_type, event.available_delta, event.pending_delta),
      available_delta: event.available_delta,
      pending_delta: event.pending_delta,
      created_at: event.created_at,
    })),
    active_codes: activeCodes,
  };
}

export async function fetchChezahubRewardCatalog() {
  const payload = { scope: 'reward_catalog' };
  const response = await fetch(`${getChezahubBaseUrl()}/api/mechi/rewards/catalog`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSignedActionHeaders(payload),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => null)) as
    | { items?: RewardCatalogItem[]; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load reward catalog');
  }

  return data?.items ?? [];
}

export async function issueChezahubRewardCode(params: {
  mechiUserId: string;
  chezahubUserId: string;
  rewardId: string;
  rewardType: RewardCodeType;
}) {
  const payload = {
    mechi_user_id: params.mechiUserId,
    chezahub_user_id: params.chezahubUserId,
    reward_id: params.rewardId,
    reward_type: params.rewardType,
  };

  const response = await fetch(`${getChezahubBaseUrl()}/api/mechi/rewards/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSignedActionHeaders(payload),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => null)) as
    | {
        error?: string;
        issuance_id?: string;
        code?: string;
        expires_at?: string | null;
        title?: string;
      }
    | null;

  if (!response.ok || !data?.issuance_id || !data.code) {
    throw new Error(data?.error || 'Failed to issue reward code');
  }

  return {
    issuanceId: data.issuance_id,
    code: data.code,
    expiresAt: data.expires_at ?? null,
    title: data.title ?? '',
  };
}

export async function voidChezahubRewardCode(issuanceId: string) {
  const payload = { issuance_id: issuanceId };

  await fetch(`${getChezahubBaseUrl()}/api/mechi/rewards/void`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSignedActionHeaders(payload),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  }).catch(() => null);
}

function normalizeComparableValue(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
}

function looksLikeSelfReferral(
  inviter: { phone?: string | null; email?: string | null },
  orderEvent: ChezahubOrderEventPayload
) {
  const inviterPhone = normalizeComparableValue(inviter.phone);
  const inviterEmail = normalizeComparableValue(inviter.email);
  const eventPhone = normalizeComparableValue(orderEvent.customer_phone);
  const eventEmail = normalizeComparableValue(orderEvent.customer_email);

  return Boolean(
    (inviterPhone && eventPhone && inviterPhone === eventPhone) ||
      (inviterEmail && eventEmail && inviterEmail === eventEmail)
  );
}

export async function handleChezahubOrderEvent(
  supabase: SupabaseClient,
  event: ChezahubOrderEventPayload
) {
  if (!event.mechi_user_id || !event.chezahub_user_id) {
    return { ignored: true, reason: 'missing_link_identity' };
  }

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('id, invited_by, phone, email, chezahub_user_id')
    .eq('id', event.mechi_user_id)
    .eq('chezahub_user_id', event.chezahub_user_id)
    .maybeSingle();

  const profile = profileRaw as {
    id: string;
    invited_by: string | null;
    phone?: string | null;
    email?: string | null;
    chezahub_user_id?: string | null;
  } | null;

  if (!profile) {
    return { ignored: true, reason: 'profile_not_linked' };
  }

  if (event.status === 'paid' && event.order_total_kes > 0) {
    const { data: firstPaidRewardRow } = await supabase
      .from('reward_events')
      .select('id')
      .eq('user_id', profile.id)
      .eq('event_type', 'chezahub_first_paid_order')
      .limit(1)
      .maybeSingle();

    if (!firstPaidRewardRow) {
      await applyRewardEvent(supabase, {
        userId: profile.id,
        eventKey: `reward:chezahub-first-paid:${profile.id}`,
        eventType: 'chezahub_first_paid_order',
        availableDelta: REWARD_RULES.linkedFirstPaidOrder,
        lifetimeDelta: REWARD_RULES.linkedFirstPaidOrder,
        source: 'chezahub_order',
        relatedOrderId: event.order_id,
        metadata: {
          total_kes: event.order_total_kes,
        },
      }).catch(() => null);
    }
  }

  if (
    profile.invited_by &&
    event.order_total_kes >= REWARD_RULES.qualifiedReferralMinimumKes &&
    (event.status === 'paid' || event.status === 'completed')
  ) {
    const { data: existingConversionRaw } = await supabase
      .from('referral_conversions')
      .select('id, first_order_id, status, inviter_user_id')
      .eq('invitee_user_id', profile.id)
      .maybeSingle();

    const existingConversion = existingConversionRaw as {
      id: string;
      first_order_id: string | null;
      status: string;
      inviter_user_id: string;
    } | null;

    if (existingConversion?.first_order_id && existingConversion.first_order_id !== event.order_id) {
      return { ignored: false, reason: 'referral_already_qualified' };
    }

    const { data: inviterRaw } = await supabase
      .from('profiles')
      .select('id, phone, email')
      .eq('id', profile.invited_by)
      .maybeSingle();

    const inviter = inviterRaw as { id: string; phone?: string | null; email?: string | null } | null;

    if (inviter && looksLikeSelfReferral(inviter, event)) {
      await supabase.from('referral_conversions').upsert({
        inviter_user_id: inviter.id,
        invitee_user_id: profile.id,
        chezahub_user_id: event.chezahub_user_id,
        first_order_id: event.order_id,
        order_total_kes: event.order_total_kes,
        status: 'flagged',
        suspicious_reason: 'matching_contact_details',
        metadata: {
          customer_email: event.customer_email ?? null,
          customer_phone: event.customer_phone ?? null,
        },
      }, {
        onConflict: 'invitee_user_id',
      });

      await addRewardReviewQueueItem(supabase, {
        userId: profile.id,
        reason: 'matching_contact_details',
        dedupeKey: `reward-review:matching-contact:${profile.id}:${event.order_id}`,
        metadata: {
          inviter_user_id: inviter.id,
          order_id: event.order_id,
        },
      });
    } else if (inviter) {
      await supabase.from('referral_conversions').upsert({
        inviter_user_id: inviter.id,
        invitee_user_id: profile.id,
        chezahub_user_id: event.chezahub_user_id,
        first_order_id: event.order_id,
        order_total_kes: event.order_total_kes,
        status: event.status === 'completed' ? 'completed' : 'qualified',
        qualified_at: new Date().toISOString(),
        ...(event.status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        metadata: {
          customer_email: event.customer_email ?? null,
          customer_phone: event.customer_phone ?? null,
        },
      }, {
        onConflict: 'invitee_user_id',
      });

      if (event.status === 'paid') {
        const pendingEventKey = `reward:referral-main-pending:${profile.id}:${event.order_id}`;
        const pendingExists = await rewardEventExists(supabase, pendingEventKey);

        if (!pendingExists) {
          await applyRewardEvent(supabase, {
            userId: inviter.id,
            eventKey: pendingEventKey,
            eventType: 'referral_main_pending',
            availableDelta: 0,
            pendingDelta: REWARD_RULES.inviterMain,
            source: 'chezahub_order',
            relatedUserId: profile.id,
            relatedOrderId: event.order_id,
            metadata: {
              invitee_user_id: profile.id,
              order_total_kes: event.order_total_kes,
            },
          }).catch(() => null);
        }
      }

      if (event.status === 'completed') {
        const pendingEventKey = `reward:referral-main-pending:${profile.id}:${event.order_id}`;
        const pendingExists = await rewardEventExists(supabase, pendingEventKey);

        await applyRewardEvent(supabase, {
          userId: inviter.id,
          eventKey: `reward:referral-main-vested:${profile.id}:${event.order_id}`,
          eventType: 'referral_main_vested',
          availableDelta: REWARD_RULES.inviterMain,
          pendingDelta: pendingExists ? -REWARD_RULES.inviterMain : 0,
          lifetimeDelta: REWARD_RULES.inviterMain,
          source: 'chezahub_order',
          relatedUserId: profile.id,
          relatedOrderId: event.order_id,
        }).catch(() => null);
      }
    }
  }

  if (
    event.status === 'cancelled' ||
    event.status === 'expired' ||
    event.status === 'refunded' ||
    event.status === 'abuse_review'
  ) {
    const { data: firstPaidRewardRow } = await supabase
      .from('reward_events')
      .select('id')
      .eq('user_id', profile.id)
      .eq('event_type', 'chezahub_first_paid_order')
      .eq('related_order_id', event.order_id)
      .limit(1)
      .maybeSingle();

    if (firstPaidRewardRow) {
      await applyRewardEvent(supabase, {
        userId: profile.id,
        eventKey: `reward:chezahub-first-paid-reversal:${profile.id}:${event.order_id}`,
        eventType: 'chezahub_first_paid_order_reversal',
        availableDelta: -REWARD_RULES.linkedFirstPaidOrder,
        lifetimeDelta: -REWARD_RULES.linkedFirstPaidOrder,
        source: 'chezahub_order',
        relatedOrderId: event.order_id,
      }).catch(() => null);
    }

    if (profile.invited_by) {
      const { data: conversionRaw } = await supabase
        .from('referral_conversions')
        .select('inviter_user_id, first_order_id')
        .eq('invitee_user_id', profile.id)
        .maybeSingle();
      const conversion = conversionRaw as {
        inviter_user_id: string;
        first_order_id: string | null;
      } | null;

      if (
        conversion &&
        conversion.first_order_id === event.order_id &&
        await rewardEventExists(supabase, `reward:referral-main-pending:${profile.id}:${event.order_id}`)
      ) {
        await applyRewardEvent(supabase, {
          userId: conversion.inviter_user_id,
          eventKey: `reward:referral-main-pending-reversal:${profile.id}:${event.order_id}`,
          eventType: 'referral_main_pending_reversal',
          availableDelta: 0,
          pendingDelta: -REWARD_RULES.inviterMain,
          source: 'chezahub_order',
          relatedUserId: profile.id,
          relatedOrderId: event.order_id,
        }).catch(() => null);
      }

      if (
        conversion &&
        conversion.first_order_id === event.order_id &&
        await rewardEventExists(supabase, `reward:referral-main-vested:${profile.id}:${event.order_id}`)
      ) {
        await applyRewardEvent(supabase, {
          userId: conversion.inviter_user_id,
          eventKey: `reward:referral-main-vested-reversal:${profile.id}:${event.order_id}`,
          eventType: 'referral_main_vested_reversal',
          availableDelta: -REWARD_RULES.inviterMain,
          lifetimeDelta: -REWARD_RULES.inviterMain,
          source: 'chezahub_order',
          relatedUserId: profile.id,
          relatedOrderId: event.order_id,
        }).catch(() => null);
      }

      await supabase
        .from('referral_conversions')
        .update({
          status: event.status === 'abuse_review' ? 'flagged' : 'reversed',
          suspicious_reason: event.status === 'abuse_review' ? 'abuse_review' : null,
          reversed_at: new Date().toISOString(),
        })
        .eq('invitee_user_id', profile.id)
        .eq('first_order_id', event.order_id);
    }

    const redemptionQuery = event.reward_issuance_id
      ? supabase
          .from('reward_redemptions')
          .select('id, user_id, points_cost, status')
          .eq('external_issuance_id', event.reward_issuance_id)
          .maybeSingle()
      : event.reward_code
        ? supabase
            .from('reward_redemptions')
            .select('id, user_id, points_cost, status')
            .eq('code', event.reward_code)
            .maybeSingle()
        : null;

    if (redemptionQuery) {
      const { data: redemptionRaw } = await redemptionQuery;
      const redemption = redemptionRaw as {
        id: string;
        user_id: string;
        points_cost: number;
        status: string;
      } | null;

      if (redemption && redemption.status !== 'reversed') {
        await applyRewardEvent(supabase, {
          userId: redemption.user_id,
          eventKey: `reward:redemption-reversal:${redemption.id}:${event.status}`,
          eventType: 'reward_redemption_reversal',
          availableDelta: redemption.points_cost,
          source: 'chezahub_order',
          relatedOrderId: event.order_id,
          metadata: {
            status: event.status,
          },
        }).catch(() => null);

        await supabase
          .from('reward_redemptions')
          .update({
            status: 'reversed',
            chezahub_order_id: event.order_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', redemption.id);
      }
    }
  }

  if (event.status === 'abuse_review') {
    await addRewardReviewQueueItem(supabase, {
      userId: profile.id,
      reason: 'chezahub_abuse_review',
      dedupeKey: `reward-review:abuse:${profile.id}:${event.order_id}`,
      metadata: {
        order_id: event.order_id,
        reward_code: event.reward_code ?? null,
        reward_issuance_id: event.reward_issuance_id ?? null,
        order_total_kes: event.order_total_kes,
        customer_email: event.customer_email ?? null,
        customer_phone: event.customer_phone ?? null,
      },
    });
  }

  if (
    event.status === 'cancelled' ||
    event.status === 'expired' ||
    event.status === 'refunded' ||
    event.status === 'abuse_review'
  ) {
    const reversalWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentReversalCount } = await supabase
      .from('reward_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .in('event_type', ['chezahub_first_paid_order_reversal', 'reward_redemption_reversal'])
      .gte('created_at', reversalWindowStart);

    if ((recentReversalCount ?? 0) >= 2) {
      await addRewardReviewQueueItem(supabase, {
        userId: profile.id,
        reason: 'repeat_reward_reversals',
        dedupeKey: `reward-review:repeat-reversals:${profile.id}`,
        metadata: {
          recent_reversal_count: recentReversalCount ?? 0,
          last_order_id: event.order_id,
          window_days: 30,
        },
      });
    }
  }

  if (
    (event.status === 'paid' || event.status === 'completed') &&
    (event.reward_issuance_id || event.reward_code)
  ) {
    let query = supabase
      .from('reward_redemptions')
      .select('id')
      .limit(1);

    if (event.reward_issuance_id) {
      query = query.eq('external_issuance_id', event.reward_issuance_id);
    } else if (event.reward_code) {
      query = query.eq('code', event.reward_code);
    }

    const { data: redemptionRaw } = await query.maybeSingle();
    const redemption = redemptionRaw as { id: string } | null;

    if (redemption) {
      await supabase
        .from('reward_redemptions')
        .update({
          status: 'claimed',
          chezahub_order_id: event.order_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', redemption.id);
    }
  }

  return { ignored: false };
}

export function buildChezahubLinkUrl(params: {
  mechiUserId: string;
  username: string;
  inviteCode: string | null;
  returnUrl: string;
}) {
  const token = createChezahubLinkToken({
    mechi_user_id: params.mechiUserId,
    username: params.username,
    invite_code: params.inviteCode,
    return_url: params.returnUrl,
  });
  const url = new URL(getChezahubRedeemBaseUrl());
  url.searchParams.set('mechi_link_token', token);
  url.searchParams.set('mechi_return', params.returnUrl);
  return url.toString();
}

export function hashRewardBindingValue(value: string | null | undefined) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

export function getRewardDayStamp() {
  return getNairobiDateStamp();
}
