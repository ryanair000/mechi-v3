export type RewardCodeType = 'discount_code' | 'reward_claim' | 'voucher';

export interface RewardActivity {
  id: string;
  event_type: string;
  title: string;
  available_delta: number;
  pending_delta: number;
  created_at: string;
}

export interface RewardActiveCode {
  id: string;
  reward_id: string;
  reward_type: RewardCodeType;
  title: string;
  code: string | null;
  points_cost: number;
  expires_at: string | null;
  status: 'issued' | 'claimed' | 'void' | 'reversed' | 'expired';
}

export interface RewardSummary {
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
  recent_activity: RewardActivity[];
  active_codes: RewardActiveCode[];
}

export interface RewardCatalogItem {
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
  value_kes?: number | null;
}

export interface RewardWayToEarn {
  id: string;
  title: string;
  description: string;
}
