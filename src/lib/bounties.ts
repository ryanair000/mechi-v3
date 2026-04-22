import type { SupabaseClient } from '@supabase/supabase-js';

export const BOUNTY_TRIGGER_TYPES = [
  'first_match_of_day',
  'win_streak_3',
  'matches_played_5_today',
  'tournament_register',
  'tournament_match_win',
  'tournament_complete_no_forfeit',
  'profile_complete',
  'referral_converted',
  'share_action',
  'first_voucher_redeem',
  'rp_milestone_1000',
  'leaderboard_top3',
  'stream_watch_10min',
  'stream_go_live_first',
  'feed_first_clip',
  'feed_post_5_likes',
  'follow_3_players',
] as const;

export type BountyTriggerType = (typeof BOUNTY_TRIGGER_TYPES)[number];
export type BountyPrizeKes = 50 | 100 | 200;
export type BountyStatus = 'draft' | 'active' | 'claimed' | 'cancelled';
export type BountyTriggerCategory =
  | 'Match'
  | 'Tournament'
  | 'Profile'
  | 'Referral'
  | 'Share'
  | 'Redeem'
  | 'Rewards'
  | 'Leaderboard'
  | 'Stream'
  | 'Feed'
  | 'Social';

export type BountyRow = {
  id: string;
  title: string;
  description: string;
  trigger_type: BountyTriggerType;
  trigger_metadata: Record<string, unknown>;
  prize_kes: BountyPrizeKes;
  status: BountyStatus;
  winner_id: string | null;
  claimed_at: string | null;
  paid_at: string | null;
  activated_at: string | null;
  week_label: string;
  created_at: string;
  updated_at: string;
};

export type BountyWinnerPublic = {
  username: string;
  avatar_url: string | null;
} | null;

export type BountyWinnerAdmin = {
  username: string;
  avatar_url: string | null;
  phone: string | null;
} | null;

export type EnrichedBounty = BountyRow & {
  winner: BountyWinnerPublic;
  claimed_by_me: boolean;
};

export type AdminBounty = BountyRow & {
  winner: BountyWinnerAdmin;
};

export const BOUNTY_TRIGGER_META: Record<
  BountyTriggerType,
  { label: string; category: BountyTriggerCategory }
> = {
  first_match_of_day: { label: 'First match of day', category: 'Match' },
  win_streak_3: { label: '3-win streak', category: 'Match' },
  matches_played_5_today: { label: '5 matches today', category: 'Match' },
  tournament_register: { label: 'Tournament register', category: 'Tournament' },
  tournament_match_win: { label: 'Tournament match win', category: 'Tournament' },
  tournament_complete_no_forfeit: {
    label: 'Tournament complete cleanly',
    category: 'Tournament',
  },
  profile_complete: { label: 'Complete profile', category: 'Profile' },
  referral_converted: { label: 'Referral converted', category: 'Referral' },
  share_action: { label: 'Share action', category: 'Share' },
  first_voucher_redeem: { label: 'First voucher redeem', category: 'Redeem' },
  rp_milestone_1000: { label: '1,000 RP milestone', category: 'Rewards' },
  leaderboard_top3: { label: 'Reach leaderboard top 3', category: 'Leaderboard' },
  stream_watch_10min: { label: 'Watch stream for 10 min', category: 'Stream' },
  stream_go_live_first: { label: 'Go live for the first time', category: 'Stream' },
  feed_first_clip: { label: 'Post first clip', category: 'Feed' },
  feed_post_5_likes: { label: 'Get 5 likes on a feed post', category: 'Feed' },
  follow_3_players: { label: 'Follow 3 players', category: 'Social' },
};

type ClaimAttemptInsert = {
  id: string;
};

function normalizeTriggerMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function toBountyRow(row: Record<string, unknown> | null | undefined): BountyRow | null {
  if (!row?.id || !row.title || !row.description || !row.trigger_type || !row.status) {
    return null;
  }

  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    trigger_type: row.trigger_type as BountyTriggerType,
    trigger_metadata: normalizeTriggerMetadata(row.trigger_metadata),
    prize_kes: Number(row.prize_kes) as BountyPrizeKes,
    status: row.status as BountyStatus,
    winner_id: row.winner_id ? String(row.winner_id) : null,
    claimed_at: row.claimed_at ? String(row.claimed_at) : null,
    paid_at: row.paid_at ? String(row.paid_at) : null,
    activated_at: row.activated_at ? String(row.activated_at) : null,
    week_label: String(row.week_label),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function getIsoWeekLabel(date: Date) {
  const isoDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = isoDate.getUTCDay() || 7;
  isoDate.setUTCDate(isoDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(isoDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((isoDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${isoDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getWeekLabel(): string {
  const nairobiNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return getIsoWeekLabel(nairobiNow);
}

export function isBountyTriggerType(value: unknown): value is BountyTriggerType {
  return typeof value === 'string' && BOUNTY_TRIGGER_TYPES.includes(value as BountyTriggerType);
}

export function isBountyPrizeKes(value: unknown): value is BountyPrizeKes {
  return value === 50 || value === 100 || value === 200;
}

export async function tryClaimBounty(
  supabase: SupabaseClient,
  userId: string,
  triggerType: BountyTriggerType,
  triggerMetadata?: Record<string, unknown>
): Promise<{ claimed: boolean; reason?: string; bounty?: BountyRow }> {
  try {
    const { data: bountyRaw, error: bountyError } = await supabase
      .from('bounties')
      .select('*')
      .eq('trigger_type', triggerType)
      .eq('status', 'active')
      .order('activated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bountyError) {
      throw bountyError;
    }

    const bounty = toBountyRow((bountyRaw as Record<string, unknown> | null | undefined) ?? null);
    if (!bounty) {
      return { claimed: false, reason: 'no_active_bounty' };
    }

    const { data: existingAttempt, error: existingAttemptError } = await supabase
      .from('bounty_claim_attempts')
      .select('id')
      .eq('bounty_id', bounty.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingAttemptError) {
      throw existingAttemptError;
    }

    if (existingAttempt?.id) {
      return { claimed: false, reason: 'already_attempted' };
    }

    const { data: insertedAttempt, error: insertAttemptError } = await supabase
      .from('bounty_claim_attempts')
      .upsert(
        {
          bounty_id: bounty.id,
          user_id: userId,
          won: false,
        },
        {
          onConflict: 'bounty_id,user_id',
          ignoreDuplicates: true,
        }
      )
      .select('id')
      .maybeSingle();

    if (insertAttemptError) {
      throw insertAttemptError;
    }

    if (!(insertedAttempt as ClaimAttemptInsert | null)?.id) {
      return { claimed: false, reason: 'already_attempted' };
    }

    const claimedAt = new Date().toISOString();
    const { data: claimedBountyRaw, error: claimError } = await supabase
      .from('bounties')
      .update({
        status: 'claimed',
        winner_id: userId,
        claimed_at: claimedAt,
        updated_at: claimedAt,
      })
      .eq('id', bounty.id)
      .eq('status', 'active')
      .select('*')
      .maybeSingle();

    if (claimError) {
      throw claimError;
    }

    const claimedBounty = toBountyRow(
      (claimedBountyRaw as Record<string, unknown> | null | undefined) ?? null
    );

    if (!claimedBounty) {
      return { claimed: false, reason: 'already_claimed' };
    }

    const { error: wonError } = await supabase
      .from('bounty_claim_attempts')
      .update({ won: true })
      .eq('bounty_id', claimedBounty.id)
      .eq('user_id', userId);

    if (wonError) {
      throw wonError;
    }

    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: userId,
      type: 'bounty_won',
      title: 'Bounty claimed!',
      body: `You won the "${claimedBounty.title}" bounty — KES ${claimedBounty.prize_kes} will be sent to your M-Pesa within 24 hours.`,
      href: '/bounties',
      metadata: {
        bounty_id: claimedBounty.id,
        prize_kes: claimedBounty.prize_kes,
        trigger_type: claimedBounty.trigger_type,
        trigger_metadata: normalizeTriggerMetadata(triggerMetadata),
      },
    });

    if (notificationError) {
      throw notificationError;
    }

    return { claimed: true, bounty: claimedBounty };
  } catch (error) {
    console.error('[Bounties] Failed to claim bounty:', {
      error,
      triggerType,
      userId,
      triggerMetadata: normalizeTriggerMetadata(triggerMetadata),
    });
    return { claimed: false, reason: 'error' };
  }
}
