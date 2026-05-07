import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import {
  getTournamentHostingAccess,
  getTournamentHostingMonthWindow,
} from '@/lib/tournament-hosting';
import { maybeExpireProfilePlan } from '@/lib/subscription';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const supabase = createServiceClient();
    const { data: profileRaw, error: profileError } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', access.profile.id)
      .single();

    if (profileError || !profileRaw) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const resolvedPlan = await maybeExpireProfilePlan(
      {
        id: access.profile.id,
        plan: profileRaw.plan as string | null | undefined,
        plan_expires_at: profileRaw.plan_expires_at as string | null | undefined,
      },
      supabase
    );

    let hostedThisMonth = 0;
    if (resolvedPlan === 'elite') {
      const { startIso, endIso } = getTournamentHostingMonthWindow();
      const { count, error: countError } = await supabase
        .from('tournaments')
        .select('id', { head: true, count: 'exact' })
        .eq('organizer_id', access.profile.id)
        .gte('created_at', startIso)
        .lt('created_at', endIso);

      if (countError) {
        return NextResponse.json({ error: 'Could not load hosting access' }, { status: 500 });
      }

      hostedThisMonth = count ?? 0;
    }

    const hostingAccess = getTournamentHostingAccess(resolvedPlan, hostedThisMonth);

    return NextResponse.json({
      access: {
        plan: hostingAccess.plan,
        can_host: hostingAccess.canHost,
        platform_fee_percent: hostingAccess.platformFeePercent,
        elite_fee_free_limit: hostingAccess.eliteFeeFreeLimit,
        elite_fee_free_used: hostingAccess.eliteFeeFreeUsed,
        elite_fee_free_remaining: hostingAccess.eliteFeeFreeRemaining,
        fee_waived: hostingAccess.feeWaived,
      },
    });
  } catch (error) {
    console.error('[Tournament Host Access] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
