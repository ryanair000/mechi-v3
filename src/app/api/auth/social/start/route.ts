import { NextRequest, NextResponse } from 'next/server';

const SOCIAL_AUTH_PROVIDERS = new Set(['google', 'facebook']);

function getSupabaseAuthUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl}/auth/v1/authorize`;
}

function isAllowedRedirect(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'mechi:' || url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const provider = String(body.provider ?? '').trim().toLowerCase();
    const redirectTo = String(body.redirect_to ?? '').trim();
    const authorizeBase = getSupabaseAuthUrl();

    if (!SOCIAL_AUTH_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Pick Google or Facebook login' }, { status: 400 });
    }

    if (!redirectTo || !isAllowedRedirect(redirectTo)) {
      return NextResponse.json({ error: 'Social login redirect is invalid' }, { status: 400 });
    }

    if (!authorizeBase || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
      return NextResponse.json({ error: 'Social login is not configured yet' }, { status: 503 });
    }

    const authorizationUrl = new URL(authorizeBase);
    authorizationUrl.searchParams.set('provider', provider);
    authorizationUrl.searchParams.set('redirect_to', redirectTo);

    return NextResponse.json({ authorization_url: authorizationUrl.toString() });
  } catch (error) {
    console.error('[SocialAuthStart] Error:', error);
    return NextResponse.json({ error: 'Could not start social login' }, { status: 500 });
  }
}
