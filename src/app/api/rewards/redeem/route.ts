import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  createNativeRewardRedemptionRequest,
  RewardWalletError,
} from '@/lib/rewards-wallet';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = (await request.json()) as { reward_id?: string; mpesa_number?: string };
    const supabase = createServiceClient();
    const result = await createNativeRewardRedemptionRequest(supabase, {
      userId: access.profile.id,
      rewardId: String(body.reward_id ?? ''),
      mpesaNumber: String(body.mpesa_number ?? ''),
    });

    return NextResponse.json({
      request: result.request,
      balances: result.balances,
      wallet: result.wallet,
    });
  } catch (error) {
    if (error instanceof RewardWalletError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[Rewards Redeem] Error:', error);
    return NextResponse.json({ error: 'Failed to redeem reward' }, { status: 500 });
  }
}
