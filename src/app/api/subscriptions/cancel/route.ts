import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { cancelActiveSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await cancelActiveSubscription(authUser.sub);
    return NextResponse.json({ success: true, message: 'Subscription cancelled' });
  } catch (error) {
    console.error('[Subscription Cancel] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
