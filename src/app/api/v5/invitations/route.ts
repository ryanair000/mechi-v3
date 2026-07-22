import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', session.profile.id)
    .maybeSingle();
  const email = String(profile?.email ?? '').trim().toLowerCase();

  const [userInvites, emailInvites] = await Promise.all([
    supabase
      .from('workspace_invitations')
      .select('id,workspace_id,role,status,expires_at,created_at,workspace:workspaces(id,type,name,slug,status),invited_by_profile:profiles!workspace_invitations_invited_by_fkey(id,username)')
      .eq('invited_user_id', session.profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    email
      ? supabase
          .from('workspace_invitations')
          .select('id,workspace_id,role,status,expires_at,created_at,workspace:workspaces(id,type,name,slug,status),invited_by_profile:profiles!workspace_invitations_invited_by_fkey(id,username)')
          .ilike('invited_email', email)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (userInvites.error || emailInvites.error) {
    return NextResponse.json({ error: 'Invitations could not be loaded.' }, { status: 500 });
  }
  const byId = new Map<string, unknown>();
  for (const invite of [...(userInvites.data ?? []), ...(emailInvites.data ?? [])]) {
    byId.set(String(invite.id), invite);
  }
  return NextResponse.json({ invitations: Array.from(byId.values()).sort((left, right) => String((right as { created_at?: string }).created_at ?? '').localeCompare(String((left as { created_at?: string }).created_at ?? ''))) });
}
