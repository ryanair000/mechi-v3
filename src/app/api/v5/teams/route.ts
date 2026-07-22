import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { GAMES } from '@/lib/config';
import { makeSlug } from '@/lib/slug';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey } from '@/types';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('team_members')
    .select('roster_role,status,team:teams(id,game,platform,tag,roster_status,captain_user_id,workspace:workspaces(id,name,slug,status,verification_status))')
    .eq('user_id', access.profile.id)
    .in('status', ['active', 'benched']);
  if (error) {
    const migrationPending = error.code === '42P01';
    if (!migrationPending) {
      console.error('[V5 Teams] Could not load teams', { code: error.code });
      return NextResponse.json({ error: 'Teams could not be loaded.' }, { status: 500 });
    }
    return NextResponse.json({ teams: [], migration_pending: true });
  }
  return NextResponse.json({ teams: data ?? [], migration_pending: false });
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const user = access.profile;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Send valid team details.' }, { status: 400 }); }

  const name = String(body.name ?? `${user.username} squad`).trim();
  const tag = String(body.tag ?? '').trim().toUpperCase();
  const game = String(body.game ?? '') as GameKey;
  const platform = String(body.platform ?? GAMES[game]?.platforms?.[0] ?? '').trim();
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: 'Team name must be between 2 and 120 characters.' }, { status: 400 });
  if (tag && (tag.length < 2 || tag.length > 8)) return NextResponse.json({ error: 'Team tag must be 2 to 8 characters.' }, { status: 400 });
  if (!GAMES[game]) return NextResponse.json({ error: 'Choose a supported game.' }, { status: 400 });

  const supabase = createServiceClient();
  const slug = `${makeSlug(name)}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await supabase.rpc('create_v5_team_workspace', {
    p_owner_id: user.id,
    p_name: name,
    p_slug: slug,
    p_game: game,
    p_platform: platform,
    p_tag: tag,
  });

  if (error || !data) {
    const migrationPending = error?.code === '42P01' || error?.code === '42883';
    return NextResponse.json(
      { error: migrationPending ? 'V5 team storage is not ready yet.' : 'Team could not be created.' },
      { status: migrationPending ? 503 : 409 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
