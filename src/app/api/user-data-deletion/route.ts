import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  isTransactionalEmailReady,
  sendUserDataDeletionConfirmationEmail,
  sendUserDataDeletionSupportEmail,
} from '@/lib/email';
import { normalizePhoneNumber } from '@/lib/phone';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

const SUPPORT_EMAIL = 'support@mechi.club';
const MAX_USERNAME_LENGTH = 40;
const MAX_EMAIL_LENGTH = 120;
const MAX_PHONE_LENGTH = 24;
const MAX_NOTE_LENGTH = 1200;
const REQUEST_LIMIT = 4;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;

function normalizeField(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasPhoneLikeDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function buildRequestId() {
  return `DDR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(
      `user-data-deletion:${getClientIp(request)}`,
      REQUEST_LIMIT,
      REQUEST_WINDOW_MS
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    if (!isTransactionalEmailReady()) {
      return NextResponse.json(
        {
          error: `Deletion requests are temporarily unavailable. Please email ${SUPPORT_EMAIL} directly.`,
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const username = normalizeField(body.username, MAX_USERNAME_LENGTH);
    const email = normalizeEmail(normalizeField(body.email, MAX_EMAIL_LENGTH));
    const phone = normalizeField(body.phone, MAX_PHONE_LENGTH);
    const note = normalizeField(body.note, MAX_NOTE_LENGTH);
    const confirmed = body.confirmed === true;

    if (!username) {
      return NextResponse.json(
        { error: 'Add the Mechi username connected to the account you want deleted.' },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Add at least one account contact detail: email address or phone number.' },
        { status: 400 }
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    if (phone && !hasPhoneLikeDigits(phone)) {
      return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
    }

    if (!confirmed) {
      return NextResponse.json(
        { error: 'You need to confirm the deletion-request terms before submitting.' },
        { status: 400 }
      );
    }

    const requestId = buildRequestId();
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent')?.trim() || 'Unavailable';
    const normalizedPhoneHint = phone ? normalizePhoneNumber(phone) : '';
    const submittedAtIso = new Date().toISOString();

    await sendUserDataDeletionSupportEmail({
      requestId,
      username,
      email: email || null,
      phone: phone || null,
      normalizedPhoneHint: normalizedPhoneHint && normalizedPhoneHint !== phone ? normalizedPhoneHint : null,
      note: note || null,
      submittedAtIso,
      ipAddress,
      userAgent,
    });

    if (email) {
      await sendUserDataDeletionConfirmationEmail({
        requestId,
        to: email,
        username,
      });
    }

    return NextResponse.json({
      requestId,
      message:
        'Your request has been sent to Mechi support. We may contact you to verify ownership before deletion is completed.',
    });
  } catch (error) {
    console.error('[User Data Deletion] Error:', error);
    return NextResponse.json(
      { error: `We could not submit your request. Please email ${SUPPORT_EMAIL} instead.` },
      { status: 500 }
    );
  }
}
