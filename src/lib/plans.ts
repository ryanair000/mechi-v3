export type Plan = 'free' | 'pro' | 'elite';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanConfig {
  id: Plan;
  name: string;
  badge: string | null;
  badgeColor: string | null;
  monthlyKes: number;
  annualKes: number;
  weeklyKes: number;
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
    weeklyKes: 0,
    dailyMatchLimit: 5,
    maxGames: 1,
    tournamentFeePercent: 5,
    matchHistoryLimit: 10,
    priorityMatchmaking: false,
    exportHistory: false,
    earlyAccess: false,
    features: [
      '5 ranked matches per day',
      '1 selected game',
      'Tournament joins',
      '1-on-1 direct challenges',
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
    weeklyKes: 49,
    dailyMatchLimit: -1,
    maxGames: 3,
    tournamentFeePercent: 5,
    matchHistoryLimit: 100,
    priorityMatchmaking: false,
    exportHistory: false,
    earlyAccess: false,
    features: [
      '1-month Pro trial for new players',
      'Unlimited ranked matches',
      'Up to 3 selected games',
      'Tournament joins',
      '1-on-1 direct challenges',
      '100-match history window',
      'Pro profile badge',
    ],
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    badge: 'Elite',
    badgeColor: '#F6C453',
    monthlyKes: 699,
    annualKes: 6990,
    weeklyKes: 175,
    dailyMatchLimit: -1,
    maxGames: 3,
    tournamentFeePercent: 0,
    matchHistoryLimit: -1,
    priorityMatchmaking: true,
    exportHistory: true,
    earlyAccess: true,
    features: [
      'Everything in Pro',
      'Tournament hosting on Mechi',
      '3 fee-free tournaments each month',
      'Auto or specified prize pools',
      'Priority matchmaking',
      'Gold Elite badge',
      'No tournament registration charge',
      'Unlimited history',
      'CSV export access',
      'Early access to new updates',
      'Streaming features access',
    ],
  },
};

export function getPlan(plan: string | null | undefined): PlanConfig {
  return PLANS[(plan as Plan) ?? 'free'] ?? PLANS.free;
}

export function resolvePlan(plan: string | null | undefined, expiresAt?: string | null): Plan {
  const candidate = (plan as Plan | null | undefined) ?? 'free';
  if (candidate !== 'free' && expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return 'free';
  }
  return PLANS[candidate] ? candidate : 'free';
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

export function getPlanWeeklyPrice(plan: Plan, billingCycle: BillingCycle): number {
  const config = getPlan(plan);
  if (plan === 'free') return 0;
  return billingCycle === 'annual' ? Math.floor(config.annualKes / 52) : config.weeklyKes;
}

export function getPlanRenewalLabel(plan: Plan, billingCycle: BillingCycle): string {
  if (plan === 'free') return 'Always free';
  return billingCycle === 'annual' ? 'Billed yearly' : 'Billed monthly';
}
