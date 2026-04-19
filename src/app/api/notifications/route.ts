import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getNotificationsForUser, markAllNotificationsRead } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '40'), 1),
      100
    );
    const data = await getNotificationsForUser(authUser.id, limit);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Notifications GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;

  try {
    await markAllNotificationsRead(authUser.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notifications PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
