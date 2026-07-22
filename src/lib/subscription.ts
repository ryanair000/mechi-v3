import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase';
import {
  initializePaystackTransaction,
  isPaystackConfigured,
} from '@/lib/paystack';
import {
  getPaymentVerificationEvidence,
  verifyMechiPaymentByReference,
  type PaymentVerificationEvidence,
} from '@/lib/payment-verification';
import { makePaymentReference } from '@/lib/slug';
import {
  type BillingCycle,
  type Plan,
  canSelectGames,
  getPlan,
  getPlanPrice,
  resolvePlan,
} from '@/lib/plans';
import { sendSubscriptionConfirmEmail } from '@/lib/email';

export { resolvePlan } from '@/lib/plans';

const APP_TIMEZONE = 'Africa/Nairobi';

type ProfilePlanSnapshot = {
  id: string;
  plan?: string | null;
  plan_expires_at?: string | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: Exclude<Plan, 'free'>;
  billing_cycle: BillingCycle;
  amount_kes: number;
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'failed';
  paystack_ref?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  cancelled_at?: string | null;
  payment_provider_transaction_id?: number | null;
  payment_verified_at?: string | null;
  payment_currency?: string | null;
  created_at: string;
};

export interface SubscriptionIntentResult {
  success: boolean;
  subscriptionId?: string;
  authorizationUrl?: string;
  paystackRef?: string;
  activated?: boolean;
  error?: string;
}

function getSupabaseClient(client?: SupabaseClient) {
  return client ?? createServiceClient();
}

function getKenyaDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return { year, month, day };
}

export function getKenyaDateString(date = new Date()) {
  const { year, month, day } = getKenyaDateParts(date);
  return `${year}-${month}-${day}`;
}

function addBillingDuration(start: Date, billingCycle: BillingCycle) {
  const expiresAt = new Date(start);
  if (billingCycle === 'annual') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }
  return expiresAt;
}

export function canUseSelectedGames(plan: string | null | undefined, count: number) {
  return canSelectGames(resolvePlan(plan), count);
}

export async function maybeExpireProfilePlan(
  profile: ProfilePlanSnapshot,
  client?: SupabaseClient
): Promise<Plan> {
  const currentPlan = resolvePlan(profile.plan, profile.plan_expires_at);
  if (currentPlan !== 'free') {
    return currentPlan;
  }

  if ((profile.plan ?? 'free') === 'free' || !profile.plan_expires_at) {
    return 'free';
  }

  const supabase = getSupabaseClient(client);
  await supabase
    .from('profiles')
    .update({
      plan: 'free',
      plan_since: null,
      plan_expires_at: null,
    })
    .eq('id', profile.id);

  await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('user_id', profile.id)
    .eq('status', 'active');

  return 'free';
}

export async function getTodayMatchCount(userId: string, client?: SupabaseClient): Promise<number> {
  const supabase = getSupabaseClient(client);
  const today = getKenyaDateString();
  const { data } = await supabase
    .from('match_usage')
    .select('match_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  return (data?.match_count as number | undefined) ?? 0;
}

export async function incrementMatchUsage(userId: string, client?: SupabaseClient): Promise<number> {
  const supabase = getSupabaseClient(client);
  const today = getKenyaDateString();

  await supabase.rpc('increment_match_usage', {
    p_user_id: userId,
    p_date: today,
  });

  return getTodayMatchCount(userId, supabase);
}

export async function initiateSubscription(params: {
  userId: string;
  email: string;
  plan: Exclude<Plan, 'free'>;
  cycle: BillingCycle;
}): Promise<SubscriptionIntentResult> {
  const supabase = createServiceClient();
  const amountKes = getPlanPrice(params.plan, params.cycle);
  const reference = makePaymentReference('mechi_sub');
  const callbackUrl = `${(
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    'https://mechi.club'
  ).replace(/\/$/, '')}/api/subscriptions/callback`;

  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('user_id', params.userId)
    .eq('status', 'pending');

  const { data: subscriptionRaw, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: params.userId,
      plan: params.plan,
      billing_cycle: params.cycle,
      amount_kes: amountKes,
      status: 'pending',
      paystack_ref: reference,
    })
    .select('*')
    .single();

  const subscription = subscriptionRaw as SubscriptionRow | null;
  if (error || !subscription) {
    return { success: false, error: error?.message ?? 'Could not create subscription' };
  }

  if (!isPaystackConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      await supabase
        .from('subscriptions')
        .update({ status: 'failed' })
        .eq('id', subscription.id);

      return {
        success: false,
        error: 'Payment provider is not configured',
      };
    }

    await activateSubscription(subscription.id, supabase);
    return {
      success: true,
      subscriptionId: subscription.id,
      paystackRef: reference,
      activated: true,
    };
  }

  const initialized = await initializePaystackTransaction({
    amountKes,
    email: params.email,
    reference,
    callbackUrl,
    metadata: {
      app: 'mechi',
      source: 'mechi',
      type: 'subscription',
      subscription_id: subscription.id,
      user_id: params.userId,
      plan: params.plan,
      cycle: params.cycle,
    },
  });

  if (!initialized.success || !initialized.authorizationUrl) {
    await supabase
      .from('subscriptions')
      .update({ status: 'failed' })
      .eq('id', subscription.id);

    return {
      success: false,
      error: initialized.error ?? 'Could not initialize payment',
    };
  }

  return {
    success: true,
    subscriptionId: subscription.id,
    paystackRef: initialized.reference,
    authorizationUrl: initialized.authorizationUrl,
  };
}

