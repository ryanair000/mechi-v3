import { NextRequest, NextResponse } from 'next/server';
import {
  getProfileForUsernameEmail,
  normalizeEmailAddress,
  normalizeAuthUsername,
} from '@/lib/auth-actions';
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

    return NextResponse.json({
      success: true,
      username: profile.username,
      email: profile.email,
      message: 'Account matched. Choose a new password.',
    });
  } catch (error) {
    console.error('[Password Forgot] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
