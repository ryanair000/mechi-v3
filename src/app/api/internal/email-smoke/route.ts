import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendSmokeTestEmail } from '@/lib/email';

export const runtime = 'nodejs';

function getSmokeToken() {
  return process.env.EMAIL_SMOKE_TEST_TOKEN?.trim() || '';
}

function hasValidToken(request: NextRequest) {
  const secret = getSmokeToken();
  if (!secret) {
    return false;
  }

  const submitted =
    request.headers.get('x-email-smoke-token') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    '';

  const secretBuffer = Buffer.from(secret);
  const submittedBuffer = Buffer.from(submitted);
  return (
    secretBuffer.length > 0 &&
    secretBuffer.length === submittedBuffer.length &&
    timingSafeEqual(secretBuffer, submittedBuffer)
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  if (!hasValidToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { to?: string; requestedBy?: string };
    const to = String(body.to ?? '').trim().toLowerCase();

    if (!isValidEmail(to)) {
      return NextResponse.json({ error: 'Enter a valid recipient email.' }, { status: 400 });
    }

    await sendSmokeTestEmail({
      to,
      requestedBy: body.requestedBy,
    });

    return NextResponse.json({
      success: true,
      recipient: to,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Email Smoke] Failed to send test email:', error);
    return NextResponse.json({ error: 'Could not send smoke test email.' }, { status: 500 });
  }
}