export async function activateSubscription(
  subscriptionId: string,
  client?: SupabaseClient,
  evidence?: PaymentVerificationEvidence | null
): Promise<SubscriptionRow | null> {
  const supabase = getSupabaseClient(client);
  const { data: subscriptionRaw } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .maybeSingle();

  const subscription = subscriptionRaw as SubscriptionRow | null;
  if (!subscription) return null;

  const now = new Date();
  const expiresAt = addBillingDuration(now, subscription.billing_cycle);
  const nowIso = now.toISOString();
  const expiresIso = expiresAt.toISOString();

  const { data: activatedRaw, error: activationError } = await supabase.rpc(
    'activate_verified_subscription',
    {
      p_subscription_id: subscription.id,
      p_started_at: nowIso,
      p_expires_at: expiresIso,
      p_provider_transaction_id: evidence?.transactionId ?? null,
      p_verified_at: evidence?.verifiedAt ?? null,
      p_currency: evidence?.currency ?? null,
    }
  );

  if (activationError || !activatedRaw) {
    console.error('Atomic subscription activation failed', activationError);
    return null;
  }

  const activated = activatedRaw as SubscriptionRow;

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('email, username')
    .eq('id', subscription.user_id)
    .maybeSingle();

  if (profileRaw?.email && profileRaw?.username) {
    sendSubscriptionConfirmEmail({
      to: profileRaw.email as string,
      username: profileRaw.username as string,
      plan: activated.plan,
      expiresAt: activated.expires_at ?? expiresIso,
    }).catch(console.error);
  }

  return activated;
}

export async function activateSubscriptionByReference(
  reference: string,
  client?: SupabaseClient,
  evidence?: PaymentVerificationEvidence | null
): Promise<{ success: boolean; subscription?: SubscriptionRow; error?: string }> {
  const supabase = getSupabaseClient(client);
  const { data: subscriptionRaw } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('paystack_ref', reference)
    .maybeSingle();

  const subscription = subscriptionRaw as SubscriptionRow | null;
  if (!subscription) {
    return { success: false, error: 'Subscription not found' };
  }

  if (subscription.status === 'active') {
    if (evidence && !subscription.payment_provider_transaction_id) {
      const { data: updated } = await supabase
        .from('subscriptions')
        .update({
          payment_provider_transaction_id: evidence.transactionId,
          payment_verified_at: evidence.verifiedAt,
          payment_currency: evidence.currency,
        })
        .eq('id', subscription.id)
        .is('payment_provider_transaction_id', null)
        .select('*')
        .maybeSingle();
      return { success: true, subscription: (updated as SubscriptionRow | null) ?? subscription };
    }
    return { success: true, subscription };
  }

  const activated = await activateSubscription(subscription.id, supabase, evidence);
  if (!activated) {
    return { success: false, error: 'Could not activate subscription' };
  }

  return { success: true, subscription: activated };
}

export async function markSubscriptionPaymentFailedByReference(
  reference: string,
  client?: SupabaseClient
): Promise<{ success: boolean; subscription?: SubscriptionRow; error?: string }> {
  const supabase = getSupabaseClient(client);
  const { data: subscriptionRaw } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('paystack_ref', reference)
    .maybeSingle();

  const subscription = subscriptionRaw as SubscriptionRow | null;
  if (!subscription) {
    return { success: false, error: 'Subscription not found' };
  }

  if (subscription.status === 'active') {
    return { success: true, subscription };
  }

  await supabase
    .from('subscriptions')
    .update({ status: 'failed' })
    .eq('id', subscription.id)
    .in('status', ['pending', 'failed']);

  return {
    success: true,
    subscription: {
      ...subscription,
      status: 'failed',
    },
  };
}

export async function verifyAndActivateSubscriptionByReference(reference: string) {
  const supabase = createServiceClient();
  const { data: subscriptionRaw } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('paystack_ref', reference)
    .maybeSingle();

  const subscription = subscriptionRaw as SubscriptionRow | null;
  if (!subscription) {
    return { success: false, error: 'Subscription not found' };
  }

  if (subscription.status === 'active') {
    return { success: true, subscription };
  }

  const verified = await verifyMechiPaymentByReference({
    supabase,
    kind: 'subscription',
    reference,
  });

  if (!verified.success) {
    if (
      verified.errorCode &&
      ['reference_mismatch', 'amount_mismatch', 'currency_mismatch', 'metadata_mismatch'].includes(
        verified.errorCode
      )
    ) {
      await supabase
        .from('subscriptions')
        .update({ status: 'failed' })
        .eq('id', subscription.id)
        .eq('status', 'pending');
    }

    return { success: false, error: verified.error ?? 'Payment not complete' };
  }

  return activateSubscriptionByReference(
    reference,
    supabase,
    getPaymentVerificationEvidence(verified)
  );
}

export async function cancelActiveSubscription(userId: string, client?: SupabaseClient) {
  const supabase = getSupabaseClient(client);
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'active');
}

export async function getActiveOrPendingSubscription(userId: string, client?: SupabaseClient) {
  const supabase = getSupabaseClient(client);
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as SubscriptionRow | null) ?? null;
}

export function getGameLimitCopy(plan: string | null | undefined) {
  const config = getPlan(plan);
  return `${config.maxGames} game${config.maxGames === 1 ? '' : 's'}`;
}
