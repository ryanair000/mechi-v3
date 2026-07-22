import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess } from '@/lib/v5-team-access';

export async function POST(request: NextRequest, context: { params: Promise<{ entryId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { entryId } = await context.params; const supabase = createServiceClient();
  const { data: entry } = await supabase.from('tournament_entries').select('id,team_id,status,payment_status,tournament_id').eq('id', entryId).maybeSingle();
  if (!entry?.team_id) return NextResponse.json({ error: 'Team entry not found.' }, { status: 404 });
  const result = await getTeamAccess(supabase, access.profile, entry.team_id); if (!result) return NextResponse.json({ error: 'Team entry not found.' }, { status: 404 });
  if (!result.canManage) return NextResponse.json({ error: 'Only the captain or manager can check in.' }, { status: 403 });
  if (entry.status !== 'confirmed' || !['paid','not_required'].includes(entry.payment_status)) return NextResponse.json({ error: 'Complete entry and payment before check-in.' }, { status: 409 });
  const now = new Date().toISOString(); const { data, error } = await supabase.from('tournament_entries').update({ status: 'checked_in', checked_in_at: now, checked_in_by: access.profile.id, updated_at: now }).eq('id', entryId).select('*').single();
  if (error) return NextResponse.json({ error: 'Check-in could not be completed.' }, { status: 500 });
  await supabase.from('workspace_audit_events').insert({ workspace_id: result.workspace.id, actor_user_id: access.profile.id, action: 'team.checked_in', subject_type: 'tournament_entry', subject_id: entryId, after_summary: { tournament_id: entry.tournament_id, checked_in_at: now } });
  return NextResponse.json({ entry: data });
}
