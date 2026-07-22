import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { verifyAndActivateSubscriptionByReference } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  const user = await getRequestAccessProfile(request);
  if (!user || user.is_banned || !hasAdminAccess(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const subscriptionId = String(body.subscription_id ?? '').trim();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscription_id required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('paystack_ref')
      .eq('id', subscriptionId)
      .maybeSingle();

    if (!subscription?.paystack_ref) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const result = await verifyAndActivateSubscriptionByReference(subscription.paystack_ref);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Payment could not be verified' },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, subscription: result.subscription });
  } catch (error) {
    console.error('[Subscription Confirm] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
