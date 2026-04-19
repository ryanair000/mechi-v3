import { NextRequest, NextResponse } from 'next/server';
import {
  appendAuthNotice,
  consumeAuthActionToken,
  getAuthActionToken,
  getAuthActionTokenState,
} from '@/lib/auth-actions';
import { applyAuthCookie, createSessionForProfile, hashPassword } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 9;

function getTokenErrorResponse(status: 'invalid' | 'expired') {
  return NextResponse.json(
    {
      error:
        status === 'expired'
          ? 'That reset link expired. Request a fresh one.'
          : 'That reset link is invalid or already used.',
      code: status === 'expired' ? 'password_reset_expired' : 'password_reset_invalid',
    },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(`password-reset:${getClientIp(request)}`, 8, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    const token = String(body.token ?? '').trim();
    const password = String(body.password ?? '');

    if (!token) {
      return getTokenErrorResponse('invalid');
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be more than 8 characters' },
        { status: 400 }
      );
    }

    const tokenRow = await getAuthActionToken(token);
    const tokenState = getAuthActionTokenState(tokenRow);

    if (!tokenRow || tokenRow.purpose !== 'password_reset') {
      return getTokenErrorResponse('invalid');
    }

    if (tokenState === 'expired' || tokenState === 'consumed') {
      return getTokenErrorResponse('expired');
    }

    if (tokenState !== 'valid') {
      return getTokenErrorResponse('invalid');
    }

    const supabase = createServiceClient();
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', tokenRow.user_id)
      .single();

    if (profileError || !currentProfile) {
      return getTokenErrorResponse('invalid');
    }

    if (currentProfile.is_banned) {
      return NextResponse.json(
        { error: `Account suspended: ${currentProfile.ban_reason ?? 'Contact support.'}` },
        { status: 403 }
      );
    }

    const consumed = await consumeAuthActionToken(tokenRow.id);
    if (!consumed) {
      return getTokenErrorResponse('expired');
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
    const redirectTo = appendAuthNotice(tokenRow.next_path ?? '/dashboard', 'password_reset_success');
    const response = NextResponse.json({ token: sessionToken, user, redirect_to: redirectTo });
    applyAuthCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error('[Password Reset] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
