import { NextRequest, NextResponse } from 'next/server';
import type { CountryKey, JWTPayload } from '@/types';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import {
  getLoginPath,
  getModeratorLoginPath,
  getPostLoginRedirectPath,
} from '@/lib/navigation';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import {
  AFRICAN_COUNTRY_KEYS,
  getCountryIso2,
  getCountrySlug,
} from '@/lib/location';
import {
  getCountryFromIpHeaders,
  getRegionalPreferenceCookieOptions,
  REGIONAL_PREFERENCE_COOKIE_NAME,
} from '@/lib/regional-settings';
import { createServiceClient } from '@/lib/supabase';
import { ADMIN_HOST as CONFIGURED_ADMIN_HOST, ADMIN_URL, APP_HOST, APP_URL } from '@/lib/urls';

const PROTECTED_PREFIXES = [
  '/app/',
  '/dashboard',
  '/profile',
  '/games',
  '/match',
  '/queue',
  '/t/',
  '/lobbies',
  '/inbox',
  '/challenges',
  '/matches',
  '/notifications',
  '/share',
  '/socials',
  '/rewards',
  '/streams',
  '/suggest',
  '/moderators',
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
  '/api/moderators',
];
const HIDDEN_PREFIXES = ['/tutorial', '/tutorials'];
const REGIONAL_ROUTE_CONFIGS: Array<{
  pathPrefix: string;
  country: CountryKey;
  countryCode: string;
  acceptLanguage: string;
}> = AFRICAN_COUNTRY_KEYS.map((country) => {
  const countryCode = getCountryIso2(country);
  return {
    pathPrefix: `/${getCountrySlug(country)}`,
    country,
    countryCode,
    acceptLanguage:
      country === 'tanzania'
        ? 'sw-TZ,sw;q=0.9,en;q=0.8'
        : `en-${countryCode},en;q=0.9,sw;q=0.7`,
  };
});

