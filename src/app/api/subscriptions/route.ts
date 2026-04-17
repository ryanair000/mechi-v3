import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import type { BillingCycle, Plan } from '@/lib/plans';
import { initiateSubscription, getActiveOrPendingSubscription, maybeExpireProfilePlan } from '@/lib/subscription';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: profileRaw, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.sub)
    .maybeSingle();

  const profile = profileRaw as Record<string, unknown> | null;
  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const resolvedPlan = await maybeExpireProfilePlan(
    {
      id: profile.id as string,
      plan: profile.plan as string | null | undefined,
      plan_expires_at: profile.plan_expires_at as string | null | undefined,
    },
    supabase
  );

  const subscription = await getActiveOrPendingSubscription(authUser.sub, supabase);

  return NextResponse.json({
    plan: resolvedPlan,
    plan_since: (profile.plan_since as string | null | undefined) ?? null,
    plan_expires_at:
      resolvedPlan === 'free'
        ? null
        : ((profile.plan_expires_at as string | null | undefined) ?? null),
    subscription,
  });
}

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const plan = String(body.plan ?? '').trim() as Plan;
    const cycle = (String(body.cycle ?? 'monthly').trim() as BillingCycle) ?? 'monthly';

    if (plan !== 'pro' && plan !== 'elite') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (cycle !== 'monthly' && cycle !== 'annual') {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.sub)
      .maybeSingle();

    const profile = profileRaw as Record<string, unknown> | null;
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const email = String(profile.email ?? '').trim();
    if (!email) {
      return NextResponse.json({ error: 'Add your email before upgrading' }, { status: 400 });
    }

    const result = await initiateSubscription({
      userId: authUser.sub,
      email,
      plan,
      cycle,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Could not start checkout' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      subscription_id: result.subscriptionId,
      reference: result.paystackRef,
      authorization_url: result.authorizationUrl ?? null,
      activated: result.activated ?? false,
    });
  } catch (error) {
    console.error('[Subscriptions] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
