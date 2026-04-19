import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { applyAuthCookie, createSessionForProfile, verifyPassword } from '@/lib/auth';
import { getSafeNextPath } from '@/lib/navigation';
import { getPhoneLookupVariants, normalizePhoneNumber } from '@/lib/phone';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import type { CountryKey, Plan, UserRole } from '@/types';

interface AuthenticatedProfile {
  id: string;
  username: string;
  phone: string;
  email: string | null;
  invite_code?: string | null;
  invited_by?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean | null;
  country?: CountryKey | null;
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
  plan?: Plan | null;
  plan_since?: string | null;
  plan_expires_at?: string | null;
}

type LoginMethod = 'auto' | 'email' | 'phone' | 'username';

type AuthFailure = {
  error: string;
  status: 400 | 401 | 403;
};

type AuthSuccess = {
  profile: AuthenticatedProfile;
};

function detectIdentifierType(identifier: string): Exclude<LoginMethod, 'auto'> {
  if (identifier.includes('@')) {
    return 'email';
  }

  if (/^[+\d][\d\s\-()]{7,}$/.test(identifier)) {
    return 'phone';
  }

  return 'username';
}

function parseLoginMethod(value: unknown): LoginMethod {
  return value === 'email' || value === 'phone' || value === 'username' ? value : 'auto';
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

async function getCandidateProfiles(identifier: string, loginMethod: LoginMethod) {
  const supabase = createServiceClient();
  const trimmedIdentifier = identifier.trim();
  const method = loginMethod === 'auto' ? detectIdentifierType(trimmedIdentifier) : loginMethod;

  if (method === 'email') {
    const result = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', trimmedIdentifier.toLowerCase())
      .limit(1);

    return {
      profiles: (result.data as AuthenticatedProfile[] | null) ?? [],
      error: result.error,
    };
  }

  if (method === 'phone') {
    const phoneVariants = getPhoneLookupVariants(normalizePhoneNumber(trimmedIdentifier));
    const result = await supabase
      .from('profiles')
      .select('*')
      .in('phone', phoneVariants)
      .limit(10);

    return {
      profiles: (result.data as AuthenticatedProfile[] | null) ?? [],
      error: result.error,
    };
  }

  const result = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', trimmedIdentifier)
    .limit(1);

  return {
    profiles: (result.data as AuthenticatedProfile[] | null) ?? [],
    error: result.error,
  };
}

async function authenticateUser(
  identifier: string,
  password: string,
  loginMethod: LoginMethod
): Promise<AuthFailure | AuthSuccess> {
  if (!identifier || !password) {
    return { error: 'Identifier and password are required', status: 400 };
  }

  const { profiles, error } = await getCandidateProfiles(identifier, loginMethod);
  if (error || profiles.length === 0) {
    return { error: 'Account not found. Check your details.', status: 401 };
  }

  for (const profile of profiles) {
    const isValid = await verifyPassword(password, profile.password_hash);
    if (!isValid) {
      continue;
    }

    if (profile.is_banned) {
      return {
        error: `Account suspended: ${profile.ban_reason ?? 'Contact support.'}`,
        status: 403,
      };
    }

    return { profile };
  }

  return { error: 'Incorrect password', status: 401 };
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
    const loginMethod = parseLoginMethod(payload.login_method);
    const redirectTo = getSafeNextPath(String(payload.redirect_to ?? '/dashboard'), '/dashboard');
    const requestOrigin = getRequestOrigin(request);

    const result = await authenticateUser(identifier, password, loginMethod);
    if ('error' in result) {
      if (isJsonRequest) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      const loginUrl = new URL('/login', requestOrigin);
      loginUrl.searchParams.set('auth_error', result.error);
      if (redirectTo !== '/dashboard') {
        loginUrl.searchParams.set('next', redirectTo);
      }
      return NextResponse.redirect(loginUrl, { status: 303 });
    }

    const { token, user } = createSessionForProfile(
      result.profile as unknown as Record<string, unknown>
    );
    const response = isJsonRequest
      ? NextResponse.json({ token, user })
      : NextResponse.redirect(new URL(redirectTo, requestOrigin), { status: 303 });

    applyAuthCookie(response, token);
    return response;
  } catch (err) {
    console.error('[Login] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
