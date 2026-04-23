import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getRewardWalletSummary } from '@/lib/rewards-wallet';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();
    const summary = await getRewardWalletSummary(supabase, authUser.id);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[Rewards Summary] Error:', error);
    return NextResponse.json({ error: 'Failed to load rewards summary' }, { status: 500 });
  }
}
