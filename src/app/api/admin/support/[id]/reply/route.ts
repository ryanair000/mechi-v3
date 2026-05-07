import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { sendManualSupportReply } from '@/lib/support-inbox';

function getRequestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRequestAccessProfile(request);
  if (!user || !hasModeratorAccess(user) || user.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const message =
      typeof body.message === 'string' && body.message.trim().length > 0
        ? body.message.trim()
        : '';

    if (!message) {
      return NextResponse.json({ error: 'Reply message is required' }, { status: 400 });
    }

    const detail = await sendManualSupportReply({
      threadId: id,
      actorId: user.id,
      message,
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json(detail);
  } catch (error) {
    console.error('[Admin Support Reply POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message === 'Thread not found' ? 404 : 500 }
    );
  }
}
