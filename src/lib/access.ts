import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthUser, verifyToken } from '@/lib/auth';
import { isMissingColumnError } from '@/lib/db-compat';
import {
  isAuthSessionVersionCurrent,
  normalizeAuthSessionVersion,
} from '@/lib/auth-session-policy';
import { createServiceClient } from '@/lib/supabase';
import type { JWTPayload, UserRole } from '@/types';

export interface AccessProfile {
  id: string;
  username: string;
  phone: string;
  role: UserRole;
  is_banned: boolean;
  auth_session_version?: number;
}

export type ActiveAccessResult =
  | {
      profile: AccessProfile;
      response: null;
    }
  | {
      profile: null;
      response: NextResponse;
    };

async function loadAccessProfile(authUser: JWTPayload): Promise<AccessProfile | null> {
  const supabase = createServiceClient();
  let { data, error } = await supabase
    .from('profiles')
    .select('id, username, phone, role, is_banned, auth_session_version')
    .eq('id', authUser.sub)
    .single();

  if (error && isMissingColumnError(error, 'profiles.auth_session_version')) {
    const legacyResult = await supabase
      .from('profiles')
      .select('id, username, phone, role, is_banned')
      .eq('id', authUser.sub)
      .single();
    data = legacyResult.data
      ? { ...legacyResult.data, auth_session_version: 1 }
      : null;
    error = legacyResult.error;
  }

  if (error || !data) {
    return null;
  }

  if (!isAuthSessionVersionCurrent(
    authUser.auth_session_version,
    data.auth_session_version
  )) {
    return null;
  }

  return {
    id: data.id as string,
    username: data.username as string,
    phone: (data.phone as string | null | undefined) ?? '',
    role: (data.role as UserRole | null) ?? 'user',
    is_banned: Boolean(data.is_banned),
    auth_session_version: normalizeAuthSessionVersion(data.auth_session_version),
  };
}

export async function getRequestAccessProfile(
  request: NextRequest
): Promise<AccessProfile | null> {
  const authUser = getAuthUser(request);
  return authUser ? loadAccessProfile(authUser) : null;
}

export async function getActiveAccessProfileFromToken(
  token: string | null | undefined
): Promise<AccessProfile | null> {
  const authUser = token ? verifyToken(token) : null;
  const profile = authUser ? await loadAccessProfile(authUser) : null;
  return profile && !profile.is_banned ? profile : null;
}

export async function getOptionalActiveAccessProfile(
  request: NextRequest
): Promise<AccessProfile | null> {
  const profile = await getRequestAccessProfile(request);
  return profile && !profile.is_banned ? profile : null;
}

export async function requireActiveAccessProfile(
  request: NextRequest
): Promise<ActiveAccessResult> {
  const profile = await getRequestAccessProfile(request);

  if (!profile) {
    return {
      profile: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (profile.is_banned) {
    return {
      profile: null,
      response: NextResponse.json(
        { error: 'Your account has been suspended.' },
        { status: 403 }
      ),
    };
  }

  return {
    profile,
    response: null,
  };
}

export function hasModeratorAccess(profile: AccessProfile | null): boolean {
  return profile?.role === 'moderator' || profile?.role === 'admin';
}

export function hasAdminAccess(profile: AccessProfile | null): boolean {
  return profile?.role === 'admin';
}
