import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import { getTeamAccess, getTeamReadiness } from '@/lib/teams';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const game = request.nextUrl.searchParams.get('game') ?? '';
  const supabase = createServiceClient();
  const teamAccess = await getTeamAccess(supabase, id, access.profile.id);
  if (!teamAccess?.membership) return NextResponse.json({ error: 'Join this team to view player setup.' }, { status: 403 });
  const readiness = await getTeamReadiness(supabase, id, game);
  if (!readiness) return NextResponse.json({ error: 'Choose a supported game.' }, { status: 400 });
  return NextResponse.json(readiness);
}
