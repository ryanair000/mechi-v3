import { NextRequest, NextResponse } from 'next/server';
import {
  appendAuthNotice,
  consumeAuthActionToken,
  getAuthActionSafeNextPath,
  getAuthActionToken,
  getAuthActionTokenState,
  normalizeEmailAddress,
} from '@/lib/auth-actions';
import { applyAuthCookie, createSessionForProfile, hashPassword } from '@/lib/auth';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 9;

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

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be more than 8 characters' },
        { status: 400 }
      );
    }

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Use the password reset link from your email.' },
        { status: 400 }
      );
    }

    const tokenRow = await getAuthActionToken(resetToken);
    const tokenState = getAuthActionTokenState(tokenRow);
    const redirectTo = appendAuthNotice(
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
    const response = NextResponse.json({ token: sessionToken, user, redirect_to: redirectTo });
    applyAuthCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error('[Password Reset] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
