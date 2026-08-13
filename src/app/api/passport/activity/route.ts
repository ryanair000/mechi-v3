import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportActivityFeed, hidePassportActivity } from '@/lib/passport-community';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  return NextResponse.json(await getPassportActivityFeed(access.profile.id, request.nextUrl.searchParams.get('cursor')));
}

export async function DELETE(request: NextRequest) {
  const access = await requireActiveAccessProfile(request); if (access.response) return access.response;
  const id = String((await request.json().catch(() => ({})) as Record<string, unknown>).activity_id ?? '');
  return NextResponse.json(await hidePassportActivity(id, access.profile.id) ? { success: true } : { error: 'Activity not found' }, { status: id ? 200 : 400 });
}
