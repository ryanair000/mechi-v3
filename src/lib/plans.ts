export type Plan = 'free' | 'pro' | 'elite';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanConfig {
  id: Plan;
  name: string;
  badge: string | null;
  badgeColor: string | null;
  monthlyKes: number;
  annualKes: number;
  dailyMatchLimit: number;
  maxGames: number;
  tournamentFeePercent: number;
  matchHistoryLimit: number;
  priorityMatchmaking: boolean;
  exportHistory: boolean;
  earlyAccess: boolean;
  features: string[];
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    badge: null,
    badgeColor: null,
    monthlyKes: 0,
    annualKes: 0,
    dailyMatchLimit: 5,
    maxGames: 1,
    tournamentFeePercent: 10,
    matchHistoryLimit: 10,
    priorityMatchmaking: false,
    exportHistory: false,
    earlyAccess: false,
    features: [
      '5 ranked matches per day',
      '1 selected game',
      'Tournament joins',
      '10-match history window',
      'WhatsApp match alerts',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    badge: 'Pro',
    badgeColor: '#FF6B6B',
    monthlyKes: 199,
    annualKes: 1990,
    dailyMatchLimit: -1,
    maxGames: 3,
    tournamentFeePercent: 8,
    matchHistoryLimit: 100,
    priorityMatchmaking: false,
    exportHistory: false,
    earlyAccess: false,
    features: [
      'Unlimited ranked matches',
      'Up to 3 selected games',
      'Reduced tournament fee',
      '100-match history window',
      'Pro profile badge',
    ],
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    badge: 'Elite',
    badgeColor: '#32E0C4',
    monthlyKes: 349,
    annualKes: 3490,
    dailyMatchLimit: -1,
    maxGames: 3,
    tournamentFeePercent: 7,
    matchHistoryLimit: -1,
    priorityMatchmaking: true,
    exportHistory: true,
    earlyAccess: true,
    features: [
      'Everything in Pro',
      'Priority matchmaking',
      'Unlimited history',
      'CSV export access',
      'Early access to new drops',
    ],
  },
};

export function getPlan(plan: string | null | undefined): PlanConfig {
  return PLANS[(plan as Plan) ?? 'free'] ?? PLANS.free;
}

export function canStartMatch(plan: Plan, usedToday: number): boolean {
  const config = getPlan(plan);
  return config.dailyMatchLimit === -1 || usedToday < config.dailyMatchLimit;
}

export function canSelectGames(plan: Plan, count: number): boolean {
  return count <= getPlan(plan).maxGames;
}

export function getPlanPrice(plan: Plan, billingCycle: BillingCycle): number {
  const config = getPlan(plan);
  return billingCycle === 'annual' ? config.annualKes : config.monthlyKes;
}

export function getPlanRenewalLabel(plan: Plan, billingCycle: BillingCycle): string {
  if (plan === 'free') return 'Always free';
  return billingCycle === 'annual' ? 'Billed yearly' : 'Billed monthly';
}
