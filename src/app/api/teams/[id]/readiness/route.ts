import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamOperationErrorMessage } from '@/lib/team-roster';
import { getTeamAccess, getTeamReadiness } from '@/lib/teams';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const game = request.nextUrl.searchParams.get('game') ?? '';
  const platform = request.nextUrl.searchParams.get('platform');
  const requiredStarters = Math.min(
    12,
    Math.max(2, Number(request.nextUrl.searchParams.get('size') ?? 2))
  );
  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess?.membership) return NextResponse.json({ error: 'Join this team to view player setup.' }, { status: 403 });
  const readiness = await getTeamReadiness(
    supabase,
    id,
    game,
    requiredStarters,
    platform
  );
  if (!readiness) return NextResponse.json({ error: 'Choose a supported game.' }, { status: 400 });
  return NextResponse.json(readiness);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const game = String(body.game ?? '');
  const requestedEntries = Array.isArray(body.entries)
    ? (body.entries as Array<Record<string, unknown>>).slice(0, 14)
    : [];
  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess) return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  if (!teamAccess.canManage) {
    return NextResponse.json({ error: 'Only the team owner or a captain can save a roster.' }, { status: 403 });
  }

  const readiness = await getTeamReadiness(supabase, id, game);
  if (!readiness) return NextResponse.json({ error: 'Choose a supported game.' }, { status: 400 });
  const candidates = new Map(readiness.members.map((member) => [member.user_id, member]));
  const missingMember = requestedEntries.some(
    (entry) => !candidates.has(String(entry.user_id ?? ''))
  );
  if (missingMember) {
    return NextResponse.json(
      { error: 'Every roster player must be an active team member.' },
      { status: 409 }
    );
  }
  const entries = requestedEntries.map((entry) => {
    const candidate = candidates.get(String(entry.user_id ?? ''))!;
    return {
      user_id: candidate.user_id,
      roster_role: entry.roster_role === 'substitute' ? 'substitute' : 'starter',
      player_id: candidate.player_id,
    };
  });
  const platforms = new Set(
    requestedEntries
      .map((entry) => candidates.get(String(entry.user_id ?? ''))?.platform)
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
  );
  const platform = String(body.platform ?? readiness.platform ?? [...platforms][0] ?? '');
  if (!platform) {
    return NextResponse.json(
      { error: 'Add a supported platform to at least one selected player.' },
      { status: 400 }
    );
  }
  if (
    entries.some((entry) => candidates.get(entry.user_id)?.platform !== platform)
  ) {
    return NextResponse.json(
      { error: 'Every selected player must use the same platform for this roster.' },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc('replace_team_roster', {
    p_team_id: id,
    p_actor_id: access.profile.id,
    p_game: readiness.game,
    p_platform: platform,
    p_entries: entries,
  });
  if (error) {
    return NextResponse.json(
      { error: getTeamOperationErrorMessage(error) },
      { status: error.code === '42883' ? 503 : 409 }
    );
  }

  const refreshed = await getTeamReadiness(supabase, id, readiness.game);
  return NextResponse.json({ status: 'saved', readiness: refreshed });
}
