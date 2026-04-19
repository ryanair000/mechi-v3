import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { REWARD_WAYS_TO_EARN, getRewardSummaryForUser } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const supabase = createServiceClient();
    const summary = await getRewardSummaryForUser(supabase, authUser.id);

    return NextResponse.json({
      summary,
      ways_to_earn: REWARD_WAYS_TO_EARN,
    });
  } catch (error) {
    console.error('[Rewards Summary] Error:', error);
    return NextResponse.json({ error: 'Failed to load rewards summary' }, { status: 500 });
  }
}
