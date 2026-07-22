import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess, recordTeamAudit } from '@/lib/teams';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const targetUserId = String(body.user_id ?? '');
  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  if (String(teamAccess.team.owner_id) !== access.profile.id) return NextResponse.json({ error: 'Only the team owner can transfer ownership.' }, { status: 403 });
  if (!targetUserId || targetUserId === access.profile.id) return NextResponse.json({ error: 'Choose another active team member.' }, { status: 400 });
  const { data: target } = await supabase.from('team_members').select('id').eq('team_id', id).eq('user_id', targetUserId).eq('status', 'active').maybeSingle();
  if (!target) return NextResponse.json({ error: 'Choose an active team member.' }, { status: 404 });
  const { error } = await supabase.from('teams').update({ owner_id: targetUserId, updated_at: new Date().toISOString() }).eq('id', id).eq('owner_id', access.profile.id);
  if (error) return NextResponse.json({ error: 'Could not transfer team ownership.' }, { status: 500 });
  await supabase.from('team_members').update({ role: 'captain' }).eq('id', target.id);
  await recordTeamAudit(supabase, { teamId: id, actorId: access.profile.id, action: 'ownership_transferred', subjectUserId: targetUserId });
  return NextResponse.json({ status: 'transferred', owner_id: targetUserId });
}
