import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportSocialHub } from '@/lib/passport-social';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  return NextResponse.json({ social: await getPassportSocialHub(access.profile.id) });
}
