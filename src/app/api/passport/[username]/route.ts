import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getPassportData, normalizePassportUsername } from '@/lib/passport';
import { arePassportFriends, hasPassportBlockBetween } from '@/lib/passport-social';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const normalizedUsername = normalizePassportUsername(username);
  if (!normalizedUsername) {
    return NextResponse.json({ error: 'Invalid Gamer Passport username' }, { status: 400 });
  }

  let passport = await getPassportData(normalizedUsername);
  if (!passport) {
    return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
  }
  const viewer = getAuthUser(request);
  if (viewer && viewer.sub !== passport.identity.user_id) {
    if (await hasPassportBlockBetween(viewer.sub, passport.identity.user_id)) return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
    if (await arePassportFriends(viewer.sub, passport.identity.user_id)) passport = await getPassportData(normalizedUsername, { friendView: true });
  }
  if (!passport) return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });

  return NextResponse.json(
    { passport },
    {
      headers: {
        'Cache-Control': viewer ? 'private, no-store' : 'public, max-age=30, stale-while-revalidate=120',
      },
    }
  );
}
