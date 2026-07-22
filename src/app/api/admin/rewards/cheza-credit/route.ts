import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess } from '@/lib/access';
import { reconcileChezaCreditExport, reconcilePendingChezaCreditExports, type PartnerRewardExport } from '@/lib/partner-rewards';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const profile = await getRequestAccessProfile(request);
  if (!hasAdminAccess(profile)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const status = request.nextUrl.searchParams.get('status')?.trim();
  const supabase = createServiceClient();
  let query = supabase.from('partner_reward_exports').select('*, user:user_id(id, username, email, phone)').order('created_at', { ascending: false }).limit(100);
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load Cheza Credit operations' }, { status: 500 });
  return NextResponse.json({ exports: data ?? [] });
}

export async function POST(request: NextRequest) {
  const profile = await getRequestAccessProfile(request);
  if (!hasAdminAccess(profile)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { action?: string; export_id?: string };
  const supabase = createServiceClient();
  try {
    if (body.action === 'reconcile_all') {
      const results = await reconcilePendingChezaCreditExports(supabase, 100);
      return NextResponse.json({ ok: true, results });
    }
    if (body.action === 'reconcile' && body.export_id) {
      const { data, error } = await supabase.from('partner_reward_exports').select('*').eq('id', body.export_id).single();
      if (error || !data) return NextResponse.json({ error: 'Reward export not found' }, { status: 404 });
      const result = await reconcileChezaCreditExport(supabase, data as PartnerRewardExport);
      return NextResponse.json({ ok: true, result });
    }
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin action failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

