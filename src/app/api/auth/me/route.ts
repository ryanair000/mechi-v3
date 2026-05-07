import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, profileToAuthUser } from '@/lib/auth';
import { maybeAwardDailyLogin } from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';
import { maybeExpireProfilePlan } from '@/lib/subscription';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.sub)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (profile.is_banned) {
    return NextResponse.json(
      { error: `Account suspended: ${profile.ban_reason ?? 'Contact support.'}` },
      { status: 403 }
    );
  }

  const resolvedPlan = await maybeExpireProfilePlan(
    {
      id: profile.id as string,
      plan: profile.plan as string | null | undefined,
      plan_expires_at: profile.plan_expires_at as string | null | undefined,
    },
    supabase
  );

  const safeProfile =
    resolvedPlan === profile.plan
      ? profile
      : {
          ...profile,
          plan: resolvedPlan,
          plan_since: null,
          plan_expires_at: null,
        };

  // Fire-and-forget daily login bonus (idempotent — safe to call on every session load)
  maybeAwardDailyLogin(supabase, profile.id as string).catch(console.error);

  return NextResponse.json({ user: profileToAuthUser(safeProfile) });
}
