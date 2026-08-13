import { NextRequest, NextResponse } from 'next/server';
import { runPassportRetentionCleanup } from '@/lib/passport-operations';

export const runtime = 'nodejs';

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && (request.headers.get('authorization') === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await runPassportRetentionCleanup('cron'), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Passport Retention] Cleanup operation failed', error);
    return NextResponse.json({ error: 'Passport retention operation failed' }, { status: 500 });
  }
}
