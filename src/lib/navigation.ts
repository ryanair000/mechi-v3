import { normalizeInviteCode } from '@/lib/invite';
import type { UserRole } from '@/types';

export const MODERATOR_DESK_PATH = '/app/admin';

const BLOCKED_POST_AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/moderator-login',
  '/moderator-signup',
]);

type PostLoginIdentity = {
  role?: UserRole | null;
};

export function getSafeNextPath(value: string | null | undefined, fallback = '/app/player') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const parsed = new URL(value, 'https://mechi.club');
    if (BLOCKED_POST_AUTH_PATHS.has(parsed.pathname)) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  if (matchesAppPath(value, '/dashboard')) return value.replace('/dashboard', '/app/player');
  if (matchesAppPath(value, '/moderators')) return value.replace('/moderators', '/app/admin');
  if (matchesAppPath(value, '/admin')) return value.replace('/admin', '/app/admin');

  return value;
}

function matchesAppPath(pathname: string, basePath: string) {
  return (
    pathname === basePath ||
    pathname.startsWith(`${basePath}/`) ||
    pathname.startsWith(`${basePath}?`) ||
    pathname.startsWith(`${basePath}#`)
  );
}

function isAdminPath(pathname: string) {
  return matchesAppPath(pathname, '/app/admin') || matchesAppPath(pathname, '/admin');
}

function isWeekendCupHomeAnchorPath(pathname: string) {
  return pathname === '/#vote' || pathname === '/#overview' || pathname === '/#options';
}

export function isModeratorDeskPath(pathname: string) {
  return matchesAppPath(pathname, MODERATOR_DESK_PATH);
}

export function hasModeratorDeskRole(identity: PostLoginIdentity | null | undefined) {
  return identity?.role === 'moderator' || identity?.role === 'admin';
}

function getNonStaffFallbackPath(fallback: string | null | undefined) {
  const safeFallback = getSafeNextPath(fallback, '/app/player');
  return isModeratorDeskPath(safeFallback) || isAdminPath(safeFallback) ? '/app/player' : safeFallback;
}

export function getPostLoginRedirectPath(
  identity: PostLoginIdentity | null | undefined,
  requestedPath: string | null | undefined,
  fallback = '/app/player'
) {
  const safePath = getSafeNextPath(requestedPath, fallback);

  if (!hasModeratorDeskRole(identity)) {
    if (isModeratorDeskPath(safePath) || isAdminPath(safePath)) {
      return getNonStaffFallbackPath(fallback);
    }

    return safePath;
  }

  if (isWeekendCupHomeAnchorPath(safePath)) {
    return safePath;
  }

  if (matchesAppPath(safePath, '/weekendcup')) {
    return safePath;
  }

  if (identity?.role === 'admin' && isAdminPath(safePath)) {
    return safePath;
  }

  if (isModeratorDeskPath(safePath)) {
    return safePath;
  }

  return MODERATOR_DESK_PATH;
}

export function withQuery(
  pathname: string,
  params: Record<string, string | null | undefined>
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getLoginPathWithNotice(
  next?: string | null,
  authNotice?: string | null
) {
  return withQuery('/login', {
    next: next ?? null,
    auth_notice: authNotice ?? null,
  });
}

export function getLoginPath(next?: string | null, authNotice?: string | null) {
  return getLoginPathWithNotice(next, authNotice);
}

export function getModeratorLoginPath(next?: string | null, authNotice?: string | null) {
  return withQuery('/moderator-login', {
    next: next ?? null,
    auth_notice: authNotice ?? null,
  });
}

export function getRegisterPath(options?: {
  invite?: string | null;
  next?: string | null;
}) {
  return withQuery('/register', {
    invite: normalizeInviteCode(options?.invite) ?? null,
    next: options?.next ?? null,
  });
}
