import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getChezaCreditVoucherStatus, restoreChezaCreditExport, voidChezaCreditVoucher } from '@/lib/partner-rewards';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await context.params;
  const supabase = createServiceClient();
  const { data: rewardExport } = await supabase
    .from('partner_reward_exports')
    .select('id, user_id, status, external_voucher_id')
    .eq('id', id)
    .eq('user_id', access.profile.id)
    .maybeSingle();
  if (!rewardExport) return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });

  try {
    let externalStatus: 'voided' | 'expired' | 'not_issued' = 'not_issued';
    try {
      const current = await getChezaCreditVoucherStatus(id);
      if (current.status === 'redeemed') {
        return NextResponse.json({ error: 'Redeemed Cheza Credit cannot be cancelled' }, { status: 409 });
      }
      if (current.status === 'expired' || current.status === 'voided') {
        externalStatus = current.status;
      } else {
        const voided = await voidChezaCreditVoucher(id, 'Cancelled by player before redemption');
        externalStatus = voided.status === 'expired' ? 'expired' : 'voided';
      }
    } catch (partnerError) {
      if ((partnerError as Error & { status?: number }).status !== 404) throw partnerError;
    }
    const restored = await restoreChezaCreditExport(supabase, id, 'Cancelled by player before redemption', externalStatus);
    return NextResponse.json({ export: restored });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not cancel redemption';
    return NextResponse.json({ error: message }, { status: /redeem/i.test(message) ? 409 : 500 });
  }
}
