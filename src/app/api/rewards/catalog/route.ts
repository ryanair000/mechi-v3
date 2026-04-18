import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { fetchChezahubRewardCatalog } from '@/lib/rewards';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await fetchChezahubRewardCatalog();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[Rewards Catalog] Error:', error);
    return NextResponse.json({ error: 'Failed to load rewards catalog' }, { status: 500 });
  }
}
