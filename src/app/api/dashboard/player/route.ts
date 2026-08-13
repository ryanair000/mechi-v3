import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { loadPlayerDashboardData } from '@/lib/player-dashboard-data';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  try {
    const data = await loadPlayerDashboardData(
      createServiceClient(),
      access.profile.id
    );
    if (!data) {
      return NextResponse.json(
        { error: 'Could not load your player home.' },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Player dashboard] Unexpected error', error);
    return NextResponse.json(
      { error: 'Could not load your player home.' },
      { status: 500 }
    );
  }
}
