import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  fetchChezahubRewardCatalog,
  getRewardCatalogFromCache,
  syncChezahubCatalogToCache,
} from '@/lib/rewards';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const supabase = createServiceClient();
    let items = await getRewardCatalogFromCache(supabase);
    const missingPartnerCatalog = !items.some((item) => item.source === 'chezahub');

    if (items.length === 0 || missingPartnerCatalog) {
      try {
        const fresh = await fetchChezahubRewardCatalog();
        if (fresh.length > 0) {
          await syncChezahubCatalogToCache(supabase, fresh);
          items = await getRewardCatalogFromCache(supabase);
        }
      } catch (syncError) {
        console.warn('[Rewards Catalog] Cache empty and sync failed:', syncError);
      }
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[Rewards Catalog] Error:', error);
    return NextResponse.json({ error: 'Failed to load rewards catalog' }, { status: 500 });
  }
}
