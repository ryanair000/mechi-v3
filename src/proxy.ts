import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/types';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';
import { createServiceClient } from '@/lib/supabase';
import { ADMIN_HOST, ADMIN_URL, APP_URL } from '@/lib/urls';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/games',
  '/match',
  '/queue',
  '/tournaments',
  '/t/',
  '/lobbies',
  '/leaderboard',
  '/challenges',
  '/notifications',
  '/share',
  '/suggest',
  '/api/queue',
  '/api/challenges',
  '/api/matches',
  '/api/notifications',
  '/api/users',
  '/api/lobbies',
  '/api/suggestions',
  '/api/tournaments',
];

const ADMIN_PREFIXES = ['/admin', '/api/admin'];

const ADMIN_HOST_PATH_ALIASES: Record<string, string> = {
  '/': '/admin',
  '/users': '/admin/users',
  '/queue': '/admin/queue',
  '/lobbies': '/admin/lobbies',
  '/matches': '/admin/matches',
  '/tournaments': '/admin/tournaments',
  '/support': '/admin/support',
  '/whatsapp': '/admin/whatsapp',
  '/logs': '/admin/logs',
};

const PUBLIC_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/banned',
  '/api/auth',
  '/api/invite',
  '/api/og',
  '/api/share',
  '/join/',
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

function getRequestHost(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    request.nextUrl.host
  )
    .split(':')[0]
    .toLowerCase();
}

function isAdminHost(request: NextRequest) {
  return getRequestHost(request) === ADMIN_HOST;
}

function getAdminHostAlias(pathname: string) {
  return ADMIN_HOST_PATH_ALIASES[pathname] ?? null;
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
    .select('phone, role, is_banned')
    .eq('id', payload.sub)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    phone: (data.phone as string | null | undefined) ?? '',
    role: (data.role as JWTPayload['role']) ?? 'user',
    is_banned: Boolean(data.is_banned),
  };
}

function forbiddenResponse(pathname: string, request: NextRequest, message = 'Forbidden') {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  if (isAdminHost(request)) {
    return NextResponse.redirect(new URL('/dashboard', APP_URL));
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}

function unauthorizedResponse(pathname: string, request: NextRequest) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nextPath = `${pathname}${request.nextUrl.search}`;
  return NextResponse.redirect(new URL(getLoginPath(nextPath), request.url));
}

function adminHostOnlyResponse(pathname: string, request: NextRequest) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Admin API is only available on mechi.lokimax.top' },
      { status: 404 }
    );
  }

  const redirectUrl = new URL(`${ADMIN_URL}${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(redirectUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminHost = isAdminHost(request);
  const adminHostAlias = adminHost ? getAdminHostAlias(pathname) : null;
  const effectivePathname = adminHostAlias ?? pathname;
  const token = getToken(request);
  const payload = getPayload(request);

  if ((effectivePathname === '/login' || effectivePathname === '/register') && payload) {
    const access = await getCurrentAccess(payload);
    const fallbackPath =
      adminHost && access && !access.is_banned && hasPrimaryAdminAccess(access)
        ? '/admin'
        : '/dashboard';
    const nextPath = getSafeNextPath(request.nextUrl.searchParams.get('next'), fallbackPath);
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (isPublic(effectivePathname) && !isAdminRoute(effectivePathname)) {
    return NextResponse.next();
  }

  if (isAdminRoute(effectivePathname)) {
    if (!adminHost) {
      return adminHostOnlyResponse(effectivePathname, request);
    }
    if (!payload) return unauthorizedResponse(effectivePathname, request);
    const access = await getCurrentAccess(payload);
    if (!access) return unauthorizedResponse(effectivePathname, request);
    if (!hasPrimaryAdminAccess(access)) {
      return forbiddenResponse(effectivePathname, request);
    }
    if (access.is_banned) {
      return forbiddenResponse(effectivePathname, request, 'Your account has been suspended.');
    }
    if (adminHostAlias) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = adminHostAlias;
      return NextResponse.rewrite(rewriteUrl);
    }
    return NextResponse.next();
  }

  if (isProtectedRoute(effectivePathname)) {
    if (!token) return unauthorizedResponse(effectivePathname, request);
  }

  if (adminHostAlias) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = adminHostAlias;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
