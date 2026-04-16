import { normalizeInviteCode } from '@/lib/invite';

export function getSafeNextPath(value: string | null | undefined, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value;
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

export function getRegisterPath(options?: {
  invite?: string | null;
  next?: string | null;
}) {
  return withQuery('/register', {
    invite: normalizeInviteCode(options?.invite) ?? null,
    next: options?.next ?? null,
  });
}
