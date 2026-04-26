import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import type { UserRole } from '@/types';

export interface AccessProfile {
  id: string;
  username: string;
  phone: string;
  role: UserRole;
  is_banned: boolean;
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

export async function getRequestAccessProfile(
  request: NextRequest
): Promise<AccessProfile | null> {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return null;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, phone, role, is_banned')
    .eq('id', authUser.sub)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id as string,
    username: data.username as string,
    phone: (data.phone as string | null | undefined) ?? '',
    role: (data.role as UserRole | null) ?? 'user',
    is_banned: Boolean(data.is_banned),
  };
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
