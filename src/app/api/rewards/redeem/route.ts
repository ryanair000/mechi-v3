import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { tryClaimBounty } from '@/lib/bounties';
import {
  applyRewardEvent,
  getRewardCatalogFromCache,
  issueChezahubRewardCode,
  voidChezahubRewardCode,
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
      .select('id, reward_points_available, chezahub_user_id')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profileRaw) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profileRaw as {
      id: string;
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

    // ── Mechi-native perks (no ChezaHub call) ────────────────────────────────
    if (reward.reward_type === 'mechi_perk') {
      // Check for duplicate active mechi perk
      const { data: existingPerk } = await supabase
        .from('reward_redemptions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('reward_id', rewardId)
        .eq('status', 'issued')
        .maybeSingle();

      if (existingPerk) {
        return NextResponse.json(
          { error: 'You already have this perk active' },
          { status: 409 }
        );
      }

      // Deduct RP
      await applyRewardEvent(supabase, {
        userId: profile.id,
        eventKey: `reward:redeem:${redemptionId}`,
        eventType: 'reward_redemption_spend',
        availableDelta: -reward.points_cost,
        source: 'reward_redeem',
        metadata: { reward_id: reward.id, reward_type: reward.reward_type },
      });

      // Apply the perk
      try {
        if (rewardId.startsWith('mechi_badge_')) {
          await supabase
            .from('profile_badges')
            .upsert({ user_id: profile.id, badge_id: rewardId }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
        } else if (rewardId === 'mechi_pro_7day') {
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await supabase
            .from('profiles')
            .update({ plan: 'pro', plan_expires_at: expiresAt })
            .eq('id', profile.id);
        }
        // mechi_priority_queue: stored in redemptions row, read at matchmaking time
      } catch (perkError) {
        // Reverse the RP deduction on perk apply failure
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

      const expiresAt =
        reward.expires_in_hours
          ? new Date(Date.now() + reward.expires_in_hours * 60 * 60 * 1000).toISOString()
          : null;

      await supabase.from('reward_redemptions').insert({
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

    // ── ChezaHub rewards (discount codes / reward claims) ─────────────────────
    if (!profile.chezahub_user_id) {
      return NextResponse.json({ error: 'Link your ChezaHub account first' }, { status: 400 });
    }

    const { data: existingIssued } = await supabase
      .from('reward_redemptions')
      .select('id')
      .eq('user_id', profile.id)
      .eq('reward_type', reward.reward_type)
      .eq('status', 'issued')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (existingIssued) {
      return NextResponse.json(
        { error: 'Use or wait for your existing active code before generating another one' },
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

    const issued = await issueChezahubRewardCode({
      mechiUserId: profile.id,
      chezahubUserId: profile.chezahub_user_id,
      rewardId: reward.id,
      rewardType: reward.reward_type as 'discount_code' | 'reward_claim',
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
        },
      });
    } catch (spendError) {
      await voidChezahubRewardCode(issued.issuanceId);
      throw spendError;
    }

    const { error: insertError } = await supabase.from('reward_redemptions').insert({
      id: redemptionId,
      user_id: profile.id,
      reward_id: reward.id,
      reward_type: reward.reward_type,
      title: reward.title,
      code: issued.code,
      points_cost: reward.points_cost,
      external_issuance_id: issued.issuanceId,
      expires_at: issued.expiresAt,
      metadata: { phase: reward.phase },
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
      await voidChezahubRewardCode(issued.issuanceId);
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
        code: issued.code,
        expires_at: issued.expiresAt,
        points_cost: reward.points_cost,
      },
    });
  } catch (error) {
    console.error('[Rewards Redeem] Error:', error);
    return NextResponse.json({ error: 'Failed to redeem reward' }, { status: 500 });
  }
}
