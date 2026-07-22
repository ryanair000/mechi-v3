import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  verifyPaystackTransaction,
  type PaystackVerificationErrorCode,
  type PaystackVerificationResult,
} from '@/lib/paystack';

export type MechiPaymentKind =
  | 'subscription'
  | 'tournament'
  | 'weekend_cup'
  | 'weka_mawe';

export type MechiPaymentVerificationResult = PaystackVerificationResult & {
  kind: MechiPaymentKind;
  retryable: boolean;
};

export type PaymentVerificationEvidence = {
  transactionId: number;
  currency: string;
  verifiedAt: string;
};

export function getPaymentVerificationEvidence(
  result: MechiPaymentVerificationResult
): PaymentVerificationEvidence | null {
  if (!result.success || !result.transactionId || !result.currency) return null;
  return {
    transactionId: result.transactionId,
    currency: result.currency.trim().toUpperCase(),
    verifiedAt: new Date().toISOString(),
  };
}

function failed(
  kind: MechiPaymentKind,
  error: string,
  errorCode: PaystackVerificationErrorCode = 'metadata_mismatch'
): MechiPaymentVerificationResult {
  return { success: false, kind, error, errorCode, retryable: false };
}

function withRetryability(
  kind: MechiPaymentKind,
  result: PaystackVerificationResult
): MechiPaymentVerificationResult {
  if (result.success && (!result.transactionId || !result.currency)) {
    return {
      success: false,
      kind,
      retryable: true,
      error: 'Payment provider evidence is incomplete',
      errorCode: 'provider_error',
    };
  }
  return {
    ...result,
    kind,
    retryable: result.errorCode === 'provider_error' || result.errorCode === 'not_configured',
  };
}

export async function verifyMechiPaymentByReference(params: {
  supabase: SupabaseClient;
  kind: MechiPaymentKind;
  reference: string;
}): Promise<MechiPaymentVerificationResult> {
  const { supabase, kind, reference } = params;

  if (!reference.startsWith('mechi_')) {
    return failed(kind, 'Payment reference is invalid', 'reference_mismatch');
  }

  if (kind === 'subscription') {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, billing_cycle, amount_kes')
      .eq('paystack_ref', reference)
      .maybeSingle();

    if (error || !data) {
      return failed(kind, 'Subscription payment record not found');
    }

    const verified = await verifyPaystackTransaction({
      reference,
      expectedAmountKes: Number(data.amount_kes),
      expectedCurrency: 'KES',
      expectedMetadata: {
        app: 'mechi',
        source: 'mechi',
        type: 'subscription',
        subscription_id: String(data.id),
        user_id: String(data.user_id),
        plan: String(data.plan),
        cycle: String(data.billing_cycle),
      },
    });
    return withRetryability(kind, verified);
  }

  if (kind === 'tournament') {
    const { data: player, error: playerError } = await supabase
      .from('tournament_players')
      .select('id, tournament_id, user_id')
      .eq('payment_ref', reference)
      .maybeSingle();

    if (playerError || !player) {
      return failed(kind, 'Tournament payment record not found');
    }

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, slug, entry_fee')
      .eq('id', player.tournament_id)
      .maybeSingle();

    if (tournamentError || !tournament) {
      return failed(kind, 'Tournament payment intent is incomplete');
    }

    const verified = await verifyPaystackTransaction({
      reference,
      expectedAmountKes: Number(tournament.entry_fee),
      expectedCurrency: 'KES',
      expectedMetadata: {
        app: 'mechi',
        source: 'mechi',
        tournament_id: String(tournament.id),
        tournament_slug: String(tournament.slug),
        user_id: String(player.user_id),
      },
    });
    return withRetryability(kind, verified);
  }

  if (kind === 'weekend_cup') {
    const { data, error } = await supabase
      .from('online_tournament_registrations')
      .select('id, event_slug, game, user_id, entry_fee_kes, payment_tier')
      .eq('payment_reference', reference)
      .maybeSingle();

    if (error || !data) {
      return failed(kind, 'Weekend Cup payment record not found');
    }

    const verified = await verifyPaystackTransaction({
      reference,
      expectedAmountKes: Number(data.entry_fee_kes),
      expectedCurrency: 'KES',
      expectedMetadata: {
        app: 'mechi',
        source: 'mechi',
        type: 'weekend_cup_registration',
        event_slug: String(data.event_slug),
        registration_id: String(data.id),
        game: String(data.game),
        user_id: String(data.user_id),
        payment_tier: String(data.payment_tier),
      },
    });
    return withRetryability(kind, verified);
  }

  const { data: registration, error: registrationError } = await supabase
    .from('weka_mawe_registrations')
    .select('id, edition_id, user_id, amount_kes')
    .eq('payment_reference', reference)
    .maybeSingle();

  if (registrationError || !registration) {
    return failed(kind, 'Weka Mawe payment record not found');
  }

  const { data: edition, error: editionError } = await supabase
    .from('weka_mawe_editions')
    .select('id, slug')
    .eq('id', registration.edition_id)
    .maybeSingle();

  if (editionError || !edition) {
    return failed(kind, 'Weka Mawe payment intent is incomplete');
  }

  const verified = await verifyPaystackTransaction({
    reference,
    expectedAmountKes: Number(registration.amount_kes),
    expectedCurrency: 'KES',
    expectedMetadata: {
      app: 'mechi',
      source: 'mechi',
      type: 'weka_mawe_registration',
      edition_id: String(edition.id),
      edition_slug: String(edition.slug),
      user_id: String(registration.user_id),
    },
  });
  return withRetryability(kind, verified);
}
