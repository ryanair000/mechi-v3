import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { cleanTeamDescription, cleanTeamName, getTeamAccess, getTeamDetail, recordTeamAudit } from '@/lib/teams';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const detail = await getTeamDetail(createServiceClient(), id, access.profile.id);
  if (!detail) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  if (!teamAccess.canManage) return NextResponse.json({ error: 'Only a team captain can change team details.' }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('name' in body) {
    const name = cleanTeamName(body.name);
    if (name.length < 2) return NextResponse.json({ error: 'Team name must have at least 2 characters.' }, { status: 400 });
    patch.name = name;
  }
  if ('description' in body) patch.description = cleanTeamDescription(body.description);
  if ('region' in body) patch.region = String(body.region ?? '').trim().slice(0, 80) || 'Kenya';
  if ('visibility' in body) patch.visibility = body.visibility === 'private' ? 'private' : 'public';
  if ('recruiting' in body) patch.recruiting = Boolean(body.recruiting);

  const { data, error } = await supabase.from('teams').update(patch).eq('id', id).select('*').single();
  if (error || !data) return NextResponse.json({ error: 'Could not update the team.' }, { status: 500 });
  await recordTeamAudit(supabase, { teamId: id, actorId: access.profile.id, action: 'team_updated', details: patch });
  return NextResponse.json({ team: data });
}

