import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/types';
import { createServiceClient } from '@/lib/supabase';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/match',
  '/queue',
  '/tournaments',
  '/t/',
  '/lobbies',
  '/leaderboard',
  '/suggest',
  '/api/queue',
  '/api/matches',
  '/api/users',
  '/api/lobbies',
  '/api/suggestions',
  '/api/tournaments',
];

const ADMIN_PREFIXES = ['/admin', '/api/admin'];

const PUBLIC_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/banned',
  '/api/auth',
  '/api/og',
  '/api/share',
  '/s/',
  '/_next',
  '/favicon',
  '/icon',
  '/robots',
  '/sitemap',
];

function isPublic(pathname: string) {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((prefix) => prefix !== '/' && pathname.startsWith(prefix));
}

function isAdminRoute(pathname: string) {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedRoute(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function base64UrlDecode(value: string) {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`;
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1])) as JWTPayload;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function getPayload(request: NextRequest) {
  const token = getToken(request);

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

function getToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  const cookieToken = request.cookies.get('auth_token')?.value;

  return headerToken ?? cookieToken ?? null;
}

async function getCurrentAccess(payload: JWTPayload | null) {
  if (!payload?.sub) {
    return null;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', payload.sub)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    role: (data.role as JWTPayload['role']) ?? 'user',
    is_banned: Boolean(data.is_banned),
  };
}

function forbiddenResponse(pathname: string, request: NextRequest, message = 'Forbidden') {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}

function unauthorizedResponse(pathname: string, request: NextRequest) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getToken(request);
  const payload = getPayload(request);

  if ((pathname === '/login' || pathname === '/register') && payload) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isPublic(pathname) && !isAdminRoute(pathname)) {
    return NextResponse.next();
  }

  if (isAdminRoute(pathname)) {
    if (!payload) return unauthorizedResponse(pathname, request);
    const access = await getCurrentAccess(payload);
    if (!access) return unauthorizedResponse(pathname, request);
    if (access.role !== 'admin' && access.role !== 'moderator') {
      return forbiddenResponse(pathname, request);
    }
    if (access.is_banned) {
      return forbiddenResponse(pathname, request, 'Your account has been suspended.');
    }
    return NextResponse.next();
  }

  if (isProtectedRoute(pathname)) {
    if (!token) return unauthorizedResponse(pathname, request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
