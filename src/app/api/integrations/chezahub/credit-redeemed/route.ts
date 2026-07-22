import { NextRequest, NextResponse } from 'next/server';
import { fingerprintCallbackPayload } from '@/lib/partner-rewards';
import { hasValidSignedAction } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!hasValidSignedAction(request, body, { maxAgeMs: 5 * 60 * 1000 })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestId = String(body.request_id ?? '').trim();
  const exportId = String(body.mechi_export_id ?? '').trim();
  const voucherId = String(body.voucher_id ?? '').trim();
  const walletTransactionId = String(body.wallet_transaction_id ?? '').trim();
  const chezahubUserId = String(body.chezahub_user_id ?? '').trim();
  const mechiUserId = String(body.mechi_user_id ?? '').trim();
  const creditKes = Number(body.credit_kes);
  const redeemedAt = String(body.redeemed_at ?? '').trim();
  if (!requestId || !exportId || !voucherId || !walletTransactionId || !chezahubUserId || !mechiUserId || !creditKes || !redeemedAt) {
    return NextResponse.json({ error: 'Complete redemption references are required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: existingCallback } = await supabase
    .from('partner_reward_callback_events')
    .select('request_id')
    .eq('request_id', requestId)
    .maybeSingle();
  if (existingCallback) return NextResponse.json({ ok: true, idempotent: true });

  const { data: rewardExport, error } = await supabase
    .from('partner_reward_exports')
    .select('*')
    .eq('id', exportId)
    .eq('user_id', mechiUserId)
    .single();
  if (error || !rewardExport) return NextResponse.json({ error: 'Reward export not found' }, { status: 404 });
  if (
    Number(rewardExport.credit_kes) !== creditKes ||
    (rewardExport.external_voucher_id && rewardExport.external_voucher_id !== voucherId) ||
    (rewardExport.chezahub_user_id && rewardExport.chezahub_user_id !== chezahubUserId)
  ) {
    await supabase.from('partner_reward_exports').update({
      status: 'reconciliation_required',
      updated_at: new Date().toISOString(),
      metadata: { ...rewardExport.metadata, callback_mismatch: { voucherId, walletTransactionId, creditKes } },
    }).eq('id', exportId);
    return NextResponse.json({ error: 'Redemption details do not match the reserved reward' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: completedExport, error: updateError } = await supabase.from('partner_reward_exports').update({
    status: 'completed',
    external_voucher_id: voucherId,
    external_wallet_transaction_id: walletTransactionId,
    chezahub_user_id: chezahubUserId,
    redeemed_at: redeemedAt,
    completed_at: now,
    updated_at: now,
  }).eq('id', exportId).in('status', ['reserved', 'issued', 'redeemed', 'completed']).select('id').maybeSingle();
  if (updateError) return NextResponse.json({ error: 'Failed to complete redemption' }, { status: 500 });
  if (!completedExport) {
    return NextResponse.json({ error: 'Reward is no longer eligible for settlement' }, { status: 409 });
  }

  await supabase.from('profiles').update({
    chezahub_user_id: chezahubUserId,
    chezahub_linked_at: now,
  }).eq('id', mechiUserId).or(`chezahub_user_id.is.null,chezahub_user_id.eq.${chezahubUserId}`);

  const { error: callbackError } = await supabase.from('partner_reward_callback_events').insert({
    request_id: requestId,
    export_id: exportId,
    event_type: 'credit_redeemed',
    payload_fingerprint: fingerprintCallbackPayload(body),
  });
  if (callbackError && callbackError.code !== '23505') {
    console.error('[Cheza Credit Callback] Failed to persist callback event:', callbackError);
  }

  return NextResponse.json({ ok: true, export_id: exportId, status: 'completed' });
}
