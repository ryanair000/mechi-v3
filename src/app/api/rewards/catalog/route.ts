import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { VOUCHER_TIERS } from '@/lib/rewards';
import type { RewardCatalogItem } from '@/types/rewards';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const items: RewardCatalogItem[] = VOUCHER_TIERS.map((tier) => ({
    id: tier.id,
    title: tier.title,
    description: `Get a 12-character voucher code worth KES ${tier.value_kes.toLocaleString()} in ChezaHub wallet credit. Redeem it at redeem.chezahub.co.ke. Valid for 48 hours.`,
    reward_type: 'voucher',
    points_cost: tier.points_cost,
    phase: 'v1',
    active: true,
    expires_in_hours: 48,
    value_kes: tier.value_kes,
  }));

  return NextResponse.json({ items });
}
