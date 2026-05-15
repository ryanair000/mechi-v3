import { resolvePlan } from '@/lib/plans';
import type { Plan, UserRole } from '@/types';

export const TOURNAMENT_HOSTING_TIMEZONE = 'Africa/Nairobi';
export const ELITE_FEE_FREE_TOURNAMENT_LIMIT = 3;
export const STANDARD_TOURNAMENT_PLATFORM_FEE_PERCENT = 5;

export type TournamentHostingAccess = {
  plan: Plan;
  canHost: boolean;
  platformFeePercent: number;
  eliteFeeFreeLimit: number;
  eliteFeeFreeUsed: number;
  eliteFeeFreeRemaining: number;
  feeWaived: boolean;
};

type TournamentHostingProfile = {
  plan?: string | null;
  planExpiresAt?: string | null;
  role?: UserRole | null;
};

function getTournamentHostingMonthParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TOURNAMENT_HOSTING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  return { year, month };
}

export function getTournamentHostingMonthWindow(date = new Date()) {
  const { year, month } = getTournamentHostingMonthParts(date);
  const monthNumber = Number(month);
  const nextYear = monthNumber === 12 ? Number(year) + 1 : Number(year);
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return {
    startIso: new Date(`${year}-${month}-01T00:00:00+03:00`).toISOString(),
    endIso: new Date(
      `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+03:00`
    ).toISOString(),
  };
}

export function canProfileHostTournaments(profile: TournamentHostingProfile): boolean {
  if (profile.role === 'admin') {
    return true;
  }

  return resolvePlan(profile.plan, profile.planExpiresAt) === 'elite';
}

export function getTournamentHostingAccess(
  plan: Plan,
  hostedThisMonth = 0,
  options?: { role?: UserRole | null }
): TournamentHostingAccess {
  const feeFreeUsed = Math.max(0, Math.min(hostedThisMonth, ELITE_FEE_FREE_TOURNAMENT_LIMIT));
  const feeFreeRemaining = Math.max(0, ELITE_FEE_FREE_TOURNAMENT_LIMIT - hostedThisMonth);

  if (options?.role === 'admin') {
    return {
      plan,
      canHost: true,
      platformFeePercent: 0,
      eliteFeeFreeLimit: ELITE_FEE_FREE_TOURNAMENT_LIMIT,
      eliteFeeFreeUsed: 0,
      eliteFeeFreeRemaining: ELITE_FEE_FREE_TOURNAMENT_LIMIT,
      feeWaived: true,
    };
  }

  if (plan !== 'elite') {
    return {
      plan,
      canHost: false,
      platformFeePercent: STANDARD_TOURNAMENT_PLATFORM_FEE_PERCENT,
      eliteFeeFreeLimit: ELITE_FEE_FREE_TOURNAMENT_LIMIT,
      eliteFeeFreeUsed: feeFreeUsed,
      eliteFeeFreeRemaining: feeFreeRemaining,
      feeWaived: false,
    };
  }

  const feeWaived = feeFreeRemaining > 0;

  return {
    plan,
    canHost: true,
    platformFeePercent: feeWaived ? 0 : STANDARD_TOURNAMENT_PLATFORM_FEE_PERCENT,
    eliteFeeFreeLimit: ELITE_FEE_FREE_TOURNAMENT_LIMIT,
    eliteFeeFreeUsed: feeFreeUsed,
    eliteFeeFreeRemaining: feeFreeRemaining,
    feeWaived,
  };
}
