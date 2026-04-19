import { createHash, randomBytes } from 'node:crypto';
import { getSafeNextPath } from '@/lib/navigation';
import { createServiceClient } from '@/lib/supabase';
import { APP_URL } from '@/lib/urls';

export type AuthActionPurpose = 'magic_link_signin' | 'password_reset';

interface AuthActionTokenRow {
  id: string;
  user_id: string;
  purpose: AuthActionPurpose;
  token_hash: string;
  email: string;
  next_path: string | null;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export const AUTH_ACTION_TTLS: Record<AuthActionPurpose, number> = {
  magic_link_signin: 15 * 60 * 1000,
  password_reset: 30 * 60 * 1000,
};

export function normalizeEmailAddress(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

export function hashAuthActionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createAuthActionTokenValue() {
  return randomBytes(32).toString('base64url');
}

export function getAuthActionSafeNextPath(value: string | null | undefined) {
  return getSafeNextPath(value, '/dashboard');
}

export function appendAuthNotice(pathname: string, notice: string) {
  const url = new URL(getAuthActionSafeNextPath(pathname), APP_URL);
  url.searchParams.set('auth_notice', notice);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function appendAuthError(code: string, nextPath?: string | null) {
  const url = new URL('/login', APP_URL);
  url.searchParams.set('auth_error', code);

  const safeNextPath = nextPath ? getAuthActionSafeNextPath(nextPath) : null;
  if (safeNextPath && safeNextPath !== '/dashboard') {
    url.searchParams.set('next', safeNextPath);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildMagicLinkConsumeUrl(token: string) {
  const url = new URL('/api/auth/magic-link/consume', APP_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

export function buildResetPasswordUrl(token: string) {
  const url = new URL('/reset-password', APP_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function createAuthActionToken(params: {
  userId: string;
  purpose: AuthActionPurpose;
  email: string;
  nextPath?: string | null;
}) {
  const token = createAuthActionTokenValue();
  const tokenHash = hashAuthActionToken(token);
  const expiresAt = new Date(Date.now() + AUTH_ACTION_TTLS[params.purpose]);
  const supabase = createServiceClient();

  const { error } = await supabase.from('auth_action_tokens').insert({
    user_id: params.userId,
    purpose: params.purpose,
    token_hash: tokenHash,
    email: normalizeEmailAddress(params.email),
    next_path: params.nextPath ? getAuthActionSafeNextPath(params.nextPath) : null,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw error;
  }

  return {
    token,
    expiresAt,
  };
}

export async function getAuthActionToken(token: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('auth_action_tokens')
    .select('*')
    .eq('token_hash', hashAuthActionToken(token))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AuthActionTokenRow | null) ?? null;
}

export function getAuthActionTokenState(tokenRow: AuthActionTokenRow | null) {
  if (!tokenRow) {
    return 'missing' as const;
  }

  if (tokenRow.consumed_at) {
    return 'consumed' as const;
  }

  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return 'expired' as const;
  }

  return 'valid' as const;
}

export async function consumeAuthActionToken(tokenId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('auth_action_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', tokenId)
    .is('consumed_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}
