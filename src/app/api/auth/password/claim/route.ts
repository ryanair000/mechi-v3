import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookie, createSessionForProfile, hashPassword } from '@/lib/auth';
import { getAuthActionSafeNextPath } from '@/lib/auth-actions';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 9;

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(`password-claim:${getClientIp(request)}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = await request.json();
    const username = String(body.username ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const nextPath = getAuthActionSafeNextPath(String(body.redirect_to ?? '/dashboard'));

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be more than 8 characters.' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No player matched that username and email.' }, { status: 404 });
    }

    if (profile.is_banned) {
      return NextResponse.json(
        { error: `Account suspended: ${profile.ban_reason ?? 'Contact support.'}` },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword(password);
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('id', profile.id)
      .select('*')
      .single();

    if (updateError || !updatedProfile) {
      console.error('[Password Claim] Update error:', updateError);
      return NextResponse.json({ error: 'Could not update password.' }, { status: 500 });
    }

    const { token, user } = createSessionForProfile(updatedProfile as Record<string, unknown>);
    const response = NextResponse.json({
      success: true,
      message: 'Password updated. You are signed in now.',
      token,
      user,
      redirect_to: nextPath,
    });
    applyAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error('[Password Claim] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
