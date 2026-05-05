import { NextRequest, NextResponse } from 'next/server';
import {
  appendAuthError,
  appendAuthNotice,
  consumeAuthActionToken,
  getAuthActionToken,
  getAuthActionTokenState,
  normalizeEmailAddress,
} from '@/lib/auth-actions';
import { applyAuthCookie, createSessionForProfile } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL(appendAuthError('magic_link_invalid'), request.url), {
      status: 303,
    });
  }

  try {
    const tokenRow = await getAuthActionToken(token);
    const tokenState = getAuthActionTokenState(tokenRow);
    const nextPath = tokenRow?.next_path ?? '/dashboard';

    if (!tokenRow || tokenRow.purpose !== 'magic_link_signin') {
      return NextResponse.redirect(new URL(appendAuthError('magic_link_invalid', nextPath), request.url), {
        status: 303,
      });
    }

    if (tokenState === 'expired' || tokenState === 'consumed') {
      return NextResponse.redirect(new URL(appendAuthError('magic_link_expired', nextPath), request.url), {
        status: 303,
      });
    }

    if (tokenState !== 'valid') {
      return NextResponse.redirect(new URL(appendAuthError('magic_link_invalid', nextPath), request.url), {
        status: 303,
      });
    }

    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', tokenRow.user_id)
      .single();

    if (
      error ||
      !profile ||
      profile.is_banned ||
      normalizeEmailAddress(profile.email) !== tokenRow.email
    ) {
      return NextResponse.redirect(new URL(appendAuthError('magic_link_invalid', nextPath), request.url), {
        status: 303,
      });
    }

    const consumed = await consumeAuthActionToken(tokenRow.id);
    if (!consumed) {
      return NextResponse.redirect(new URL(appendAuthError('magic_link_expired', nextPath), request.url), {
        status: 303,
      });
    }

    const { token: sessionToken } = createSessionForProfile(profile as Record<string, unknown>);
    const response = NextResponse.redirect(
      new URL(appendAuthNotice(nextPath, 'magic_link_success'), request.url),
      { status: 303 }
    );

    applyAuthCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error('[Magic Link Consume] Error:', error);
    return NextResponse.redirect(new URL(appendAuthError('magic_link_invalid'), request.url), {
      status: 303,
    });
  }
}
