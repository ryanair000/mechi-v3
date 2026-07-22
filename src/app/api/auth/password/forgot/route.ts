import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_ACTION_TTLS,
  buildResetPasswordUrl,
  createAuthActionToken,
  getProfileForUsernameContact,
  normalizeAuthUsername,
} from '@/lib/auth-actions';
import { sendPasswordResetEmail } from '@/lib/email';
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

    const profileEmail = String(profile.email ?? '').trim().toLowerCase();
    if (!profileEmail) {
      return NextResponse.json(
        { error: 'This account has no recovery email. Contact PlayMechi support for help.' },
        { status: 409 }
      );
    }

    const redirectTo =
      typeof body.redirect_to === 'string' ? body.redirect_to : '/dashboard';
    const { token } = await createAuthActionToken({
      userId: profile.id,
      purpose: 'password_reset',
      email: profileEmail,
      nextPath: redirectTo,
    });
    const expiresInMinutes = Math.round(AUTH_ACTION_TTLS.password_reset / 60_000);

    await sendPasswordResetEmail({
      to: profileEmail,
      username: String(profile.username ?? username),
      resetLink: buildResetPasswordUrl(token),
      expiresInMinutes,
    });

    return NextResponse.json({
      success: true,
      email_sent: true,
      message: 'Check your recovery email for a secure password-reset link.',
    });
  } catch (error) {
    console.error('[Password Forgot] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
