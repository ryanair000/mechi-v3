import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getV5WorkspaceAccess } from '@/lib/v5-workspace-access';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; entryId: string }> }
) {
  const session = await requireActiveAccessProfile(request);
  if (session.response) return session.response;
  const { teamId, entryId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Send a valid withdrawal request.' }, { status: 400 });
  }
  const reason = String(body.reason ?? '').trim().slice(0, 300);
  if (reason.length < 8) {
    return NextResponse.json({ error: 'Give a withdrawal reason of at least 8 characters.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id,workspace_id')
    .eq('id', teamId)
    .maybeSingle();
  if (teamError || !team) {
    return NextResponse.json({ error: 'Team entry not found' }, { status: 404 });
  }
  const access = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: team.workspace_id,
    permission: 'team:entries:write',
    mutation: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await supabase.rpc('withdraw_v5_team_tournament_entry', {
    p_actor_id: session.profile.id,
    p_team_id: teamId,
    p_entry_id: entryId,
    p_reason: reason,
  });
  if (error || !data) {
    const status =
      error?.code === 'P0002'
        ? 404
        : error?.code === '42501'
          ? 403
          : error?.code === '22023'
            ? 400
            : ['55000', '23505'].includes(error?.code ?? '')
              ? 409
              : error?.code === '42883'
                ? 503
                : 500;
    return NextResponse.json(
      { error: error?.code === '42883' ? 'Team entry storage is not ready yet.' : error?.message ?? 'Entry could not be withdrawn.' },
      { status }
    );
  }
  return NextResponse.json(data);
}
