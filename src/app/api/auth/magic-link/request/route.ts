import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_ACTION_TTLS,
  buildMagicLinkConsumeUrl,
  createAuthActionToken,
  getAuthActionSafeNextPath,
  normalizeEmailAddress,
} from '@/lib/auth-actions';
import { sendMagicLinkEmail } from '@/lib/email';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

const GENERIC_SUCCESS_MESSAGE = 'If that email exists, a sign-in link is on the way.';

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
    const nextPath = getAuthActionSafeNextPath(String(body.redirect_to ?? '/dashboard'));

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const emailRateLimit = await checkPersistentRateLimit(
      `magic-link-email:${email}`,
      3,
      60 * 60 * 1000
    );
    if (!emailRateLimit.allowed) {
      return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
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

    const profileEmail = profile?.email;
    const profileUsername = profile?.username ?? null;
    if (profileEmail && !profile.is_banned) {
      const token = await createAuthActionToken({
        userId: profile.id,
        purpose: 'magic_link_signin',
        email: profileEmail,
        nextPath,
      });

      await sendMagicLinkEmail({
        to: profileEmail,
        username: profileUsername,
        magicLink: buildMagicLinkConsumeUrl(token.token),
        expiresInMinutes: Math.round(AUTH_ACTION_TTLS.magic_link_signin / 60000),
      });
    }

    return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE });
  } catch (error) {
    console.error('[Magic Link Request] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
