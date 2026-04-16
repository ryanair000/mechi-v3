import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getConfiguredPlatformForGame } from '@/lib/config';
import { createServiceClient } from '@/lib/supabase';
import { runMatchmaking } from '@/lib/matchmaking';
import type { GameKey, PlatformKey } from '@/types';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Get current queue entry (check both waiting and matched)
    const { data: queueEntry } = await supabase
      .from('queue')
      .select('*')
      .eq('user_id', authUser.sub)
      .in('status', ['waiting', 'matched'])
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check for active match
    const { data: activeMatch } = await supabase
      .from('matches')
      .select('id, game, status')
      .or(`player1_id.eq.${authUser.sub},player2_id.eq.${authUser.sub}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If still waiting, re-run matchmaking on each poll (keeps trying until match found)
    if (queueEntry?.status === 'waiting' && !activeMatch) {
      runMatchmaking(supabase).catch(console.error);
    }

    let normalizedQueueEntry = queueEntry;

    if (queueEntry && !(queueEntry as Record<string, unknown>).platform) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('platforms, game_ids')
        .eq('id', authUser.sub)
        .maybeSingle();

      const derivedPlatform = profile
        ? getConfiguredPlatformForGame(
            queueEntry.game as GameKey,
            (profile.game_ids as Record<string, string>) ?? {},
            ((profile.platforms as string[]) ?? []) as PlatformKey[]
          )
        : null;

      normalizedQueueEntry = {
        ...queueEntry,
        platform: derivedPlatform,
      };
    }

    return NextResponse.json({
      inQueue: queueEntry?.status === 'waiting',
      queueEntry: normalizedQueueEntry ?? null,
      activeMatch: activeMatch ?? null,
    });
  } catch (err) {
    console.error('[Queue Status] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
