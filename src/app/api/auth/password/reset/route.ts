import { NextRequest, NextResponse } from 'next/server';
import {
  appendAuthNotice,
  getAuthActionSafeNextPath,
  normalizeEmailAddress,
} from '@/lib/auth-actions';
import { applyAuthCookie, createSessionForProfile, hashPassword } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { validateUsername } from '@/lib/username';

const MIN_PASSWORD_LENGTH = 9;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(`password-reset:${getClientIp(request)}`, 8, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    const intent = String(body.intent ?? 'reset').trim();
    const { username, error: usernameError } = validateUsername(body.username);
    const email = normalizeEmailAddress(body.email);
    const password = String(body.password ?? '');

    if (usernameError || !isValidEmail(email)) {
      return NextResponse.json(
        {
          error:
            usernameError ?? 'Enter the username and email connected to this Mechi account.',
        },
        { status: 400 }
      );
    }

    if (intent !== 'verify' && intent !== 'reset') {
      return NextResponse.json({ error: 'Invalid reset request.' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', email)
      .limit(10);

    const currentProfile =
      ((profileRows ?? []) as Array<{
        id: string;
        username?: string | null;
        email?: string | null;
        is_banned?: boolean | null;
        ban_reason?: string | null;
      }>).find(
        (profile) =>
          normalizeEmailAddress(profile.email) === email &&
          String(profile.username ?? '').trim().toLowerCase() === username.toLowerCase()
      ) ?? null;

    if (profileError || !currentProfile) {
      if (profileError) {
        console.error('[Password Reset] Profile lookup error:', profileError);
      }

      return NextResponse.json(
        { error: 'That username and email do not match a Mechi account.' },
        { status: 400 }
      );
    }

    if (currentProfile.is_banned) {
      return NextResponse.json(
        { error: `Account suspended: ${currentProfile.ban_reason ?? 'Contact support.'}` },
        { status: 403 }
      );
    }

    if (intent === 'verify') {
      return NextResponse.json({
        success: true,
        message: 'Identity confirmed. You can set a new password now.',
      });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be more than 8 characters' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('id', currentProfile.id)
      .select('*')
      .single();

    if (updateError || !updatedProfile) {
      console.error('[Password Reset] Update error:', updateError);
      return NextResponse.json({ error: 'Could not reset password' }, { status: 500 });
    }

    const { token: sessionToken, user } = createSessionForProfile(
      updatedProfile as Record<string, unknown>
    );
    const redirectTo = appendAuthNotice(
      getAuthActionSafeNextPath(String(body.redirect_to ?? '/dashboard')),
      'password_reset_success'
    );
    const response = NextResponse.json({ token: sessionToken, user, redirect_to: redirectTo });
    applyAuthCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error('[Password Reset] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
