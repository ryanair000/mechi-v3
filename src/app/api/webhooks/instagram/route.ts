import { NextRequest, NextResponse } from 'next/server';
import {
  extractInstagramIncomingMessages,
  fetchOpenClawReply,
  sendInstagramTextMessage,
  validateInstagramWebhookSignature,
  verifyInstagramWebhookChallenge,
} from '@/lib/instagram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const challenge = verifyInstagramWebhookChallenge(request.nextUrl.searchParams);

  if (!challenge) {
    return NextResponse.json({ error: 'Invalid webhook verification request' }, { status: 403 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (!validateInstagramWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as unknown;
    const events = extractInstagramIncomingMessages(payload);

    for (const event of events) {
      const replies = await fetchOpenClawReply(event);

      for (const reply of replies) {
        try {
          await sendInstagramTextMessage(event.senderId, reply);
        } catch (error) {
          console.error('[Instagram] Failed to send reply:', error);
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[Instagram] Webhook processing error:', error);
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }
}
