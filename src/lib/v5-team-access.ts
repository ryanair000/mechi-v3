import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessProfile } from '@/lib/access';
import { getWorkspaceAccess } from '@/lib/v5-workspace-access';

export async function getTeamAccess(supabase: SupabaseClient, user: AccessProfile, teamId: string) {
  const { data: team } = await supabase.from('teams').select('id,workspace_id,game,platform,tag,roster_status,captain_user_id,created_at,updated_at').eq('id', teamId).maybeSingle();
  if (!team) return null;
  const workspace = await getWorkspaceAccess(supabase, user, team.workspace_id);
  if (!workspace) return null;
  return { team, workspace, canManage: workspace.canManage || team.captain_user_id === user.id };
}
