import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdmin } from '@/lib/auth';
import { activateSubscription } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser || !isAdmin(authUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const subscriptionId = String(body.subscription_id ?? '').trim();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscription_id required' }, { status: 400 });
    }

    const subscription = await activateSubscription(subscriptionId);
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error('[Subscription Confirm] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
