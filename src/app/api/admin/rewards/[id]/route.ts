import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { applyRewardEvent } from '@/lib/rewards';
import { getClientIp } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import type { RewardRedemptionStatus } from '@/types';

type RewardQueueAction = 'start_processing' | 'complete' | 'reject';

function isValidAction(value: unknown): value is RewardQueueAction {
  return value === 'start_processing' || value === 'complete' || value === 'reject';
}

function canStartProcessing(status: RewardRedemptionStatus) {
  return status === 'pending';
}

function canComplete(status: RewardRedemptionStatus) {
  return status === 'pending' || status === 'processing';
}

function canReject(status: RewardRedemptionStatus) {
  return status === 'pending' || status === 'processing';
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
    const body = (await request.json()) as { action?: RewardQueueAction; note?: string };

    if (!isValidAction(body.action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: requestRaw, error: requestError } = await supabase
      .from('reward_redemption_requests')
      .select(
        'id, user_id, game, reward_amount_label, cost_points, status, processing_at, completed_at, rejected_at'
      )
      .eq('id', id)
      .maybeSingle();

    if (requestError || !requestRaw) {
      return NextResponse.json({ error: 'Reward request not found' }, { status: 404 });
    }

    const rewardRequest = requestRaw as {
      id: string;
      user_id: string;
      game: string;
      reward_amount_label: string;
      cost_points: number;
      status: RewardRedemptionStatus;
      processing_at?: string | null;
      completed_at?: string | null;
      rejected_at?: string | null;
    };

    const note =
      typeof body.note === 'string' && body.note.trim().length > 0 ? body.note.trim() : null;
    const now = new Date().toISOString();

    if (body.action === 'start_processing' && !canStartProcessing(rewardRequest.status)) {
      return NextResponse.json(
        { error: 'Only pending requests can move into processing' },
        { status: 409 }
      );
    }

    if (body.action === 'complete' && !canComplete(rewardRequest.status)) {
      return NextResponse.json(
        { error: 'Only pending or processing requests can be completed' },
        { status: 409 }
      );
    }

    if (body.action === 'reject' && !canReject(rewardRequest.status)) {
      return NextResponse.json(
        { error: 'Only pending or processing requests can be rejected' },
        { status: 409 }
      );
    }

    if (body.action === 'start_processing') {
      const { data: updated, error: updateError } = await supabase
        .from('reward_redemption_requests')
        .update({
          status: 'processing',
          processing_at: rewardRequest.processing_at ?? now,
          processed_by: admin.id,
          admin_note: note,
          updated_at: now,
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id, status, processing_at, completed_at, rejected_at, admin_note')
        .maybeSingle();

      if (updateError || !updated) {
        return NextResponse.json({ error: 'Failed to update reward request' }, { status: 500 });
      }

      await writeAuditLog({
        adminId: admin.id,
        action: 'system_note',
        targetType: 'system',
        targetId: id,
        details: {
          area: 'reward_redemption_requests',
          queue_action: body.action,
          previous_status: rewardRequest.status,
          next_status: 'processing',
          note,
          reward_user_id: rewardRequest.user_id,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json(updated);
    }

    if (body.action === 'complete') {
      const nextStatus: RewardRedemptionStatus = 'completed';
      const { data: updated, error: updateError } = await supabase
        .from('reward_redemption_requests')
        .update({
          status: nextStatus,
          processing_at: rewardRequest.processing_at ?? now,
          completed_at: now,
          processed_by: admin.id,
          admin_note: note,
          updated_at: now,
        })
        .eq('id', id)
        .in('status', ['pending', 'processing'])
        .select('id, status, processing_at, completed_at, rejected_at, admin_note')
        .maybeSingle();

      if (updateError || !updated) {
        return NextResponse.json({ error: 'Failed to complete reward request' }, { status: 500 });
      }

      await createNotification(
        {
          user_id: rewardRequest.user_id,
          type: 'reward_redemption_completed',
          title: 'Reward redemption completed',
          body: `${rewardRequest.reward_amount_label} for ${String(rewardRequest.game).toUpperCase()} has been fulfilled.`,
          href: '/rewards',
          metadata: { reward_redemption_request_id: id },
        },
        supabase
      ).catch(() => null);

      await writeAuditLog({
        adminId: admin.id,
        action: 'system_note',
        targetType: 'system',
        targetId: id,
        details: {
          area: 'reward_redemption_requests',
          queue_action: body.action,
          previous_status: rewardRequest.status,
          next_status: nextStatus,
          note,
          reward_user_id: rewardRequest.user_id,
        },
        ipAddress: getClientIp(request),
      });

      return NextResponse.json(updated);
    }

    const { data: rejectedUpdate, error: rejectedUpdateError } = await supabase
      .from('reward_redemption_requests')
      .update({
        status: 'rejected',
        processing_at: rewardRequest.processing_at ?? (rewardRequest.status === 'processing' ? now : null),
        rejected_at: now,
        processed_by: admin.id,
        admin_note: note,
        updated_at: now,
      })
      .eq('id', id)
      .in('status', ['pending', 'processing'])
      .select('id, status, processing_at, completed_at, rejected_at, admin_note')
      .maybeSingle();

    if (rejectedUpdateError || !rejectedUpdate) {
      return NextResponse.json({ error: 'Failed to reject reward request' }, { status: 500 });
    }

    try {
      await applyRewardEvent(supabase, {
        userId: rewardRequest.user_id,
        eventKey: `reward:redemption-request-reject:${rewardRequest.id}`,
        eventType: 'reward_redemption_reversal',
        availableDelta: Number(rewardRequest.cost_points) || 0,
        source: 'reward_redeem',
        metadata: {
          reward_redemption_request_id: rewardRequest.id,
          reward_amount_label: rewardRequest.reward_amount_label,
          reason: 'admin_rejected',
        },
      });
    } catch (refundError) {
      try {
        await supabase
          .from('reward_redemption_requests')
          .update({
            status: rewardRequest.status,
            rejected_at: rewardRequest.rejected_at ?? null,
            completed_at: rewardRequest.completed_at ?? null,
            processing_at: rewardRequest.processing_at ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      } catch {
        // Best-effort rollback. The queue item is already marked rejected.
      }

      console.error('[Admin Rewards PATCH] Failed to refund rejected request:', refundError);
      return NextResponse.json({ error: 'Failed to restore points for rejected request' }, { status: 500 });
    }

    await createNotification(
      {
        user_id: rewardRequest.user_id,
        type: 'reward_redemption_rejected',
        title: 'Reward redemption rejected',
        body: `${rewardRequest.reward_amount_label} was rejected and your points were restored.`,
        href: '/rewards',
        metadata: { reward_redemption_request_id: id },
      },
      supabase
    ).catch(() => null);

    await writeAuditLog({
      adminId: admin.id,
      action: 'system_note',
      targetType: 'system',
      targetId: id,
      details: {
        area: 'reward_redemption_requests',
        queue_action: body.action,
        previous_status: rewardRequest.status,
        next_status: 'rejected',
        note,
        reward_user_id: rewardRequest.user_id,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(rejectedUpdate);
  } catch (error) {
    console.error('[Admin Rewards PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
