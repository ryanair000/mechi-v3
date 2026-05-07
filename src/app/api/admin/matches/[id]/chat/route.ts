import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { createMatchChatMessage } from '@/lib/match-chat';
import { createNotifications } from '@/lib/notifications';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const message = String(body.message ?? '');

    if (!message.trim()) {
      return NextResponse.json({ error: 'Reply message is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: match } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id')
      .eq('id', id)
      .maybeSingle();

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const result = await createMatchChatMessage({
      matchId: id,
      senderUserId: admin.id,
      senderType: 'admin',
      body: message,
      meta: {
        event: 'admin_reply',
        admin_id: admin.id,
      },
      senderUsername: admin.username,
    });

    if (!result.ok) {
      return NextResponse.json({ error: 'Could not send admin reply' }, { status: 500 });
    }

    await createNotifications(
      [match.player1_id, match.player2_id].map((userId) => ({
        user_id: userId,
        type: 'match_chat_message' as const,
        title: 'Admin replied in your match thread',
        body: message.trim(),
        href: `/inbox?match=${id}`,
        metadata: {
          match_id: id,
          admin_id: admin.id,
        },
      })),
      supabase
    );

    await writeAuditLog({
      adminId: admin.id,
      action: 'reply_match_chat',
      targetType: 'match',
      targetId: id,
      details: {
        message: message.trim(),
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('[Admin Match Chat POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
