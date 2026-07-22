import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessProfile } from '@/lib/access';

export type V5WorkspacePermission =
  | 'workspace:read'
  | 'workspace:update'
  | 'workspace:archive'
  | 'workspace:members:read'
  | 'workspace:members:write'
  | 'workspace:invitations:read'
  | 'workspace:invitations:write'
  | 'workspace:preferences:write'
  | 'team:read'
  | 'team:update'
  | 'team:roster:write'
  | 'team:entries:read'
  | 'team:entries:write';

type WorkspaceAccessRow = {
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
  updated_at: string;
};

export type V5WorkspaceAccess = {
  workspace: WorkspaceAccessRow;
  userId: string;
  role: string;
  permissions: string[];
  isOwner: boolean;
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ['*'],
  captain: [
    'workspace:read',
    'workspace:update',
    'workspace:members:*',
    'workspace:invitations:*',
    'workspace:preferences:write',
    'team:*',
  ],
  manager: [
    'workspace:read',
    'workspace:members:read',
    'workspace:invitations:*',
    'workspace:preferences:write',
    'team:*',
  ],
  operations: ['workspace:read', 'workspace:members:read', 'tournament:*'],
  communications: ['workspace:read', 'communications:*'],
  finance_read: ['workspace:read', 'finance:read'],
  analyst: ['workspace:read', 'team:read', 'analytics:read'],
  starter: ['workspace:read', 'team:read'],
  substitute: ['workspace:read', 'team:read'],
  member: ['workspace:read'],
};

const ASSIGNABLE_ROLES: Record<string, Record<string, string[]>> = {
  team: {
    manager: ROLE_PERMISSIONS.manager,
    starter: ROLE_PERMISSIONS.starter,
    substitute: ROLE_PERMISSIONS.substitute,
    analyst: ROLE_PERMISSIONS.analyst,
    member: ROLE_PERMISSIONS.member,
  },
  organizer: {
    operations: ROLE_PERMISSIONS.operations,
    communications: ROLE_PERMISSIONS.communications,
    finance_read: ROLE_PERMISSIONS.finance_read,
    member: ROLE_PERMISSIONS.member,
  },
  creator: {
    manager: ROLE_PERMISSIONS.manager,
    communications: ROLE_PERMISSIONS.communications,
    analyst: ROLE_PERMISSIONS.analyst,
    member: ROLE_PERMISSIONS.member,
  },
  coach: { member: ROLE_PERMISSIONS.member },
  sponsor: {
    manager: ROLE_PERMISSIONS.manager,
    communications: ROLE_PERMISSIONS.communications,
    finance_read: ROLE_PERMISSIONS.finance_read,
    analyst: ROLE_PERMISSIONS.analyst,
    member: ROLE_PERMISSIONS.member,
  },
  shop: {
    manager: ROLE_PERMISSIONS.manager,
    operations: ROLE_PERMISSIONS.operations,
    finance_read: ROLE_PERMISSIONS.finance_read,
    member: ROLE_PERMISSIONS.member,
  },
};

export function getAssignableV5WorkspaceRole(workspaceType: string, role: string) {
  const permissions = ASSIGNABLE_ROLES[workspaceType]?.[role];
  return permissions ? { role, permissions: [...permissions] } : null;
}

function grantMatches(grant: string, required: string) {
  if (grant === '*' || grant === required) return true;
  if (!grant.endsWith(':*')) return false;
  return required.startsWith(grant.slice(0, -1));
}

export function hasV5WorkspacePermission(
  access: V5WorkspaceAccess,
  required: V5WorkspacePermission
) {
  const grants = new Set([
    ...access.permissions,
    ...(ROLE_PERMISSIONS[access.role] ?? ROLE_PERMISSIONS.member),
  ]);
  return Array.from(grants).some((grant) => grantMatches(grant, required));
}

export async function getV5WorkspaceAccess(params: {
  supabase: SupabaseClient;
  user: AccessProfile;
  workspaceId: string;
  permission?: V5WorkspacePermission;
  mutation?: boolean;
}): Promise<
  | { ok: true; access: V5WorkspaceAccess }
  | { ok: false; status: 403 | 404; error: string }
> {
  const { supabase, user, workspaceId, permission, mutation = false } = params;
  const { data: workspaceRaw, error: workspaceError } = await supabase
    .from('workspaces')
    .select(
      'id,type,owner_id,name,slug,status,verification_status,is_public,description,country,region,updated_at'
    )
    .eq('id', workspaceId)
    .is('archived_at', null)
    .maybeSingle();

  const workspace = workspaceRaw as WorkspaceAccessRow | null;
  if (workspaceError || !workspace) {
    return { ok: false, status: 404, error: 'Workspace not found' };
  }

  const isOwner = workspace.owner_id === user.id;
  let role = isOwner ? 'owner' : '';
  let permissions = isOwner ? ['*'] : [];

  if (!isOwner) {
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role,permissions,status')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (membershipError || !membership) {
      return { ok: false, status: 404, error: 'Workspace not found' };
    }
    role = String(membership.role ?? 'member');
    permissions = Array.isArray(membership.permissions)
      ? membership.permissions.map(String)
      : [];
  }

  const access: V5WorkspaceAccess = {
    workspace,
    userId: user.id,
    role,
    permissions,
    isOwner,
  };

  if (mutation && workspace.status !== 'active') {
    return { ok: false, status: 403, error: 'Workspace is not active' };
  }

  if (permission && !hasV5WorkspacePermission(access, permission)) {
    return { ok: false, status: 403, error: 'You do not have permission for this action' };
  }

  return { ok: true, access };
}

export function toSafeV5Workspace(access: V5WorkspaceAccess) {
  return {
    ...access.workspace,
    role: access.role,
    permissions: access.permissions,
    persisted: true,
  };
}

export async function writeV5WorkspaceAudit(params: {
  supabase: SupabaseClient;
  access: V5WorkspaceAccess;
  action: string;
  subjectType: string;
  subjectId?: string | null;
  reason: string;
  beforeSummary?: Record<string, unknown> | null;
  afterSummary?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await params.supabase.from('workspace_audit_events').insert({
    workspace_id: params.access.workspace.id,
    actor_user_id: params.access.userId,
    action: params.action,
    subject_type: params.subjectType,
    subject_id: params.subjectId ?? null,
    reason: params.reason,
    before_summary: params.beforeSummary ?? null,
    after_summary: params.afterSummary ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(`Workspace audit write failed: ${error.code ?? 'unknown'}`);
  }
}

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
