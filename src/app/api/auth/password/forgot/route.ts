import { after, NextRequest, NextResponse } from 'next/server';
import {
  AUTH_ACTION_TTLS,
  buildResetPasswordUrl,
  createAuthActionToken,
  getAuthActionSafeNextPath,
  normalizeEmailAddress,
} from '@/lib/auth-actions';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

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
    const submittedRedirect = typeof body.redirect_to === 'string' ? body.redirect_to : '/dashboard';
    const email = normalizeEmailAddress(submittedEmail);
    const nextPath = getAuthActionSafeNextPath(submittedRedirect);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const genericResponse = NextResponse.json({
      success: true,
      message: 'If that email exists, a reset link is on the way.',
    });

    const emailRateLimit = await checkPersistentRateLimit(
      `password-forgot-email:${email}`,
      3,
      60 * 60 * 1000
    );
    if (!emailRateLimit.allowed) {
      return genericResponse;
    }

    const supabase = createServiceClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, is_banned')
      .ilike('email', email)
      .limit(3);

    const profile =
      ((data ?? []) as Array<{
        id: string;
        username?: string | null;
        email?: string | null;
        is_banned?: boolean | null;
      }>).find((candidate) => normalizeEmailAddress(candidate.email) === email) ?? null;

    const profileEmail = profile?.email;
    const profileUsername = profile?.username ?? null;
    if (profileEmail && !profile.is_banned) {
      const token = await createAuthActionToken({
        userId: profile.id,
        purpose: 'password_reset',
        email: profileEmail,
        nextPath,
      });

      after(async () => {
        await sendPasswordResetEmail({
          to: profileEmail,
          username: profileUsername,
          resetLink: buildResetPasswordUrl(token.token),
          expiresInMinutes: Math.round(AUTH_ACTION_TTLS.password_reset / 60000),
        });
      });
    }

    return genericResponse;
  } catch (error) {
    console.error('[Password Forgot] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
