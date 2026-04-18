import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getNotificationsForUser, markAllNotificationsRead } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '40'), 1),
      100
    );
    const data = await getNotificationsForUser(authUser.sub, limit);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Notifications GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await markAllNotificationsRead(authUser.sub);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notifications PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
