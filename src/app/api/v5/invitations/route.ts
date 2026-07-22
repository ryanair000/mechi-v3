import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('workspace_invitations').select('id,workspace_id,role,status,expires_at,created_at,workspace:workspaces(id,type,name,slug),invited_by_profile:profiles!workspace_invitations_invited_by_fkey(id,username)').eq('invited_user_id', access.profile.id).eq('status', 'pending').order('created_at', { ascending: false });
  return NextResponse.json({ invitations: error ? [] : data ?? [] });
}
