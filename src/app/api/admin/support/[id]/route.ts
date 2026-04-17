import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import {
  getSupportThreadDetail,
  handleSupportThreadAction,
} from '@/lib/support-inbox';

function getRequestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

function isValidAction(value: unknown): value is Parameters<typeof handleSupportThreadAction>[0]['action'] {
  return (
    value === 'assign' ||
    value === 'unassign' ||
    value === 'resolve' ||
    value === 'reopen' ||
    value === 'block' ||
    value === 'relink'
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRequestAccessProfile(request);
  if (!user || !hasModeratorAccess(user) || user.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const detail = await getSupportThreadDetail(id);
    if (!detail) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error('[Admin Support Detail GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    const action = body.action;

    if (!isValidAction(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const detail = await handleSupportThreadAction({
      threadId: id,
      actorId: user.id,
      action,
      assignedTo:
        typeof body.assigned_to === 'string' && body.assigned_to.trim().length > 0
          ? body.assigned_to.trim()
          : null,
      lookup:
        typeof body.lookup === 'string' && body.lookup.trim().length > 0
          ? body.lookup.trim()
          : null,
      ipAddress: getRequestIp(request),
    });

    return NextResponse.json(detail);
  } catch (error) {
    console.error('[Admin Support Detail PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message === 'Thread not found' ? 404 : 500 }
    );
  }
}
