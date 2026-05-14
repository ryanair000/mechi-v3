import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  COMMUNITY_MESSAGE_MAX_LENGTH,
  createCommunityMessage,
  deleteCommunityMessage,
  getCommunityRoomSnapshot,
  pinCommunityMessage,
  setCommunityMemberMute,
  setCommunityRoomLock,
} from '@/lib/community-chat';
import { isMissingTableError } from '@/lib/db-compat';

function getCommunityUnavailableResponse() {
  return NextResponse.json(
    { error: 'Community chat is not available until the latest database migration runs.' },
    { status: 503 }
  );
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get('limit') ?? '80'), 20),
      120
    );
    const snapshot = await getCommunityRoomSnapshot({
      userId: access.profile.id,
      role: access.profile.role,
      limit,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    if (
      isMissingTableError(error, 'community_rooms') ||
      isMissingTableError(error, 'community_room_members') ||
      isMissingTableError(error, 'community_messages')
    ) {
      return getCommunityUnavailableResponse();
    }

    console.error('[Community Room GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const message = String(body.message ?? '');
    const requestedType = String(body.message_type ?? 'text').trim();
    const result = await createCommunityMessage({
      userId: access.profile.id,
      username: access.profile.username,
      role: access.profile.role,
      body: message,
      messageType: requestedType === 'announcement' ? 'announcement' : 'text',
    });

    if (!result.ok) {
      const status =
        result.reason === 'forbidden'
          ? 403
          : result.reason === 'locked' || result.reason === 'muted'
            ? 400
            : 422;
      const error =
        result.reason === 'forbidden'
          ? 'Only moderators and admins can post announcements.'
          : result.reason === 'locked'
            ? 'Community chat is read-only right now.'
            : result.reason === 'muted'
              ? `You are muted until ${result.muteUntil ?? 'later'}.`
              : result.reason === 'too_long'
                ? `Keep community messages under ${COMMUNITY_MESSAGE_MAX_LENGTH} characters`
                : 'Message cannot be empty.';

      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    if (
      isMissingTableError(error, 'community_rooms') ||
      isMissingTableError(error, 'community_room_members') ||
      isMissingTableError(error, 'community_messages')
    ) {
      return getCommunityUnavailableResponse();
    }

    console.error('[Community Room POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? '').trim();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    if (action === 'lock' || action === 'unlock') {
      const result = await setCommunityRoomLock({
        actor: access.profile,
        locked: action === 'lock',
      });

      if (!result.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'pin' || action === 'unpin') {
      const messageId =
        action === 'pin' ? String(body.message_id ?? '').trim() : null;
      const result = await pinCommunityMessage({
        actor: access.profile,
        messageId,
      });

      if (!result.ok) {
        const status = result.reason === 'not_found' ? 404 : 403;
        const error = result.reason === 'not_found' ? 'Message not found' : 'Forbidden';
        return NextResponse.json({ error }, { status });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'delete_message') {
      const messageId = String(body.message_id ?? '').trim();
      if (!messageId) {
        return NextResponse.json({ error: 'message_id is required' }, { status: 400 });
      }

      const result = await deleteCommunityMessage({
        actor: access.profile,
        messageId,
      });

      if (!result.ok) {
        const status = result.reason === 'not_found' ? 404 : 403;
        const error = result.reason === 'not_found' ? 'Message not found' : 'Forbidden';
        return NextResponse.json({ error }, { status });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'mute_user' || action === 'unmute_user') {
      const targetUserId = String(body.user_id ?? '').trim();
      if (!targetUserId) {
        return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
      }

      let muteUntil: string | null = null;
      if (action === 'mute_user') {
        const durationHours = Math.min(
          Math.max(Number(body.duration_hours ?? '24'), 1),
          24 * 14
        );
        muteUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      }

      const result = await setCommunityMemberMute({
        actor: access.profile,
        targetUserId,
        muteUntil,
      });

      if (!result.ok) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (
      isMissingTableError(error, 'community_rooms') ||
      isMissingTableError(error, 'community_room_members') ||
      isMissingTableError(error, 'community_messages')
    ) {
      return getCommunityUnavailableResponse();
    }

    console.error('[Community Room PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
