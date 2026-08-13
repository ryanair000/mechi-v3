import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { discoverPassportProfiles } from '@/lib/passport-social';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const query = new URL(request.url).searchParams.get('q') ?? '';
  return NextResponse.json({ players: await discoverPassportProfiles(access.profile.id, query) });
}
