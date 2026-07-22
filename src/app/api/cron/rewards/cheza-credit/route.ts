import { NextRequest, NextResponse } from 'next/server';
import { reconcilePendingChezaCreditExports } from '@/lib/partner-rewards';
import { createServiceClient } from '@/lib/supabase';

async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || (request.headers.get('x-cron-secret') !== secret && request.headers.get('authorization') !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const results = await reconcilePendingChezaCreditExports(createServiceClient(), 50);
    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error) {
    console.error('[Cheza Credit Reconciliation] Error:', error);
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;

