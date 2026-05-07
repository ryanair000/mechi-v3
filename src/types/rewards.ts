export type RewardCodeType = 'discount_code' | 'reward_claim';

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
  reward_type: RewardCodeType | 'mechi_perk';
  title: string;
  code: string | null;
  points_cost: number;
  expires_at: string | null;
  status: 'issued' | 'claimed' | 'void' | 'reversed' | 'expired';
  external_issuance_id?: string | null;
  chezahub_order_id?: string | null;
  partner_order_url?: string | null;
  partner_status?: string | null;
  delivery_channel?: string | null;
  access_hint?: string | null;
  source?: 'chezahub' | 'mechi_native';
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
    pending: number;
    qualified: number;
    completed: number;
    flagged: number;
  };
  affiliate: {
    signups: number;
    rp_earned: number;
    rp_per_signup: number;
    qualified: number;
    completed: number;
  };
  recent_activity: RewardActivity[];
  active_codes: RewardActiveCode[];
  ways_to_earn: Array<{
    id: string;
    title: string;
    description: string;
    rp_amount: number;
    category: string;
    frequency: string;
  }>;
}

export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  reward_type: 'discount_code' | 'reward_claim' | 'mechi_perk';
  points_cost: number;
  phase: string;
  active: boolean;
  expires_in_hours?: number | null;
  discount_amount_kes?: number | null;
  max_order_coverage_percent?: number | null;
  sku_name?: string | null;
  margin_class?: string | null;
  source?: 'chezahub' | 'mechi_native';
  value_kes?: number | null;
  sort_order?: number;
}

export interface RewardWayToEarn {
  id: string;
  title: string;
  description: string;
  rp_amount: number;
  category: string;
  frequency: string;
}
