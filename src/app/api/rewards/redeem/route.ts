import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { VOUCHER_TIERS, applyRewardEvent, generateVoucherCode } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

const VOUCHER_EXPIRY_HOURS = 48;

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

    const tier = VOUCHER_TIERS.find((t) => t.id === rewardId);
    if (!tier) {
      return NextResponse.json({ error: 'Reward not available' }, { status: 404 });
    }

    const supabase = createServiceClient();
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('id, reward_points_available')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profileRaw) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = profileRaw as { id: string; reward_points_available?: number | null };

    if ((profile.reward_points_available ?? 0) < tier.points_cost) {
      return NextResponse.json({ error: 'Not enough reward points' }, { status: 400 });
    }

    const { data: existingIssued } = await supabase
      .from('reward_redemptions')
      .select('id')
      .eq('user_id', profile.id)
      .eq('reward_id', tier.id)
      .eq('status', 'issued')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (existingIssued) {
      return NextResponse.json(
        { error: 'You already have an active voucher for this tier. Use it before generating another.' },
        { status: 409 }
      );
    }

    const code = generateVoucherCode();
    const expiresAt = new Date(Date.now() + VOUCHER_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    await applyRewardEvent(supabase, {
      userId: profile.id,
      eventKey: `reward:redeem:${redemptionId}`,
      eventType: 'reward_redemption_spend',
      availableDelta: -tier.points_cost,
      source: 'reward_redeem',
      metadata: {
        reward_id: tier.id,
        reward_type: 'voucher',
        value_kes: tier.value_kes,
      },
    });

    const { error: insertError } = await supabase.from('reward_redemptions').insert({
      id: redemptionId,
      user_id: profile.id,
      reward_id: tier.id,
      reward_type: 'voucher',
      title: tier.title,
      code,
      points_cost: tier.points_cost,
      external_issuance_id: null,
      expires_at: expiresAt,
      metadata: { value_kes: tier.value_kes },
    });

    if (insertError) {
      await applyRewardEvent(supabase, {
        userId: profile.id,
        eventKey: `reward:redeem-reversal:${redemptionId}`,
        eventType: 'reward_redemption_reversal',
        availableDelta: tier.points_cost,
        source: 'reward_redeem',
        metadata: { reason: 'insert_failed', reward_id: tier.id },
      }).catch(() => null);
      throw insertError;
    }

    return NextResponse.json({
      redemption: {
        id: redemptionId,
        reward_id: tier.id,
        reward_type: 'voucher',
        title: tier.title,
        code,
        expires_at: expiresAt,
        points_cost: tier.points_cost,
        value_kes: tier.value_kes,
      },
    });
  } catch (error) {
    console.error('[Rewards Redeem] Error:', error);
    return NextResponse.json({ error: 'Failed to redeem reward' }, { status: 500 });
  }
}
