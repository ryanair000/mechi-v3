import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  activateSubscriptionByReference,
  markSubscriptionPaymentFailedByReference,
} from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import {
  markTournamentPaymentFailedByReference,
  markTournamentPaymentPaidByReference,
} from '@/lib/tournaments';

export const runtime = 'nodejs';

const FORWARD_SECRET_HEADER = 'x-mechi-paystack-secret';
const PAYSTACK_SIGNATURE_HEADER = 'x-paystack-signature';

type PaystackWebhookEvent = {
  event?: string;
  data?: {
    reference?: string;
    metadata?: Record<string, unknown> | null;
  } | null;
};

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hasValidForwardSecret(request: NextRequest) {
  const expected = process.env.MECHI_PAYSTACK_WEBHOOK_SECRET?.trim();
  const provided = request.headers.get(FORWARD_SECRET_HEADER)?.trim();
  if (!expected || !provided) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}

function hasValidPaystackSignature(request: NextRequest, rawBody: string) {
  const signature = request.headers.get(PAYSTACK_SIGNATURE_HEADER)?.trim();
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!signature || !secret) {
    return false;
  }

  const digest = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return timingSafeEqual(signature, digest);
}

function classifyMechiPayment(event: PaystackWebhookEvent) {
  const reference = String(event.data?.reference ?? '').trim();
  const metadata = event.data?.metadata ?? {};
  const type = String(metadata.type ?? '').trim().toLowerCase();
  const app = String(metadata.app ?? '').trim().toLowerCase();
  const source = String(metadata.source ?? '').trim().toLowerCase();

  if (reference.startsWith('mechi_sub') || (type === 'subscription' && (app === 'mechi' || source === 'mechi'))) {
    return { kind: 'subscription' as const, reference };
  }

  if (
    reference.startsWith('mechi_tournament') ||
    (metadata.tournament_id && (app === 'mechi' || source === 'mechi'))
  ) {
    return { kind: 'tournament' as const, reference };
  }

  return { kind: 'unknown' as const, reference };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const trusted =
      hasValidForwardSecret(request) || hasValidPaystackSignature(request, rawBody);

    if (!trusted) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as PaystackWebhookEvent;
    const eventName = String(event.event ?? '').trim();
    const payment = classifyMechiPayment(event);

    if (!payment.reference.startsWith('mechi_')) {
      return NextResponse.json({ received: true, ignored: true });
    }

    if (payment.kind === 'unknown') {
      return NextResponse.json({ received: true, ignored: true, reference: payment.reference });
    }

    const supabase = createServiceClient();

    if (eventName === 'charge.success') {
      const result =
        payment.kind === 'subscription'
          ? await activateSubscriptionByReference(payment.reference, supabase)
          : await markTournamentPaymentPaidByReference(supabase, payment.reference);

      if (!result.success) {
        console.error('[Paystack Webhook] Could not process successful payment', {
          reference: payment.reference,
          kind: payment.kind,
          error: result.error,
        });
        return NextResponse.json(
          { error: result.error ?? 'Could not process payment' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        received: true,
        handled: true,
        reference: payment.reference,
        kind: payment.kind,
      });
    }

    if (eventName === 'charge.failed') {
      const result =
        payment.kind === 'subscription'
          ? await markSubscriptionPaymentFailedByReference(payment.reference, supabase)
          : await markTournamentPaymentFailedByReference(supabase, payment.reference);

      if (!result.success) {
        console.error('[Paystack Webhook] Could not mark failed payment', {
          reference: payment.reference,
          kind: payment.kind,
          error: result.error,
        });
        return NextResponse.json(
          { error: result.error ?? 'Could not mark payment failed' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        received: true,
        handled: true,
        failed: true,
        reference: payment.reference,
        kind: payment.kind,
      });
    }

    return NextResponse.json({
      received: true,
      ignored: true,
      reference: payment.reference,
      event: eventName || 'unknown',
    });
  } catch (error) {
    console.error('[Paystack Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
