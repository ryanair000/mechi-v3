import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  CHEZA_CREDIT_PACKAGES,
  CHEZA_CREDIT_DAILY_LIMIT,
  CHEZA_CREDIT_PERIOD_LIMIT_KES,
  CHEZA_CREDIT_RATE_RP_PER_KES,
  CHEZA_CREDIT_RATE_VERSION,
} from '@/lib/partner-rewards';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('partner_reward_exports')
    .select('id, rp_amount, credit_kes, status, external_voucher_id, external_wallet_transaction_id, expires_at, redeemed_at, completed_at, restored_at, created_at')
    .eq('user_id', access.profile.id)
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) return NextResponse.json({ error: 'Could not load Cheza Credit redemptions' }, { status: 500 });

  return NextResponse.json({
    enabled: String(process.env.CHEZA_CREDIT_REDEMPTION_ENABLED ?? '').toLowerCase() === 'true',
    packages: CHEZA_CREDIT_PACKAGES,
    rules: {
      rate_rp_per_kes: CHEZA_CREDIT_RATE_RP_PER_KES,
      rate_version: CHEZA_CREDIT_RATE_VERSION,
      period_limit_kes: CHEZA_CREDIT_PERIOD_LIMIT_KES,
      daily_limit: CHEZA_CREDIT_DAILY_LIMIT,
      wallet_coverage_percent: 25,
    },
    redemptions: data ?? [],
  });
}
