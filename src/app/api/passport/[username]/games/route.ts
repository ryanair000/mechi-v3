import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPassportData } from '@/lib/passport';
import { arePassportFriends, hasPassportBlockBetween } from '@/lib/passport-social';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  let passport = await getPassportData(username);
  if (!passport) return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
  const viewer = getAuthUser(request);
  if (viewer && viewer.sub !== passport.identity.user_id) {
    if (await hasPassportBlockBetween(viewer.sub, passport.identity.user_id)) return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
    if (await arePassportFriends(viewer.sub, passport.identity.user_id)) passport = await getPassportData(username, { friendView: true });
  }
  if (!passport) return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
  return NextResponse.json({ access: passport.access, library: passport.library }, {
    headers: { 'Cache-Control': viewer ? 'private, no-store' : 'public, max-age=30, stale-while-revalidate=120' },
  });
}
