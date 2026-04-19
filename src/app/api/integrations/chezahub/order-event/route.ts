import { NextRequest, NextResponse } from 'next/server';
import { handleChezahubOrderEvent, hasValidSignedAction } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (!hasValidSignedAction(request, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orderId = String(body.order_id ?? '').trim();
  const status = String(body.status ?? '').trim();
  const idempotencyKey = String(body.idempotency_key ?? '').trim();

  if (!orderId || !status || !idempotencyKey) {
    return NextResponse.json(
      { error: 'order_id, status, and idempotency_key are required' },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();
    const result = await handleChezahubOrderEvent(supabase, {
      order_id: orderId,
      status: status as
        | 'paid'
        | 'completed'
        | 'cancelled'
        | 'expired'
        | 'refunded'
        | 'abuse_review',
      chezahub_user_id: typeof body.chezahub_user_id === 'string' ? body.chezahub_user_id : null,
      mechi_user_id: typeof body.mechi_user_id === 'string' ? body.mechi_user_id : null,
      order_total_kes: Number(body.order_total_kes) || 0,
      customer_email: typeof body.customer_email === 'string' ? body.customer_email : null,
      customer_phone: typeof body.customer_phone === 'string' ? body.customer_phone : null,
      applied_discount_code:
        typeof body.applied_discount_code === 'string' ? body.applied_discount_code : null,
      reward_issuance_id:
        typeof body.reward_issuance_id === 'string' ? body.reward_issuance_id : null,
      reward_code: typeof body.reward_code === 'string' ? body.reward_code : null,
      reward_catalog_id:
        typeof body.reward_catalog_id === 'string' ? body.reward_catalog_id : null,
      occurred_at: typeof body.occurred_at === 'string' ? body.occurred_at : null,
      idempotency_key: idempotencyKey,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[ChezaHub Order Event] Error:', error);
    return NextResponse.json({ error: 'Failed to process order event' }, { status: 500 });
  }
}
