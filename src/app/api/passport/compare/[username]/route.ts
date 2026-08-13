import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportComparison } from '@/lib/passport-comparison';

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const result = await getPassportComparison(access.profile.username, (await params).username, { viewerId: access.profile.id });
  return NextResponse.json(result.data ? { comparison: result.data } : { error: result.error }, { status: result.status });
}
