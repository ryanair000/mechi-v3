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
      .select('id,role,status,expires_at,created_at,workspace:workspaces(id,type,name,slug,status)')
      .eq('invited_user_id', session.profile.id)
      .eq('status', 'pending'),
    email
      ? supabase
          .from('workspace_invitations')
          .select('id,role,status,expires_at,created_at,workspace:workspaces(id,type,name,slug,status)')
          .ilike('invited_email', email)
          .eq('status', 'pending')
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (userInvites.error || emailInvites.error) {
    return NextResponse.json({ error: 'Invitations could not be loaded.' }, { status: 500 });
  }
  const byId = new Map<string, unknown>();
  for (const invite of [...(userInvites.data ?? []), ...(emailInvites.data ?? [])]) {
    byId.set(String(invite.id), invite);
  }
  return NextResponse.json({ invitations: Array.from(byId.values()) });
}
