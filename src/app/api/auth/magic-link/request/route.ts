import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_ACTION_TTLS,
  buildMagicLinkConsumeUrl,
  createAuthActionToken,
  getAuthActionSafeNextPath,
  getProfileForUsernameEmail,
  normalizeEmailAddress,
  normalizeAuthUsername,
} from '@/lib/auth-actions';
import { isTransactionalEmailReady, sendMagicLinkEmail } from '@/lib/email';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkPersistentRateLimit(
      `magic-link:${getClientIp(request)}`,
      5,
      15 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    const email = normalizeEmailAddress(body.email);
    const username = normalizeAuthUsername(body.username);
    const nextPath = getAuthActionSafeNextPath(String(body.redirect_to ?? '/dashboard'));

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ error: 'Enter your username' }, { status: 400 });
    }

    const emailRateLimit = await checkPersistentRateLimit(
      `magic-link-identity:${username}:${email}`,
      3,
      60 * 60 * 1000
    );
    if (!emailRateLimit.allowed) {
      return rateLimitResponse(emailRateLimit.retryAfterSeconds);
    }

    const genericResponse = {
      success: true,
      message: 'If that account exists, we sent a secure sign-in link to the email address.',
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
      purpose: 'magic_link_signin',
      email,
      nextPath,
    });
    await sendMagicLinkEmail({
      to: email,
      username: profile.username,
      magicLink: buildMagicLinkConsumeUrl(token),
      expiresInMinutes: Math.floor(AUTH_ACTION_TTLS.magic_link_signin / 60_000),
    });

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error('[Magic Link Request] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
