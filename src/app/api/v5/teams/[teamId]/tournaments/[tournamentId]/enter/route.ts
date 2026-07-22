import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess } from '@/lib/v5-team-access';

export async function POST(request: NextRequest, context: { params: Promise<{ teamId: string; tournamentId: string }> }) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const { teamId, tournamentId } = await context.params; const supabase = createServiceClient(); const result = await getTeamAccess(supabase, access.profile, teamId);
  if (!result) return NextResponse.json({ error: 'This team is unavailable.' }, { status: 404 });
  if (!result.canManage) return NextResponse.json({ error: 'Only the captain or manager can enter a tournament.' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { idempotency_key?: string };
  const { data, error } = await supabase.rpc('create_v5_team_tournament_entry', {
    p_actor_id: access.profile.id,
    p_team_id: teamId,
    p_tournament_id: tournamentId,
    p_idempotency_key: body.idempotency_key || crypto.randomUUID(),
    p_reason: 'Captain confirmed tournament team entry',
  });
  if (error) {
    const known = error.message?.replace(/^.*?: /, '') || 'Tournament entry could not be created.';
    return NextResponse.json({ error: known }, { status: ['42501'].includes(error.code) ? 403 : 409 });
  }
  return NextResponse.json(data, { status: data?.idempotent ? 200 : 201 });
}
