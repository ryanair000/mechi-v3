export type RewardGameKey = 'codm' | 'pubgm' | 'efootball';
export type RewardRedemptionStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface RewardActivity {
  id: string;
  event_type: string;
  title: string;
  available_delta: number;
  pending_delta: number;
  created_at: string;
}

export interface RewardWayToEarn {
  id: string;
  title: string;
  description: string;
  rp_amount: number;
  category: string;
  frequency: string;
}

export interface RewardCatalogItem {
  id: string;
  game: RewardGameKey;
  title: string;
  reward_amount_label: string;
  cost_kes: number;
  cost_points: number;
  active: boolean;
  sort_order?: number | null;
}

export interface RewardRedemptionRequest {
  id: string;
  catalog_id: string;
  game: RewardGameKey;
  reward_amount_label: string;
  cost_kes: number;
  cost_points: number;
  mpesa_number: string;
  status: RewardRedemptionStatus;
  submitted_at: string;
  processing_at?: string | null;
  completed_at?: string | null;
  rejected_at?: string | null;
  admin_note?: string | null;
}

export interface RewardSummary {
  balances: {
    points_available: number;
    pending: number;
    lifetime: number;
  };
  wallet: {
    available_kes: number;
    rate_label: string;
  };
  recent_activity: RewardActivity[];
  recent_redemptions: RewardRedemptionRequest[];
  ways_to_earn: RewardWayToEarn[];
}
