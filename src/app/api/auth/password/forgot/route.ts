import { NextRequest, NextResponse } from 'next/server';
import {
  getProfileForUsernameContact,
  normalizeAuthUsername,
} from '@/lib/auth-actions';
import { parseRecoveryContact } from '@/lib/recovery-contact';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const ipRateLimit = await checkPersistentRateLimit(
      `password-forgot:${getClientIp(request)}`,
      6,
      15 * 60 * 1000
    );
    if (!ipRateLimit.allowed) {
      return rateLimitResponse(ipRateLimit.retryAfterSeconds);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const rawContact =
      typeof body.contact === 'string'
        ? body.contact
        : typeof body.email === 'string'
          ? body.email
          : typeof body.phone === 'string'
            ? body.phone
            : null;
    const submittedUsername = typeof body.username === 'string' ? body.username : null;
    const parsedContact = parseRecoveryContact(rawContact);
    const username = normalizeAuthUsername(submittedUsername);

    if (!parsedContact) {
      return NextResponse.json({ error: 'Enter a valid email address or phone number' }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ error: 'Enter your username' }, { status: 400 });
    }

    const emailRateLimit = await checkPersistentRateLimit(
      `password-forgot-identity:${username}:${parsedContact.rateLimitKey}`,
      3,
      60 * 60 * 1000
    );
    if (!emailRateLimit.allowed) {
      return rateLimitResponse(emailRateLimit.retryAfterSeconds);
    }

    const profile = await getProfileForUsernameContact({
      username,
      contact: parsedContact.normalized,
    });
    if (!profile) {
      return NextResponse.json(
        { error: 'Those details did not match.' },
        { status: 404 }
      );
    }

    if (profile.is_banned) {
      return NextResponse.json(
        { error: `Account suspended: ${profile.ban_reason ?? 'Contact support.'}` },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Account matched. Choose a new password to finish resetting it.',
    });
  } catch (error) {
    console.error('[Password Forgot] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
