import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import type { RewardReviewStatus } from '@/types';

type RewardReviewAction = 'start_review' | 'resolve' | 'dismiss' | 'reopen';

function isValidAction(value: unknown): value is RewardReviewAction {
  return (
    value === 'start_review' ||
    value === 'resolve' ||
    value === 'dismiss' ||
    value === 'reopen'
  );
}

function getNextStatus(action: RewardReviewAction): RewardReviewStatus {
  switch (action) {
    case 'start_review':
      return 'reviewing';
    case 'resolve':
      return 'resolved';
    case 'dismiss':
      return 'dismissed';
    case 'reopen':
    default:
      return 'open';
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      action?: RewardReviewAction;
      note?: string;
    };

    if (!isValidAction(body.action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: reviewItem, error: reviewError } = await supabase
      .from('reward_review_queue')
      .select('id, user_id, reason, status')
      .eq('id', id)
      .maybeSingle();

    if (reviewError || !reviewItem) {
      return NextResponse.json({ error: 'Review item not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const note = typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null;
    const nextStatus = getNextStatus(body.action);

    const updatePayload: {
      status: RewardReviewStatus;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
      resolved_at?: string | null;
      resolution_note?: string | null;
      updated_at: string;
    } = {
      status: nextStatus,
      updated_at: now,
    };

    if (body.action === 'start_review') {
      updatePayload.reviewed_by = admin.id;
      updatePayload.reviewed_at = now;
      if (note) {
        updatePayload.resolution_note = note;
      }
    }

    if (body.action === 'resolve' || body.action === 'dismiss') {
      updatePayload.reviewed_by = admin.id;
      updatePayload.reviewed_at = now;
      updatePayload.resolved_at = now;
      updatePayload.resolution_note = note;
    }

    if (body.action === 'reopen') {
      updatePayload.reviewed_by = admin.id;
      updatePayload.reviewed_at = now;
      updatePayload.resolved_at = null;
      updatePayload.resolution_note = note;
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('reward_review_queue')
      .update(updatePayload)
      .eq('id', id)
      .select('id, status, reviewed_at, resolved_at, resolution_note')
      .maybeSingle();

    if (updateError || !updatedItem) {
      console.error('[Admin Rewards PATCH] Failed to update review item:', updateError);
      return NextResponse.json({ error: 'Failed to update reward review item' }, { status: 500 });
    }

    await writeAuditLog({
      adminId: admin.id,
      action: 'system_note',
      targetType: 'system',
      targetId: id,
      details: {
        area: 'reward_review_queue',
        review_reason: reviewItem.reason,
        previous_status: reviewItem.status,
        next_status: nextStatus,
        note,
        review_user_id: reviewItem.user_id ?? null,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      id: updatedItem.id,
      status: updatedItem.status,
      reviewed_at: updatedItem.reviewed_at,
      resolved_at: updatedItem.resolved_at,
      resolution_note: updatedItem.resolution_note,
    });
  } catch (error) {
    console.error('[Admin Rewards PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
