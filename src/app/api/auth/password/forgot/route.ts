import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_ACTION_TTLS,
  buildResetPasswordUrl,
  createAuthActionToken,
  getAuthActionSafeNextPath,
  getProfileForUsernameEmail,
  normalizeEmailAddress,
  normalizeAuthUsername,
} from '@/lib/auth-actions';
import { isTransactionalEmailReady, sendPasswordResetEmail } from '@/lib/email';
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
    const submittedEmail = typeof body.email === 'string' ? body.email : null;
    const submittedUsername = typeof body.username === 'string' ? body.username : null;
    const email = normalizeEmailAddress(submittedEmail);
    const username = normalizeAuthUsername(submittedUsername);
    const nextPath = getAuthActionSafeNextPath(
      typeof body.redirect_to === 'string' ? body.redirect_to : '/dashboard'
    );

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ error: 'Enter your username' }, { status: 400 });
    }

    const emailRateLimit = await checkPersistentRateLimit(
      `password-forgot-identity:${username}:${email}`,
      3,
      60 * 60 * 1000
    );
    if (!emailRateLimit.allowed) {
      return rateLimitResponse(emailRateLimit.retryAfterSeconds);
    }

    const genericResponse = {
      success: true,
      message: 'If that account exists, we sent a password reset link to the email address.',
    };

    const profile = await getProfileForUsernameEmail({ username, email });
    if (!profile) {
      return NextResponse.json(genericResponse);
    }

    if (profile.is_banned) {
      return NextResponse.json(
        { error: `Account suspended: ${profile.ban_reason ?? 'Contact support.'}` },
        { status: 403 }
      );
    }

    if (!isTransactionalEmailReady()) {
      return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 503 });
    }

    const { token } = await createAuthActionToken({
      userId: profile.id,
      purpose: 'password_reset',
      email,
      nextPath,
    });
    await sendPasswordResetEmail({
      to: email,
      username: profile.username,
      resetLink: buildResetPasswordUrl(token),
      expiresInMinutes: Math.floor(AUTH_ACTION_TTLS.password_reset / 60_000),
    });

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error('[Password Forgot] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
