import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getV5WorkspaceAccess } from '@/lib/v5-workspace-access';

async function loadTeamAccess(params: {
  request: NextRequest;
  teamId: string;
  permission: 'team:read' | 'team:entries:write';
  mutation?: boolean;
}) {
  const session = await requireActiveAccessProfile(params.request);
  if (session.response) return { response: session.response } as const;
  const supabase = createServiceClient();
  const { data: team, error } = await supabase
    .from('teams')
    .select('id,workspace_id')
    .eq('id', params.teamId)
    .maybeSingle();
  if (error || !team) {
    return {
      response: NextResponse.json({ error: 'Team not found' }, { status: 404 }),
    } as const;
  }
  const access = await getV5WorkspaceAccess({
    supabase,
    user: session.profile,
    workspaceId: team.workspace_id,
    permission: params.permission,
    mutation: params.mutation,
  });
  if (!access.ok) {
    return {
      response: NextResponse.json({ error: access.error }, { status: access.status }),
    } as const;
  }
  return { supabase, session, team, access: access.access } as const;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const context = await loadTeamAccess({
    request,
    teamId,
    permission: 'team:read',
  });
  if ('response' in context) return context.response;

  const { data, error } = await context.supabase
    .from('tournament_entries')
    .select(
      'id,tournament_id,status,payment_status,roster_snapshot_id,created_at,updated_at,tournament:tournaments(id,slug,title,game,platform,status,scheduled_for,team_size,entry_fee),roster_snapshot:team_roster_snapshots(id,roster,locked_at,unlocked_at,lock_reason,unlock_reason)'
    )
    .eq('team_id', teamId)
    .eq('entry_type', 'team')
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: 'Team entries could not be loaded.' }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Send a valid team entry request.' }, { status: 400 });
  }
  const tournamentId = String(body.tournament_id ?? '').trim();
  const idempotencyKey = String(body.idempotency_key ?? '').trim();
  const reason = String(body.reason ?? 'Captain confirmed the tournament roster').trim().slice(0, 300);
  if (!tournamentId || idempotencyKey.length < 16 || idempotencyKey.length > 128 || reason.length < 8) {
    return NextResponse.json(
      { error: 'Tournament, stable entry key, and a reason of at least 8 characters are required.' },
      { status: 400 }
    );
  }

  const context = await loadTeamAccess({
    request,
    teamId,
    permission: 'team:entries:write',
    mutation: true,
  });
  if ('response' in context) return context.response;

  const { data, error } = await context.supabase.rpc('create_v5_team_tournament_entry', {
    p_actor_id: context.session.profile.id,
    p_team_id: teamId,
    p_tournament_id: tournamentId,
    p_idempotency_key: idempotencyKey,
    p_reason: reason,
  });
  if (error || !data) {
    const status =
      error?.code === 'P0002'
        ? 404
        : error?.code === '42501'
          ? 403
          : ['23505', '55000', '0A000'].includes(error?.code ?? '')
            ? 409
            : error?.code === '22023'
              ? 400
              : error?.code === '42883'
                ? 503
                : 500;
    const safeMessage =
      error?.code === '23505'
        ? 'This team or one of its players already has an active entry in the tournament.'
        : error?.code === '42883'
          ? 'Team entry storage is not ready yet.'
          : error?.message ?? 'Team entry could not be created.';
    return NextResponse.json({ error: safeMessage }, { status });
  }

  return NextResponse.json(data, { status: data.idempotent ? 200 : 201 });
}
