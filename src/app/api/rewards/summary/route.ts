import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { REWARD_WAYS_TO_EARN, getRewardSummaryForUser } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const summary = await getRewardSummaryForUser(supabase, authUser.sub);

    return NextResponse.json({
      summary,
      ways_to_earn: REWARD_WAYS_TO_EARN,
    });
  } catch (error) {
    console.error('[Rewards Summary] Error:', error);
    return NextResponse.json({ error: 'Failed to load rewards summary' }, { status: 500 });
  }
}
