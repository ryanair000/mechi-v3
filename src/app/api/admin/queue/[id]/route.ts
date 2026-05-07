import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = (await request.json()) as {
      action?: string;
      reason?: string;
    };
    const supabase = createServiceClient();

    const { data: queueEntry, error: queueError } = await supabase
      .from('queue')
      .select('id, user_id, game, platform, region, status, user:user_id(username)')
      .eq('id', id)
      .single();

    if (queueError || !queueEntry) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
    }

    if (body.action !== 'cancel') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (queueEntry.status !== 'waiting') {
      return NextResponse.json({ error: 'Only waiting queue entries can be cancelled' }, { status: 400 });
    }

    const { error } = await supabase
      .from('queue')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to cancel queue entry' }, { status: 500 });
    }

    await writeAuditLog({
      adminId: admin.id,
      action: 'cancel_queue_entry',
      targetType: 'queue',
      targetId: id,
      details: {
        username: (queueEntry.user as { username?: string } | null)?.username ?? null,
        previousStatus: queueEntry.status,
        game: queueEntry.game,
        platform: queueEntry.platform,
        region: queueEntry.region,
        reason: body.reason ?? null,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Admin Queue PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
