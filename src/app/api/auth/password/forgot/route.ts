import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_ACTION_TTLS,
  createAuthActionToken,
  getAuthActionSafeNextPath,
  buildResetPasswordUrl,
  normalizeEmailAddress,
} from '@/lib/auth-actions';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

const GENERIC_SUCCESS_MESSAGE = 'If that email exists, a reset link is on the way.';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(`password-forgot:${getClientIp(request)}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    const email = normalizeEmailAddress(body.email);
    const nextPath = getAuthActionSafeNextPath(String(body.redirect_to ?? '/dashboard'));

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, is_banned')
      .ilike('email', email)
      .limit(1);

    const profile = ((data ?? []) as Array<{
      id: string;
      username?: string | null;
      email?: string | null;
      is_banned?: boolean | null;
    }>)[0];

    if (profile?.email && !profile.is_banned) {
      const token = await createAuthActionToken({
        userId: profile.id,
        purpose: 'password_reset',
        email: profile.email,
        nextPath,
      });

      void sendPasswordResetEmail({
        to: profile.email,
        username: profile.username ?? null,
        resetLink: buildResetPasswordUrl(token.token),
        expiresInMinutes: Math.round(AUTH_ACTION_TTLS.password_reset / 60000),
      });
    }

    return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
  } catch (error) {
    console.error('[Password Forgot] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
