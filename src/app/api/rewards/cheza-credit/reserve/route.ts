import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  assertChezaCreditBridgeEnabled,
  issueChezaCreditVoucher,
  markChezaCreditVoucherIssued,
  reserveChezaCreditExport,
} from '@/lib/partner-rewards';
import { createServiceClient } from '@/lib/supabase';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  try {
    assertChezaCreditBridgeEnabled();
    const body = (await request.json().catch(() => ({}))) as { rp_amount?: number; idempotency_key?: string };
    const rpAmount = Math.floor(Number(body.rp_amount));
    const idempotencyKey = String(body.idempotency_key ?? '').trim();
    if (!isUuid(idempotencyKey)) {
      return NextResponse.json({ error: 'A valid idempotency key is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('chezahub_user_id')
      .eq('id', access.profile.id)
      .single();

    const rewardExport = await reserveChezaCreditExport(supabase, {
      userId: access.profile.id,
      rpAmount,
      idempotencyKey,
      chezahubUserId: (profile?.chezahub_user_id as string | null | undefined) ?? null,
    });

    if (rewardExport.status === 'review') {
      return NextResponse.json({ export: rewardExport, voucher: null }, { status: 202 });
    }

    try {
      const voucher = await issueChezaCreditVoucher(rewardExport);
      const updatedExport = await markChezaCreditVoucherIssued(supabase, rewardExport.id, voucher);
      return NextResponse.json({ export: updatedExport, voucher }, { status: 201 });
    } catch (issuanceError) {
      console.error('[Cheza Credit Reserve] Voucher issuance pending:', issuanceError);
      return NextResponse.json(
        { export: rewardExport, voucher: null, message: 'Your RP is reserved while ChezaHub prepares the voucher.' },
        { status: 202 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not reserve Cheza Credit';
    const status = /not enabled/i.test(message)
      ? 503
      : /daily|rolling|monthly|budget|limit/i.test(message)
        ? 429
        : /insufficient|approved|idempotency/i.test(message)
          ? 422
          : 500;
    console.error('[Cheza Credit Reserve] Error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
