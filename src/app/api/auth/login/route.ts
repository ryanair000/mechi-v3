import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyPassword, signToken, profileToAuthUser } from '@/lib/auth';
import { getPhoneLookupVariants, normalizePhoneNumber } from '@/lib/phone';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import type { UserRole } from '@/types';

interface AuthenticatedProfile {
  id: string;
  username: string;
  phone: string;
  email: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean | null;
  region: string;
  platforms: string[] | null;
  game_ids: Record<string, string> | null;
  selected_games: string[] | null;
  password_hash: string;
  role?: UserRole | null;
  is_banned?: boolean | null;
  ban_reason?: string | null;
  xp?: number | null;
  level?: number | null;
  mp?: number | null;
  win_streak?: number | null;
  max_win_streak?: number | null;
}

type AuthFailure = {
  error: string;
  status: 400 | 401 | 403;
};

type AuthSuccess = {
  profile: AuthenticatedProfile;
};

function detectIdentifierType(identifier: string): 'email' | 'phone' | 'username' {
  if (identifier.includes('@')) {
    return 'email';
  }

  if (/^[+\d][\d\s\-()]{7,}$/.test(identifier)) {
    return 'phone';
  }

  return 'username';
}

function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (forwardedHost) {
    const protocol = forwardedProto ?? (request.nextUrl.protocol.replace(':', '') || 'http');
    return `${protocol}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

function getSafeRedirectPath(value: string) {
  if (!value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }

  return value;
}

async function authenticateUser(identifier: string, password: string): Promise<AuthFailure | AuthSuccess> {
  if (!identifier || !password) {
    return { error: 'Identifier and password are required', status: 400 as const };
  }

  const supabase = createServiceClient();
  const trimmedIdentifier = identifier.trim();
  const type = detectIdentifierType(trimmedIdentifier);
  let profiles: AuthenticatedProfile[] | null = null;
  let error: { message?: string } | null = null;

  if (type === 'email') {
    const result = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', trimmedIdentifier.toLowerCase())
      .limit(1);

    profiles = result.data as AuthenticatedProfile[] | null;
    error = result.error;
  } else if (type === 'phone') {
    const phoneVariants = getPhoneLookupVariants(normalizePhoneNumber(trimmedIdentifier));
    const result = await supabase
      .from('profiles')
      .select('*')
      .in('phone', phoneVariants)
      .limit(1);

    profiles = result.data as AuthenticatedProfile[] | null;
    error = result.error;
  } else {
    const result = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', trimmedIdentifier)
      .limit(1);

    profiles = result.data as AuthenticatedProfile[] | null;
    error = result.error;
  }

  const profile = profiles?.[0] as AuthenticatedProfile | undefined;

  if (error || !profile) {
    return { error: 'Account not found. Check your details.', status: 401 as const };
  }

  if (profile.is_banned) {
    return {
      error: `Account suspended: ${profile.ban_reason ?? 'Contact support.'}`,
      status: 403 as const,
    };
  }

  const isValid = await verifyPassword(password, profile.password_hash);
  if (!isValid) {
    return { error: 'Incorrect password', status: 401 as const };
  }

  return { profile };
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(`login:${getClientIp(request)}`, 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const contentType = request.headers.get('content-type') ?? '';
    const isJsonRequest = contentType.includes('application/json');

    const payload = isJsonRequest
      ? await request.json()
      : Object.fromEntries(await request.formData());

    const identifier = String(payload.identifier ?? payload.phone ?? '');
    const password = String(payload.password ?? '');
    const redirectTo = getSafeRedirectPath(String(payload.redirect_to ?? '/dashboard'));
    const requestOrigin = getRequestOrigin(request);

    const result = await authenticateUser(identifier, password);
    if ('error' in result) {
      const errorMessage = result.error;

      if (isJsonRequest) {
        return NextResponse.json({ error: errorMessage }, { status: result.status });
      }

      const loginUrl = new URL('/login', requestOrigin);
      loginUrl.searchParams.set('error', errorMessage);
      return NextResponse.redirect(loginUrl, { status: 303 });
    }

    const { profile } = result;

    const token = signToken({
      sub: profile.id,
      username: profile.username,
      role: profile.role ?? 'user',
      is_banned: Boolean(profile.is_banned),
    });

    const response = isJsonRequest
      ? NextResponse.json({
          token,
          user: profileToAuthUser(profile as unknown as Record<string, unknown>),
        })
      : NextResponse.redirect(new URL(redirectTo, requestOrigin), { status: 303 });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Login] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
