import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessProfile } from '@/lib/access';

export interface WorkspaceAccess {
  id: string;
  type: string;
  owner_id: string;
  name: string;
  slug: string;
  status: string;
  verification_status: string;
  is_public: boolean;
  description: string | null;
  country: string | null;
  region: string | null;
  metadata: Record<string, unknown>;
  role: string;
  permissions: string[];
  canManage: boolean;
}

export async function getWorkspaceAccess(
  supabase: SupabaseClient,
  user: AccessProfile,
  workspaceId: string
): Promise<WorkspaceAccess | null> {
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id,type,owner_id,name,slug,status,verification_status,is_public,description,country,region,metadata')
    .eq('id', workspaceId)
    .is('archived_at', null)
    .maybeSingle();
  if (!workspace) return null;

  if (workspace.owner_id === user.id) {
    return { ...workspace, metadata: workspace.metadata ?? {}, role: 'owner', permissions: ['workspace:*'], canManage: true } as WorkspaceAccess;
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role,permissions,status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (!membership) return null;
  const permissions = Array.isArray(membership.permissions) ? membership.permissions : [];
  const canManage = ['captain', 'manager', 'admin'].includes(membership.role)
    || permissions.includes('workspace:*')
    || permissions.includes('team:*');
  return { ...workspace, metadata: workspace.metadata ?? {}, role: membership.role, permissions, canManage } as WorkspaceAccess;
}

export function cleanText(value: unknown, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}
