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
  '/tutorials',
  '/api/queue',
  '/api/challenges',
  '/api/matches',
  '/api/notifications',
  '/api/subscriptions',
  '/api/users',
  '/api/lobbies',
  '/api/suggestions',
  '/api/tournaments',
  '/api/rewards',
];

const ADMIN_PREFIXES = ['/admin', '/api/admin'];
const CONNECT_HOSTS = new Set(['connect.mechi.club']);

const ADMIN_HOST_PATH_ALIASES: Record<string, string> = {
  '/': '/admin',
  '/users': '/admin/users',
  '/matches': '/admin/matches',
  '/support': '/admin/support',
  '/whatsapp': '/admin/whatsapp',
  '/instagram': '/admin/instagram',
  '/logs': '/admin/logs',
  '/rewards': '/admin/rewards',
};

const PUBLIC_PREFIXES = [
  '/',
  '/connect',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
  '/user-data-deletion',
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

const ADMIN_HOST_LOCAL_PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/banned',
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

function isDashboardRoute(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function isAdminHostLocalPublicPath(pathname: string) {
  return ADMIN_HOST_LOCAL_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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

function redirectToAppHost(pathname: string, request: NextRequest) {
  return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, APP_URL));
}

function base64UrlDecode(value: string) {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`;
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

function base64UrlToUint8Array(value: string) {
  const decoded = base64UrlDecode(value);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerSegment, payloadSegment, signatureSegment] = parts;
    const secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      return null;
    }

    const header = JSON.parse(base64UrlDecode(headerSegment)) as { alg?: string };
    if (header.alg !== 'HS256') {
      return null;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signatureValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToUint8Array(signatureSegment),
      new TextEncoder().encode(`${headerSegment}.${payloadSegment}`)
    );

    if (!signatureValid) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(payloadSegment)) as JWTPayload;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function getAuthState(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;
  const cookieToken = request.cookies.get('auth_token')?.value;

  if (headerToken) {
    const payload = await verifyToken(headerToken);
    if (payload) {
      return { token: headerToken, payload };
    }
  }

  if (cookieToken) {
    const payload = await verifyToken(cookieToken);
    if (payload) {
      return { token: cookieToken, payload };
    }
  }

  return {
    token: headerToken ?? cookieToken ?? null,
    payload: null,
  };
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

  return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, ADMIN_URL));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = getRequestHost(request);

  if (CONNECT_HOSTS.has(host) && pathname === '/') {
    const connectUrl = request.nextUrl.clone();
    connectUrl.pathname = '/connect';
    return NextResponse.rewrite(connectUrl);
  }

  const adminHost = host === ADMIN_HOST;
  const adminHostAlias = adminHost ? getAdminHostAlias(pathname) : null;
  const effectivePathname = adminHostAlias ?? pathname;

  if (adminHost && !pathname.startsWith('/api/')) {
    const keepOnAdminHost =
      isAdminRoute(effectivePathname) ||
      isDashboardRoute(effectivePathname) ||
      isAdminHostLocalPublicPath(pathname);

    if (!keepOnAdminHost) {
      return redirectToAppHost(pathname, request);
    }
  }

  const { payload } = await getAuthState(request);
  const needsProtectedAccess =
    isAdminRoute(effectivePathname) || isProtectedRoute(effectivePathname);
  const access =
    payload && needsProtectedAccess ? await getCurrentAccess(payload) : null;

  if ((effectivePathname === '/login' || effectivePathname === '/register') && payload) {
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
    if (!payload || !access) {
      return unauthorizedResponse(effectivePathname, request);
    }

    if (access.is_banned) {
      return forbiddenResponse(effectivePathname, request, 'Your account has been suspended.');
    }
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
