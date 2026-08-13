import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportComparison } from '@/lib/passport-comparison';
import { getPassportOwnerDataByUserId } from '@/lib/passport';

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const ownerPassport = await getPassportOwnerDataByUserId(access.profile.id);
  const ownerHandle = ownerPassport?.identity.publication_status === 'published'
    ? ownerPassport.identity.public_handle
    : null;
  if (!ownerHandle) {
    return NextResponse.json(
      { error: 'Publish your Gamer Passport before comparing with other players' },
      { status: 409 }
    );
  }
  const result = await getPassportComparison(ownerHandle, (await params).username, { viewerId: access.profile.id });
  return NextResponse.json(result.data ? { comparison: result.data } : { error: result.error }, { status: result.status });
}
