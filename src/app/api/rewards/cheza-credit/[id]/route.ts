import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getChezaCreditVoucherStatus, markChezaCreditVoucherIssued } from '@/lib/partner-rewards';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await context.params;
  const supabase = createServiceClient();
  const { data: rewardExport, error } = await supabase
    .from('partner_reward_exports')
    .select('*')
    .eq('id', id)
    .eq('user_id', access.profile.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load redemption' }, { status: 500 });
  if (!rewardExport) return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });

  if (['restored', 'rejected'].includes(rewardExport.status)) {
    return NextResponse.json({ export: rewardExport, voucher: null });
  }

  try {
    const voucher = await getChezaCreditVoucherStatus(id);
    let currentExport = rewardExport;
    if (rewardExport.status === 'reserved' && voucher.status === 'issued') {
      currentExport = await markChezaCreditVoucherIssued(supabase, id, {
        voucher_id: voucher.id,
        expires_at: voucher.expires_at,
      });
    }
    return NextResponse.json({ export: currentExport, voucher });
  } catch {
    if (rewardExport.status === 'reserved') {
      try {
        const { issueChezaCreditVoucher } = await import('@/lib/partner-rewards');
        const issued = await issueChezaCreditVoucher(rewardExport);
        const currentExport = await markChezaCreditVoucherIssued(supabase, id, issued);
        return NextResponse.json({ export: currentExport, voucher: issued });
      } catch {
        // Reconciliation will retry; return the durable local reservation.
      }
    }
    return NextResponse.json({ export: rewardExport, voucher: null, partner_pending: true });
  }
}
