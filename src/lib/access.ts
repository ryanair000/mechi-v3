import type { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { createServiceClient } from '@/lib/supabase';
import type { UserRole } from '@/types';

export interface AccessProfile {
  id: string;
  username: string;
  phone: string;
  role: UserRole;
  is_banned: boolean;
}

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

export function hasModeratorAccess(profile: AccessProfile | null): boolean {
  return hasPrimaryAdminAccess(profile);
}

export function hasAdminAccess(profile: AccessProfile | null): boolean {
  return hasPrimaryAdminAccess(profile);
}