const ADMIN_PREFIXES = ['/admin', '/api/admin'];
const TESTS_HOSTS = new Set(['tests.mechi.club']);
const LOCAL_APP_HOSTS = new Set(['localhost', '127.0.0.1']);
const LOCAL_DEV_ORIGIN_HOSTS = new Set(['localhost', '127.0.0.1']);
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CANONICAL_ADMIN_HOST = 'mechi.lokimax.top';
const ADMIN_HOSTS = new Set([CONFIGURED_ADMIN_HOST, CANONICAL_ADMIN_HOST]);
const EXTRA_ALLOWED_ORIGIN_HOSTS = new Set([
  'mechi-v3.vercel.app',
  'localhost',
  '127.0.0.1',
  'admin.localhost',
]);
const SENTRY_TUNNEL_PREFIXES = ['/api/monitoring'];
const CROSS_ORIGIN_API_EXEMPT_PREFIXES = [
  '/api/instagram/webhook',
  '/api/webhooks/instagram',
  '/api/whatsapp/webhook',
  '/api/paystack/webhook',
  '/api/streams/webhook',
  '/api/integrations/chezahub/order-event',
  '/api/v1/partner/',
];
const API_RATE_LIMIT_POLICIES = [
  { prefix: '/api/auth/login', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/register', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/signup', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/password', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/auth/magic-link', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/admin', limit: 180, windowMs: 5 * 60 * 1000 },
  { prefix: '/api/moderators', limit: 180, windowMs: 5 * 60 * 1000 },
  { prefix: '/api/events/mechi-online-gaming-tournament/results', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/events/mechi-online-gaming-tournament/register', limit: 60, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/subscriptions', limit: 45, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/rewards/redeem', limit: 30, windowMs: 15 * 60 * 1000 },
  { prefix: '/api/streams', limit: 90, windowMs: 5 * 60 * 1000 },
  { prefix: '/api/v1', limit: 180, windowMs: 5 * 60 * 1000 },
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

const DASHBOARD_PATH_ALIASES: Record<string, string> = {
  '/dashboard/inbox': '/inbox',
  '/dashboard/lobbies': '/lobbies',
  '/dashboard/queue': '/dashboard/play',
  '/dashboard/streams': '/streams',
};

const PUBLIC_PREFIXES = [
  '/',
  '/manual-tests',
  '/report',
  '/reports',
  '/africa',
  '/results',
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/pricing',
  '/leaderboard',
  '/tournaments',
  '/playmechi',
  '/o/',
  '/embed/',
  '/privacy-policy',
  '/terms-of-service',
  '/user-data-deletion',
  '/banned',
  '/api/auth',
  '/api/users/leaderboard',
  '/api/invite',
  '/api/moderators/register',
  '/api/og',
  '/api/share',
  '/api/public',
  '/api/test-reports',
  '/join/',
  '/moderator-login',
  '/moderator-signup',
  '/s/',
  '/_next',
  '/favicon',
  '/icon',
  '/robots',
  '/sitemap',
];

const ADMIN_HOST_LOCAL_PUBLIC_PREFIXES = [
  '/login',
  '/moderator-login',
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

function isV5AdminRoute(pathname: string) {
  return pathname === '/app/admin' || pathname.startsWith('/app/admin/');
}

function isHiddenRoute(pathname: string) {
  return HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isDashboardRoute(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function isAuthEntryRoute(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/moderator-login' ||
    pathname === '/register' ||
    pathname === '/signup'
  );
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

function isLocalHost(host: string) {
  return LOCAL_APP_HOSTS.has(host);
}

function isLocalRequest(request: NextRequest) {
  try {
    return isLocalHost(normalizeHost(new URL(request.url).host));
  } catch {
    return isLocalHost(normalizeHost(request.nextUrl.host));
  }
}

function isAdminHost(request: NextRequest) {
  const host = getRequestHost(request);
  return ADMIN_HOSTS.has(host) || isLocalHost(host) || isLocalRequest(request);
}

function isCrossOriginApiExempt(pathname: string) {
  return (
    SENTRY_TUNNEL_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    CROSS_ORIGIN_API_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
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

function getLocalDevCorsOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) {
    return null;
  }

  try {
    const originHost = normalizeHost(new URL(origin).host);
    return LOCAL_DEV_ORIGIN_HOSTS.has(originHost) ? origin : null;
  } catch {
    return null;
  }
}

function applyLocalDevCors(request: NextRequest, response: NextResponse) {
  const origin = getLocalDevCorsOrigin(request);
  if (!origin || !request.nextUrl.pathname.startsWith('/api/')) {
    return response;
  }

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, Accept'
  );
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  response.headers.append('Vary', 'Origin');
  return response;
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

  if (SENTRY_TUNNEL_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
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

function getDashboardPathAlias(pathname: string) {
  return DASHBOARD_PATH_ALIASES[pathname] ?? null;
}

function redirectToAppHost(pathname: string, request: NextRequest) {
  return NextResponse.redirect(new URL(`${pathname}${request.nextUrl.search}`, APP_URL));
}

function getRegionalRouteForPathname(pathname: string) {
  return REGIONAL_ROUTE_CONFIGS.find(
    (route) => pathname === route.pathPrefix || pathname.startsWith(`${route.pathPrefix}/`)
  );
}

function getRegionalRouteForCountry(country: CountryKey | null) {
  if (!country) {
    return null;
  }

  return REGIONAL_ROUTE_CONFIGS.find((route) => route.country === country) ?? null;
}

function getPathWithoutRegionalPrefix(pathname: string, pathPrefix: string) {
  if (pathname === pathPrefix) {
    return '/';
  }

  return pathname.slice(pathPrefix.length) || '/';
}

function shouldKeepExplicitRegionalPath(pathname: string) {
  return (
    pathname === '/tz/register' ||
    pathname.startsWith('/tz/register/') ||
    pathname === '/tz/esportsday' ||
    pathname.startsWith('/tz/esportsday/') ||
    pathname === '/tz/daysesports' ||
    pathname.startsWith('/tz/daysesports/') ||
    pathname === '/tz/daysesports/register' ||
    pathname.startsWith('/tz/daysesports/register/')
  );
}

function withRegionalPreference(response: NextResponse, country: CountryKey) {
  response.cookies.set(
    REGIONAL_PREFERENCE_COOKIE_NAME,
    country,
    getRegionalPreferenceCookieOptions()
  );
  return response;
}

function getRegionalRequestHeaders(
  request: NextRequest,
  route: (typeof REGIONAL_ROUTE_CONFIGS)[number]
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-country-code', route.countryCode);
  requestHeaders.set('x-vercel-ip-country', route.countryCode);
  requestHeaders.set('accept-language', route.acceptLanguage);
  return requestHeaders;
}

function regionalPathResponse(
  request: NextRequest,
  route: (typeof REGIONAL_ROUTE_CONFIGS)[number]
) {
  if (
    request.nextUrl.pathname === route.pathPrefix ||
    shouldKeepExplicitRegionalPath(request.nextUrl.pathname)
  ) {
    return withRegionalPreference(
      NextResponse.next({
        request: {
          headers: getRegionalRequestHeaders(request, route),
        },
      }),
      route.country
    );
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = getPathWithoutRegionalPrefix(request.nextUrl.pathname, route.pathPrefix);
  return withRegionalPreference(
    NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: getRegionalRequestHeaders(request, route),
      },
    }),
    route.country
  );
}

function redirectRegionalVisitor(request: NextRequest, route: (typeof REGIONAL_ROUTE_CONFIGS)[number]) {
  const targetUrl = request.nextUrl.clone();
  targetUrl.pathname = route.pathPrefix;
  return withRegionalPreference(NextResponse.redirect(targetUrl), route.country);
}

function redirectToModeratorSignup(request: NextRequest) {
  const targetPath = `/moderator-signup${request.nextUrl.search}`;
  const host = getRequestHost(request);

  if (host === APP_HOST || isLocalHost(host) || isLocalRequest(request)) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = '/moderator-signup';
    return NextResponse.redirect(nextUrl);
  }

  return NextResponse.redirect(new URL(targetPath, APP_URL));
}

function redirectToModeratorLogin(request: NextRequest) {
  const targetPath = `/moderator-login${request.nextUrl.search}`;
  const host = getRequestHost(request);

  if (host === APP_HOST || isLocalHost(host) || isLocalRequest(request)) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = '/moderator-login';
    return NextResponse.redirect(nextUrl);
  }

  return NextResponse.redirect(new URL(targetPath, APP_URL));
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
  const loginPath = pathname.startsWith('/moderators')
    ? getModeratorLoginPath(nextPath, 'signin_required')
    : getLoginPath(nextPath, 'signin_required');
  return clearAuthCookie(NextResponse.redirect(new URL(loginPath, request.url)));
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
  const localRequest = isLocalRequest(request);
  const adminHost = ADMIN_HOSTS.has(host) || isLocalHost(host) || localRequest;
  const sharedLocalHost = adminHost && (host === APP_HOST || isLocalHost(host) || localRequest);

  if (pathname.startsWith('/api/') && request.method === 'OPTIONS' && getLocalDevCorsOrigin(request)) {
    return applyLocalDevCors(request, new NextResponse(null, { status: 204 }));
  }

  const guardedResponse = applyApiIngressGuards(request);

  if (guardedResponse) {
    return applyLocalDevCors(request, guardedResponse);
  }

  const dashboardPathAlias = getDashboardPathAlias(pathname);
  if (dashboardPathAlias) {
    const dashboardAliasUrl = request.nextUrl.clone();
    dashboardAliasUrl.pathname = dashboardPathAlias;
    return NextResponse.redirect(dashboardAliasUrl, 308);
  }

  if (pathname === '/tz/register' || pathname.startsWith('/tz/register/')) {
    const tanzaniaRegistrationUrl = request.nextUrl.clone();
    tanzaniaRegistrationUrl.pathname = '/tz/esportsday/register';
    return NextResponse.redirect(tanzaniaRegistrationUrl, 308);
  }

  if (!adminHost && (pathname === '/usa' || pathname.startsWith('/usa/'))) {
    const africaUrl = request.nextUrl.clone();
    africaUrl.pathname = '/africa';
    return NextResponse.redirect(africaUrl, 308);
  }

  if (!adminHost && /^\/@[^/]+(?:\/(?:games|resume|cv))?\/?$/.test(pathname)) {
    const passportUrl = request.nextUrl.clone();
    passportUrl.pathname = `/p/${pathname.slice(1)}`;
    return NextResponse.rewrite(passportUrl);
  }

  const regionalRoute = getRegionalRouteForPathname(pathname);
  if (!adminHost && regionalRoute) {
    return regionalPathResponse(request, regionalRoute);
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

  if (!adminHost && pathname === '/') {
    const ipRegionalRoute = getRegionalRouteForCountry(getCountryFromIpHeaders(request.headers));
    return redirectRegionalVisitor(request, ipRegionalRoute ?? {
      pathPrefix: '/africa',
      country: 'kenya',
      countryCode: 'KE',
      acceptLanguage: 'en-KE,en;q=0.9,sw;q=0.8',
    });
  }

  if (pathname === '/moderators/register' || pathname === '/admin/moderators/register') {
    return redirectToModeratorSignup(request);
  }

  if (pathname === '/moderators/login' || pathname === '/admin/moderators/login') {
    return redirectToModeratorLogin(request);
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
  const isAuthEntry = isAuthEntryRoute(effectivePathname);
  // JWT verification is local and enough to admit ordinary player GET requests.
  // A Supabase profile lookup here used to block every protected page transition
  // before the route could start. Keep the live role/ban lookup on APIs,
  // privileged routes, auth-entry routes, and state-changing page requests.
  const needsProtectedAccess =
    isAdminRoute(effectivePathname) ||
    (isAuthEntry && Boolean(payload)) ||
    (isProtectedRoute(effectivePathname) &&
      (effectivePathname.startsWith('/api/') || request.method !== 'GET'));
  const access =
    payload && needsProtectedAccess ? await getCurrentAccess(payload) : null;

  if (
    isAuthEntry &&
    payload &&
    access
  ) {
    const fallbackPath =
      adminHost && !access.is_banned && hasPrimaryAdminAccess(access)
        ? '/admin'
        : '/dashboard';
    const nextPath = getPostLoginRedirectPath(
      access,
      request.nextUrl.searchParams.get('next'),
      fallbackPath
    );
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (
    isAuthEntry &&
    payload &&
    !access
  ) {
    return applyLocalDevCors(request, clearAuthCookie(NextResponse.next()));
  }

  if (isPublic(effectivePathname) && !isAdminRoute(effectivePathname)) {
    return applyLocalDevCors(request, NextResponse.next());
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
    return applyLocalDevCors(request, NextResponse.next());
  }

  if (isProtectedRoute(effectivePathname)) {
    if (!payload) {
      return unauthorizedResponse(effectivePathname, request);
    }

    if (isV5AdminRoute(effectivePathname) && (!access || !hasPrimaryAdminAccess(access))) {
      return forbiddenResponse(effectivePathname, request);
    }

    if (access?.is_banned) {
      return forbiddenResponse(effectivePathname, request, 'Your account has been suspended.');
    }
  }

  if (adminHostAlias) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = adminHostAlias;
    return NextResponse.rewrite(rewriteUrl);
  }

  return applyLocalDevCors(request, NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
