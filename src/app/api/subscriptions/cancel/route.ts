import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { cancelActiveSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    await cancelActiveSubscription(authUser.id);
    return NextResponse.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    console.error('[Subscription Cancel] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
