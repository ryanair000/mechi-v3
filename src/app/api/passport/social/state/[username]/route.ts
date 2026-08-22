import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportData } from '@/lib/passport';
import { getPassportRelationshipState } from '@/lib/passport-social';

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const passport = await getPassportData((await params).username);
  if (!passport) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  return NextResponse.json({ target_id: passport.identity.user_id, state: await getPassportRelationshipState(access.profile.id, passport.identity.user_id) });
}
