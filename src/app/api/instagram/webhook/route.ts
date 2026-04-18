import { NextRequest, NextResponse } from 'next/server';
import {
  hasValidInstagramSignature,
  processInstagramWebhook,
} from '@/lib/support-inbox';

export const runtime = 'nodejs';

function getVerifyToken() {
  return (process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN ?? '').trim();
}

export async function GET(request: NextRequest) {
  const verifyToken = getVerifyToken();
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (!verifyToken) {
    return NextResponse.json(
      { error: 'Instagram webhook verify token is not configured' },
      { status: 500 }
    );
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Invalid verification request' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    if (!hasValidInstagramSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as Parameters<typeof processInstagramWebhook>[0];
    const result = await processInstagramWebhook(payload);

    return NextResponse.json({
      received: true,
      ...result,
    });
  } catch (error) {
    console.error('[Instagram Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
