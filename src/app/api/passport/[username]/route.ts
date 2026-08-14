import { NextRequest, NextResponse } from 'next/server';
import { getPassportData, normalizePassportUsername } from '@/lib/passport';
import { resolvePassportRequestViewerAccess } from '@/lib/passport-viewer-access';

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
  const viewerAccess = await resolvePassportRequestViewerAccess(
    request,
    passport.identity.user_id
  );
  if (viewerAccess.blocked) {
    return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
  }
  if (viewerAccess.friend_view) {
    passport = await getPassportData(normalizedUsername, { friendView: true });
  }
  if (!passport) return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });

  return NextResponse.json(
    { passport },
    {
      headers: {
        'Cache-Control': viewerAccess.credential_presented
          ? 'private, no-store'
          : 'public, max-age=30, stale-while-revalidate=120',
      },
    }
  );
}
