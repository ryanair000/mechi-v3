import { NextRequest, NextResponse } from 'next/server';
import { getPassportData } from '@/lib/passport';
import { resolvePassportRequestViewerAccess } from '@/lib/passport-viewer-access';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  let passport = await getPassportData(username);
  if (!passport) return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
  const viewerAccess = await resolvePassportRequestViewerAccess(
    request,
    passport.identity.user_id
  );
  if (viewerAccess.blocked) {
    return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
  }
  if (viewerAccess.friend_view) {
    passport = await getPassportData(username, { friendView: true });
  }
  if (!passport) return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
  return NextResponse.json({ access: passport.access, library: passport.library }, {
    headers: {
      'Cache-Control': viewerAccess.credential_presented
        ? 'private, no-store'
        : 'public, max-age=0, must-revalidate',
    },
  });
}
