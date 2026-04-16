import type { SupabaseClient } from '@supabase/supabase-js';
import { isMissingColumnError } from '@/lib/db-compat';

export const INVITE_CODE_MAX_LENGTH = 24;

export interface InvitePreview {
  id: string;
  username: string;
  avatar_url: string | null;
  region: string | null;
  invite_code: string;
}

function truncateBase(base: string, length: number) {
  return base.slice(0, Math.max(1, length));
}

export function slugifyInviteCode(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return truncateBase(normalized || 'player', INVITE_CODE_MAX_LENGTH);
}

export function normalizeInviteCode(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || !/^[a-z0-9-]+$/.test(normalized)) {
    return null;
  }

  return truncateBase(normalized, INVITE_CODE_MAX_LENGTH);
}

function buildInviteCodeCandidate(base: string, attempt: number) {
  if (attempt === 0) {
    return base;
  }

  const suffix = String(attempt + 1);
  return `${truncateBase(base, INVITE_CODE_MAX_LENGTH - suffix.length - 1)}-${suffix}`;
}

export async function generateUniqueInviteCode(
  supabase: SupabaseClient,
  username: string,
  excludeUserId?: string
) {
  const base = slugifyInviteCode(username);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = buildInviteCodeCandidate(base, attempt);
    let query = supabase.from('profiles').select('id').eq('invite_code', candidate).limit(1);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingColumnError(error, 'profiles.invite_code')) {
        // Legacy production schema may not have invite codes - skip uniqueness enforcement.
        return base;
      }
      throw new Error(`Could not check invite code uniqueness: ${error.message}`);
    }

    if (!data?.length) {
      return candidate;
    }
  }

  const randomSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
  return `${truncateBase(base, INVITE_CODE_MAX_LENGTH - randomSuffix.length - 1)}-${randomSuffix}`;
}

export async function findInviterByCode(
  supabase: SupabaseClient,
  inviteCode: string | null | undefined
): Promise<InvitePreview | null> {
  const normalizedCode = normalizeInviteCode(inviteCode);
  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, region, invite_code')
    .eq('invite_code', normalizedCode)
    .maybeSingle();

  if (error && isMissingColumnError(error, 'profiles.invite_code')) {
    return null;
  }

  if (error || !data) {
    return null;
  }

  return {
    id: data.id as string,
    username: data.username as string,
    avatar_url: (data.avatar_url as string | null | undefined) ?? null,
    region: (data.region as string | null | undefined) ?? null,
    invite_code: data.invite_code as string,
  };
}
