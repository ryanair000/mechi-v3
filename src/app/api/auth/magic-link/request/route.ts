import { NextRequest, NextResponse } from 'next/server';
import {
  appendAuthNotice,
  getAuthActionSafeNextPath,
  getProfileForUsernameEmail,
  normalizeEmailAddress,
  normalizeAuthUsername,
} from '@/lib/auth-actions';
import { applyAuthCookie, createSessionForProfile } from '@/lib/auth';
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

    const profile = await getProfileForUsernameEmail({ username, email });
    if (!profile) {
      return NextResponse.json(
        { error: 'No account matched that username and email.' },
        { status: 401 }
      );
    }

    if (profile.is_banned) {
      return NextResponse.json(
        { error: `Account suspended: ${profile.ban_reason ?? 'Contact support.'}` },
        { status: 403 }
      );
    }

    const { token, user } = createSessionForProfile(profile);
    const response = NextResponse.json({
      token,
      user,
      redirect_to: appendAuthNotice(nextPath, 'magic_link_success'),
      message: 'Account matched. Signing you in now.',
    });
    applyAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error('[Magic Link Request] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
