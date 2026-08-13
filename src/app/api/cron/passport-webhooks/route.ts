import { NextRequest, NextResponse } from 'next/server';
import { deliverPassportWebhooks } from '@/lib/passport-webhook-delivery';

export const runtime = 'nodejs';

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && (request.headers.get('authorization') === `Bearer ${secret}` || request.headers.get('x-cron-secret') === secret));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await deliverPassportWebhooks('cron', 12);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Passport Webhooks] Delivery operation failed', error);
    return NextResponse.json({ error: 'Passport webhook operation failed' }, { status: 500 });
  }
}
