import { NextRequest, NextResponse } from 'next/server';
import {
  hasValidInstagramSignature,
  processInstagramWebhook,
} from '@/lib/support-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getVerifyToken() {
  return (
    process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim() ||
    process.env.INSTAGRAM_VERIFY_TOKEN?.trim() ||
    ''
  );
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

  if (mode !== 'subscribe' || token !== verifyToken || !challenge) {
    return NextResponse.json({ error: 'Invalid verification request' }, { status: 403 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
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
    console.error('[Instagram] Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
