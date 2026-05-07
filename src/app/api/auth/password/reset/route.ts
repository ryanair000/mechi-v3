import { NextRequest, NextResponse } from 'next/server';
import {
  appendAuthNotice,
  consumeAuthActionToken,
  getAuthActionSafeNextPath,
  getAuthActionToken,
  getAuthActionTokenState,
  getProfileForUsernameEmail,
  normalizeAuthUsername,
  normalizeEmailAddress,
} from '@/lib/auth-actions';
import { applyAuthCookie, createSessionForProfile, hashPassword } from '@/lib/auth';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 9;

async function completePasswordReset(params: {
  profile: Record<string, unknown>;
  password: string;
  redirectTo: string;
}) {
  const supabase = createServiceClient();
  const passwordHash = await hashPassword(params.password);
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ password_hash: passwordHash })
    .eq('id', params.profile.id as string)
    .select('*')
    .single();

  if (updateError || !updatedProfile) {
    console.error('[Password Reset] Update error:', updateError);
    return NextResponse.json({ error: 'Could not reset password' }, { status: 500 });
  }

  const { token: sessionToken, user } = createSessionForProfile(
    updatedProfile as Record<string, unknown>
  );
  const response = NextResponse.json({
    token: sessionToken,
    user,
    redirect_to: params.redirectTo,
  });
  applyAuthCookie(response, sessionToken);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkPersistentRateLimit(
      `password-reset:${getClientIp(request)}`,
      8,
      15 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const resetToken = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const submittedRedirect = typeof body.redirect_to === 'string' ? body.redirect_to : '/dashboard';
    const redirectFallback = getAuthActionSafeNextPath(submittedRedirect);
    const redirectTo = appendAuthNotice(redirectFallback, 'password_reset_success');

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be more than 8 characters' },
        { status: 400 }
      );
    }

    if (!resetToken) {
      const email = normalizeEmailAddress(typeof body.email === 'string' ? body.email : null);
      const username = normalizeAuthUsername(typeof body.username === 'string' ? body.username : null);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !username) {
        return NextResponse.json(
          { error: 'Enter the matching username and email first.' },
          { status: 400 }
        );
      }

      const identityRateLimit = await checkPersistentRateLimit(
        `password-reset-identity:${username}:${email}`,
        3,
        60 * 60 * 1000
      );
      if (!identityRateLimit.allowed) {
        return rateLimitResponse(identityRateLimit.retryAfterSeconds);
      }

      const profile = await getProfileForUsernameEmail({ username, email });
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

      return completePasswordReset({
        profile,
        password,
        redirectTo,
      });
    }

    const tokenRow = await getAuthActionToken(resetToken);
    const tokenState = getAuthActionTokenState(tokenRow);
    const tokenRedirectTo = appendAuthNotice(
      getAuthActionSafeNextPath(tokenRow?.next_path ?? redirectFallback),
      'password_reset_success'
    );

    if (!tokenRow || tokenRow.purpose !== 'password_reset') {
      return NextResponse.json({ error: 'That reset link is invalid or already used.' }, { status: 400 });
    }

    if (tokenState === 'expired' || tokenState === 'consumed') {
      return NextResponse.json({ error: 'That reset link expired. Request a fresh one.' }, { status: 410 });
    }

    if (tokenState !== 'valid') {
      return NextResponse.json({ error: 'That reset link is invalid or already used.' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', tokenRow.user_id)
      .single();

    if (profileError || !currentProfile || normalizeEmailAddress(currentProfile.email) !== tokenRow.email) {
      if (profileError) {
        console.error('[Password Reset] Profile lookup error:', profileError);
      }

      return NextResponse.json({ error: 'That reset link is invalid or already used.' }, { status: 400 });
    }

    if (currentProfile.is_banned) {
      return NextResponse.json(
        { error: `Account suspended: ${currentProfile.ban_reason ?? 'Contact support.'}` },
        { status: 403 }
      );
    }

    const consumed = await consumeAuthActionToken(tokenRow.id);
    if (!consumed) {
      return NextResponse.json({ error: 'That reset link expired. Request a fresh one.' }, { status: 410 });
    }

    return completePasswordReset({
      profile: currentProfile as Record<string, unknown>,
      password,
      redirectTo: tokenRedirectTo,
    });
  } catch (error) {
    console.error('[Password Reset] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
