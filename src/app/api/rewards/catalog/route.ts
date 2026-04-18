import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { fetchChezahubRewardCatalog } from '@/lib/rewards';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const items = await fetchChezahubRewardCatalog();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[Rewards Catalog] Error:', error);
    return NextResponse.json({ error: 'Failed to load rewards catalog' }, { status: 500 });
  }
}
