import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getRewardCatalogForUser } from '@/lib/rewards-wallet';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const supabase = createServiceClient();
    const { items, profilePhone } = await getRewardCatalogForUser(supabase, access.profile.id);
    return NextResponse.json({ items, profile_phone: profilePhone });
  } catch (error) {
    console.error('[Rewards Catalog] Error:', error);
    return NextResponse.json({ error: 'Failed to load rewards catalog' }, { status: 500 });
  }
}
