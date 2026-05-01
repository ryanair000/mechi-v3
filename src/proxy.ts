import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/types';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { ADMIN_HOST as CONFIGURED_ADMIN_HOST, ADMIN_URL, APP_HOST, APP_URL } from '@/lib/urls';

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
  '/inbox',
  '/challenges',
  '/matches',
  '/notifications',
  '/share',
  '/socials',
  '/rewards',
  '/streams',
  '/suggest',
  '/api/queue',
  '/api/challenges',
  '/api/inbox',
  '/api/matches',
  '/api/notifications',
  '/api/subscriptions',
  '/api/users',
  '/api/lobbies',
  '/api/suggestions',
  '/api/tournaments',
  '/api/rewards',
];
const HIDDEN_PREFIXES = ['/tutorial', '/tutorials'];

const ADMIN_PREFIXES = ['/admin', '/api/admin'];
const TESTS_HOSTS = new Set(['tests.mechi.club']);
const LOCAL_APP_HOSTS = new Set(['localhost', '127.0.0.1']);
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CANONICAL_ADMIN_HOST = 'mechi.lokimax.top';
const ADMIN_HOSTS = new Set([CONFIGURED_ADMIN_HOST, CANONICAL_ADMIN_HOST]);
const EXTRA_ALLOWED_ORIGIN_HOSTS = new Set([
  'mechi-v3.vercel.app',
  'localhost',
  '127.0.0.1',
  'admin.localhost',
]);
const CROSS_ORIGIN_API_EXEMPT_PREFIXES = [
  '/api/instagram/webhook',
  '/api/webhooks/instagram',
  '/api/whatsapp/webhook',
  '/api/paystack/webhook',
  '/api/streams/webhook',
  '/api/integrations/chezahub/order-event',
];
const API_RATE_LIMIT_POLICIES = [
  { prefix: '/api/auth/login', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/register', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/signup', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/password', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/magic-link', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/admin', limit: 180, windowMs: 5 * 60 * 1000 },
  { prefix: '/api/events/mechi-online-gaming-tournament/results', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/events/mechi-online-gaming-tournament/register', limit: 60, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/subscriptions', limit: 45, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/rewards/redeem', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/streams', limit: 90, windowMs: 5 * 60 * 1000 },
];
const DEFAULT_UNSAFE_API_RATE_LIMIT = { limit: 240, windowMs: 5 * 60 * 1000 };

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
  '/manual-tests',
  '/report',
  '/reports',
  '/results',
  '/login',
  '/register',
  '/signup',
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
  '/api/test-reports',
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
  '/signup',
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

function isHiddenRoute(pathname: string) {
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isDashboardRoute(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function isAdminHostLocalPublicPath(pathname: string) {
  return ADMIN_HOST_LOCAL_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function normalizeHost(value: string | null | undefined) {
  const firstHost = value?.split(',')[0]?.trim() ?? '';
  return firstHost.split(':')[0].toLowerCase();
}

function getRequestHost(request: NextRequest) {
  return (
    normalizeHost(request.headers.get('host')) ||
    normalizeHost(request.nextUrl.host) ||
    normalizeHost(request.headers.get('x-forwarded-host'))
  );
}

function isAdminHost(request: NextRequest) {
  return ADMIN_HOSTS.has(getRequestHost(request));
}

function isCrossOriginApiExempt(pathname: string) {
  return CROSS_ORIGIN_API_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getAllowedOriginHosts(request: NextRequest) {
  return new Set([
    APP_HOST,
    CONFIGURED_ADMIN_HOST,
    CANONICAL_ADMIN_HOST,
    getRequestHost(request),
    ...EXTRA_ALLOWED_ORIGIN_HOSTS,
  ]);
}

function isAllowedUnsafeOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }

  try {
    const originHost = normalizeHost(new URL(origin).host);
    return getAllowedOriginHosts(request).has(originHost);
  } catch {
    return false;
  }
}

function getApiRateLimitPolicy(pathname: string) {
  return (
    API_RATE_LIMIT_POLICIES.find((policy) => pathname.startsWith(policy.prefix)) ??
    DEFAULT_UNSAFE_API_RATE_LIMIT
  );
}

function blockedRequestResponse(message = 'Bad request') {
  return NextResponse.json(
    { error: message },
    {
      status: 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

function rateLimitedApiResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Remaining': '0',
        'Cache-Control': 'no-store',
      },
    }
  );
}

function applyApiIngressGuards(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (request.headers.has('x-middleware-subrequest')) {
    return blockedRequestResponse();
  }

  if (!pathname.startsWith('/api/') || !UNSAFE_METHODS.has(request.method)) {
    return null;
  }

  if (!isCrossOriginApiExempt(pathname) && !isAllowedUnsafeOrigin(request)) {
    return NextResponse.json(
      { error: 'Cross-origin request blocked' },
      {
        status: 403,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  const policy = getApiRateLimitPolicy(pathname);
  const rateLimit = checkRateLimit(
    `proxy:${pathname}:${getClientIp(request)}`,
    policy.limit,
    policy.windowMs
  );

  if (!rateLimit.allowed) {
    return rateLimitedApiResponse(rateLimit.retryAfterSeconds);
  }

  return null;
}

function getAdminHostAlias(pathname: string) {
  return ADMIN_HOST_PATH_ALIASES[pathname] ?? null;
}

function redirectToAppHost(pathname: string, request: NextRequest) {
  return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, APP_URL));
}

function clearAuthCookie(response: NextResponse) {
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
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
  return clearAuthCookie(NextResponse.redirect(new URL(getLoginPath(nextPath), request.url)));
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
  const adminHost = ADMIN_HOSTS.has(host);
  const sharedLocalHost = adminHost && host === APP_HOST;
  const guardedResponse = applyApiIngressGuards(request);

  if (guardedResponse) {
    return guardedResponse;
  }

  if (TESTS_HOSTS.has(host) && pathname === '/') {
    const testsUrl = request.nextUrl.clone();
    testsUrl.pathname = '/manual-tests';
    return NextResponse.rewrite(testsUrl);
  }

  if (
    process.env.NODE_ENV === 'production' &&
    LOCAL_APP_HOSTS.has(host) &&
    pathname === '/'
  ) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  const adminHostAlias = adminHost && !sharedLocalHost ? getAdminHostAlias(pathname) : null;
  const effectivePathname = adminHostAlias ?? pathname;

  if (pathname === '/feed' || pathname.startsWith('/feed/')) {
    const notificationsUrl = request.nextUrl.clone();
    notificationsUrl.pathname = '/notifications';
    notificationsUrl.search = request.nextUrl.search;
    return NextResponse.redirect(notificationsUrl);
  }

  if (pathname === '/profile/settings' || pathname.startsWith('/profile/settings/')) {
    const profileUrl = request.nextUrl.clone();
    profileUrl.pathname = '/profile';
    profileUrl.search = '';
    return NextResponse.redirect(profileUrl);
  }

  if (isHiddenRoute(effectivePathname)) {
    const hiddenRouteRedirect = request.nextUrl.clone();
    hiddenRouteRedirect.pathname = '/dashboard';
    hiddenRouteRedirect.search = '';
    return NextResponse.redirect(hiddenRouteRedirect);
  }

  if (adminHost && !pathname.startsWith('/api/')) {
    const keepOnAdminHost =
      isAdminRoute(effectivePathname) ||
      isDashboardRoute(effectivePathname) ||
      isAdminHostLocalPublicPath(pathname) ||
      sharedLocalHost;

    if (!keepOnAdminHost) {
      return redirectToAppHost(pathname, request);
    }
  }

  const { payload } = await getAuthState(request);
  const needsProtectedAccess =
    isAdminRoute(effectivePathname) || isProtectedRoute(effectivePathname);
  const access =
    payload && needsProtectedAccess ? await getCurrentAccess(payload) : null;

  if (
    (effectivePathname === '/login' ||
      effectivePathname === '/register' ||
      effectivePathname === '/signup') &&
    payload &&
    access
  ) {
    const fallbackPath =
      adminHost && !access.is_banned && hasPrimaryAdminAccess(access)
        ? '/admin'
        : '/dashboard';
    const nextPath = getSafeNextPath(request.nextUrl.searchParams.get('next'), fallbackPath);
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (
    (effectivePathname === '/login' ||
      effectivePathname === '/register' ||
      effectivePathname === '/signup') &&
    payload &&
    !access
  ) {
    return clearAuthCookie(NextResponse.next());
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
