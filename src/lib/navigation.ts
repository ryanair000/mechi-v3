import { normalizeInviteCode } from '@/lib/invite';
import type { UserRole } from '@/types';

export const MODERATOR_DESK_PATH = '/moderators';

type PostLoginIdentity = {
  role?: UserRole | null;
};

export function getSafeNextPath(value: string | null | undefined, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

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

export function isModeratorDeskPath(pathname: string) {
  return matchesAppPath(pathname, MODERATOR_DESK_PATH);
}

export function hasModeratorDeskRole(identity: PostLoginIdentity | null | undefined) {
  return identity?.role === 'moderator' || identity?.role === 'admin';
}

export function getPostLoginRedirectPath(
  identity: PostLoginIdentity | null | undefined,
  requestedPath: string | null | undefined,
  fallback = '/dashboard'
) {
  const safePath = getSafeNextPath(requestedPath, fallback);

  if (!hasModeratorDeskRole(identity)) {
    return safePath;
  }

  if (identity?.role === 'admin' && matchesAppPath(safePath, '/admin')) {
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

export function getLoginPath(next?: string | null) {
  return withQuery('/login', { next: next ?? null });
}

export function getModeratorLoginPath(next?: string | null) {
  return withQuery('/moderator-login', { next: next ?? null });
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
