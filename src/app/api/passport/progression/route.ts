import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportProgression } from '@/lib/passport-progression';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  return NextResponse.json({ progression: await getPassportProgression(access.profile.id) });
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const progression = await getPassportProgression(access.profile.id, { force: true });
  return NextResponse.json({ progression, refreshed: true });
}
