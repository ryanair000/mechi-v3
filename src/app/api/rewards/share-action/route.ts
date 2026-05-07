import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { tryClaimBounty } from '@/lib/bounties';
import { REWARD_RULES, applyRewardEvent, getRewardDayStamp } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = typeof body.action === 'string' ? body.action.trim().slice(0, 80) : 'share_page';
    const supabase = createServiceClient();
    const stamp = getRewardDayStamp();

    const result = await applyRewardEvent(supabase, {
      userId: authUser.id,
      eventKey: `reward:share-page:${authUser.id}:${stamp}`,
      eventType: 'share_page_action',
      availableDelta: REWARD_RULES.shareActionDaily,
      lifetimeDelta: REWARD_RULES.shareActionDaily,
      source: 'share_page',
      metadata: {
        action,
        stamp,
      },
    });

    if (result?.inserted) {
      void tryClaimBounty(supabase, authUser.id, 'share_action').catch(() => null);
    }

    return NextResponse.json({ ok: true, awarded: result?.inserted ?? false });
  } catch (error) {
    console.error('[Rewards Share Action] Error:', error);
    return NextResponse.json({ error: 'Failed to record share action' }, { status: 500 });
  }
}
