import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  createMatchChatMessage,
  getMatchChatThread,
  MATCH_CHAT_MESSAGE_MAX_LENGTH,
} from '@/lib/match-chat';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const { id } = await params;
  const result = await getMatchChatThread(id, access.profile.id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === 'not_found' ? 'Match not found' : 'Forbidden' },
      { status: result.reason === 'not_found' ? 404 : 403 }
    );
  }

  return NextResponse.json({
    messages: result.messages,
    can_reply: result.canReply,
    match_status: result.match.status,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const message = String(body.message ?? '');
    const requestedType = String(body.message_type ?? '').trim();

    const result = await createMatchChatMessage({
      matchId: id,
      senderUserId: access.profile.id,
      senderType: 'player',
      body: message,
      messageType: requestedType === 'quick_reply' ? 'quick_reply' : 'text',
      meta: {
        sender_username: access.profile.username,
      },
    });

    if (!result.ok) {
      const status =
        result.reason === 'not_found'
          ? 404
          : result.reason === 'forbidden'
            ? 403
            : result.reason === 'locked'
              ? 400
              : 422;

      const error =
        result.reason === 'not_found'
          ? 'Match not found'
          : result.reason === 'forbidden'
            ? 'Forbidden'
            : result.reason === 'locked'
              ? 'Match chat is read-only once the match is closed'
              : result.reason === 'too_long'
                ? `Keep chat messages under ${MATCH_CHAT_MESSAGE_MAX_LENGTH} characters`
                : 'Message cannot be empty';

      return NextResponse.json({ error }, { status });
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('[Match Chat POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
