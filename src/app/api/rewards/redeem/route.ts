import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { tryClaimBounty } from '@/lib/bounties';
import {
  applyRewardEvent,
  ensureChezahubCustomer,
  getRewardCatalogFromCache,
  issueChezahubRewardOrder,
  voidChezahubRewardOrder,
} from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;
  const redemptionId = randomUUID();

  try {
    const body = (await request.json()) as { reward_id?: string };
    const rewardId = String(body.reward_id ?? '').trim();
    if (!rewardId) {
      return NextResponse.json({ error: 'reward_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, phone, email, reward_points_available, chezahub_user_id')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profileRaw) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profileRaw as {
      id: string;
      username?: string | null;
      phone?: string | null;
      email?: string | null;
      reward_points_available?: number | null;
      chezahub_user_id?: string | null;
    };

    const items = await getRewardCatalogFromCache(supabase);
    const reward = items.find((item) => item.id === rewardId && item.active);

    if (!reward) {
      return NextResponse.json({ error: 'Reward not available' }, { status: 404 });
    }

    if ((profile.reward_points_available ?? 0) < reward.points_cost) {
      return NextResponse.json({ error: 'Not enough reward points' }, { status: 400 });
    }

    if (reward.reward_type === 'mechi_perk') {
      const { data: existingPerk } = await supabase
        .from('reward_redemptions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('reward_id', rewardId)
        .eq('status', 'issued')
        .maybeSingle();

      if (existingPerk) {
        return NextResponse.json({ error: 'You already have this perk active' }, { status: 409 });
      }

      await applyRewardEvent(supabase, {
        userId: profile.id,
        eventKey: `reward:redeem:${redemptionId}`,
        eventType: 'reward_redemption_spend',
        availableDelta: -reward.points_cost,
        source: 'reward_redeem',
        metadata: { reward_id: reward.id, reward_type: reward.reward_type },
      });

      try {
        if (rewardId.startsWith('mechi_badge_')) {
          await supabase.from('profile_badges').upsert(
            { user_id: profile.id, badge_id: rewardId },
            { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
          );
        } else if (rewardId === 'mechi_pro_7day') {
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await supabase
            .from('profiles')
            .update({ plan: 'pro', plan_expires_at: expiresAt })
            .eq('id', profile.id);
        }
      } catch (perkError) {
        await applyRewardEvent(supabase, {
          userId: profile.id,
          eventKey: `reward:redeem-reversal:${redemptionId}`,
          eventType: 'reward_redemption_reversal',
          availableDelta: reward.points_cost,
          source: 'reward_redeem',
          metadata: { reason: 'perk_apply_failed', reward_id: reward.id },
        }).catch(() => null);
        throw perkError;
      }

      const expiresAt = reward.expires_in_hours
        ? new Date(Date.now() + reward.expires_in_hours * 60 * 60 * 1000).toISOString()
        : null;

      const { error: insertError } = await supabase.from('reward_redemptions').insert({
        id: redemptionId,
        user_id: profile.id,
        reward_id: reward.id,
        reward_type: reward.reward_type,
        title: reward.title,
        code: null,
        points_cost: reward.points_cost,
        external_issuance_id: null,
        expires_at: expiresAt,
        metadata: { phase: reward.phase, source: 'mechi_native' },
      });

      if (insertError) {
        await applyRewardEvent(supabase, {
          userId: profile.id,
          eventKey: `reward:redeem-reversal:${redemptionId}`,
          eventType: 'reward_redemption_reversal',
          availableDelta: reward.points_cost,
          source: 'reward_redeem',
          metadata: { reason: 'insert_failed', reward_id: reward.id },
        }).catch(() => null);
        throw insertError;
      }

      return NextResponse.json({
        redemption: {
          id: redemptionId,
          reward_id: reward.id,
          reward_type: reward.reward_type,
          title: reward.title,
          code: null,
          expires_at: expiresAt,
          points_cost: reward.points_cost,
        },
      });
    }

    let chezahubUserId = profile.chezahub_user_id ?? null;
    let accessHint: string | null = null;
    let ordersUrl: string | null = null;

    if (!chezahubUserId) {
      if (!profile.email?.trim()) {
        return NextResponse.json(
          { error: 'Add an email address to your profile before redeeming partner rewards' },
          { status: 400 }
        );
      }

      const ensuredCustomer = await ensureChezahubCustomer({
        mechiUserId: profile.id,
        username: profile.username?.trim() || authUser.username || 'Mechi player',
        email: profile.email.trim(),
        phone: profile.phone ?? null,
      });

      chezahubUserId = ensuredCustomer.chezahubUserId;
      accessHint = ensuredCustomer.accessHint;
      ordersUrl = ensuredCustomer.ordersUrl;

      const { error: profileSyncError } = await supabase
        .from('profiles')
        .update({
          chezahub_user_id: chezahubUserId,
          chezahub_linked_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (profileSyncError) {
        console.warn('[Rewards Redeem] Failed to persist ensured ChezaHub user:', profileSyncError);
      }
    }

    const { data: existingIssued } = await supabase
      .from('reward_redemptions')
      .select('id')
      .eq('user_id', profile.id)
      .eq('reward_type', reward.reward_type)
      .eq('status', 'issued')
      .limit(1)
      .maybeSingle();

    if (existingIssued) {
      return NextResponse.json(
        { error: 'Finish or cancel your current partner redemption before starting another one' },
        { status: 409 }
      );
    }

    const { count: priorRedemptionCount, error: priorRedemptionCountError } = await supabase
      .from('reward_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id);

    if (priorRedemptionCountError) {
      throw priorRedemptionCountError;
    }

    const issued = await issueChezahubRewardOrder({
      mechiUserId: profile.id,
      chezahubUserId,
      rewardId: reward.id,
      rewardType: reward.reward_type as 'discount_code' | 'reward_claim',
      customerEmail: profile.email?.trim() || 'unknown@mechi.player',
      customerName: profile.username?.trim() || authUser.username || 'Mechi player',
      customerPhone: profile.phone ?? null,
    });

    try {
      await applyRewardEvent(supabase, {
        userId: profile.id,
        eventKey: `reward:redeem:${redemptionId}`,
        eventType: 'reward_redemption_spend',
        availableDelta: -reward.points_cost,
        source: 'reward_redeem',
        metadata: {
          reward_id: reward.id,
          reward_type: reward.reward_type,
          issuance_id: issued.issuanceId,
          order_id: issued.orderId,
        },
      });
    } catch (spendError) {
      await voidChezahubRewardOrder(issued.issuanceId);
      throw spendError;
    }

    const { error: insertError } = await supabase.from('reward_redemptions').insert({
      id: redemptionId,
      user_id: profile.id,
      reward_id: reward.id,
      reward_type: reward.reward_type,
      title: reward.title,
      code: null,
      points_cost: reward.points_cost,
      external_issuance_id: issued.issuanceId,
      expires_at: null,
      metadata: {
        phase: reward.phase,
        source: 'chezahub',
        partner: 'chezahub',
        partner_order_id: issued.orderId,
        partner_order_url: issued.orderUrl ?? ordersUrl,
        partner_status: issued.status,
        delivery_channel: issued.deliveryChannel,
        access_hint: issued.accessHint ?? accessHint,
      },
    });

    if (insertError) {
      await applyRewardEvent(supabase, {
        userId: profile.id,
        eventKey: `reward:redeem-reversal:${redemptionId}`,
        eventType: 'reward_redemption_reversal',
        availableDelta: reward.points_cost,
        source: 'reward_redeem',
        metadata: { reason: 'insert_failed', reward_id: reward.id },
      }).catch(() => null);
      await voidChezahubRewardOrder(issued.issuanceId);
      throw insertError;
    }

    if ((priorRedemptionCount ?? 0) === 0) {
      void tryClaimBounty(supabase, profile.id, 'first_voucher_redeem').catch(() => null);
    }

    return NextResponse.json({
      redemption: {
        id: redemptionId,
        reward_id: reward.id,
        reward_type: reward.reward_type,
        title: reward.title,
        code: null,
        expires_at: null,
        points_cost: reward.points_cost,
        partner_order_url: issued.orderUrl ?? ordersUrl,
        partner_status: issued.status,
        delivery_channel: issued.deliveryChannel,
        access_hint: issued.accessHint ?? accessHint,
      },
    });
  } catch (error) {
    console.error('[Rewards Redeem] Error:', error);
    return NextResponse.json({ error: 'Failed to redeem reward' }, { status: 500 });
  }
}
