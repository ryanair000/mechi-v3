import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportCompetitiveResume } from '@/lib/passport-resume';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const resume = await getPassportCompetitiveResume(access.profile.username, true);
  return resume ? NextResponse.json({ resume }) : NextResponse.json({ error: 'Gamer Resume not found' }, { status: 404 });
}
