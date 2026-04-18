import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { REWARD_RULES, applyRewardEvent, getRewardDayStamp } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = typeof body.action === 'string' ? body.action.trim().slice(0, 80) : 'share_page';
    const supabase = createServiceClient();
    const stamp = getRewardDayStamp();

    const result = await applyRewardEvent(supabase, {
      userId: authUser.sub,
      eventKey: `reward:share-page:${authUser.sub}:${stamp}`,
      eventType: 'share_page_action',
      availableDelta: REWARD_RULES.shareActionDaily,
      lifetimeDelta: REWARD_RULES.shareActionDaily,
      source: 'share_page',
      metadata: {
        action,
        stamp,
      },
    });

    return NextResponse.json({ ok: true, awarded: result?.inserted ?? false });
  } catch (error) {
    console.error('[Rewards Share Action] Error:', error);
    return NextResponse.json({ error: 'Failed to record share action' }, { status: 500 });
  }
}
