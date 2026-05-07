import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { runMatchmaking } from '@/lib/matchmaking';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Matchmaking Cron] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Matchmaking is not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const matchesCreated = await runMatchmaking(supabase);

    return NextResponse.json({
      success: true,
      matchesCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Matchmaking Cron] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
