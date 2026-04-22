import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  applyRewardEvent,
  REWARD_RULES,
} from '@/lib/rewards';
import {
  buildStreamWatchEventKey,
  getNairobiDayBounds,
  getNairobiTenMinuteBlockStamp,
  refreshLiveStreamViewerCount,
  STREAM_MAX_WATCH_AWARDS_PER_DAY,
} from '@/lib/live-streams';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = (await request.json()) as { stream_id?: string | null };
    const streamId = String(body.stream_id ?? '').trim();

    if (!streamId) {
      return NextResponse.json({ error: 'stream_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: streamRaw } = await supabase
      .from('live_streams')
      .select('id, status')
      .eq('id', streamId)
      .maybeSingle();

    const stream = streamRaw as { id: string; status: string } | null;
    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.status === 'ended') {
      return NextResponse.json(
        { error: 'This stream has already ended' },
        { status: 400 }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const { data: existingSessionRaw } = await supabase
      .from('stream_watch_sessions')
      .select('id, rp_awarded')
      .eq('stream_id', streamId)
      .eq('user_id', access.profile.id)
      .maybeSingle();

    const existingSession = existingSessionRaw as
      | {
          id: string;
          rp_awarded: number | null;
        }
      | null;

    const { error: sessionError } = await supabase
      .from('stream_watch_sessions')
      .upsert(
        {
          stream_id: streamId,
          user_id: access.profile.id,
          last_heartbeat_at: nowIso,
          rp_awarded: existingSession?.rp_awarded ?? 0,
        },
        { onConflict: 'stream_id,user_id' }
      );

    if (sessionError) {
      throw sessionError;
    }

    let rpAwarded = 0;
    const { start, end } = getNairobiDayBounds(now);
    const { count: dailyAwardCount } = await supabase
      .from('reward_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', access.profile.id)
      .eq('event_type', 'stream_watch')
      .gte('created_at', start)
      .lt('created_at', end);

    if ((dailyAwardCount ?? 0) < STREAM_MAX_WATCH_AWARDS_PER_DAY) {
      const rewardResult = await applyRewardEvent(supabase, {
        userId: access.profile.id,
        eventKey: buildStreamWatchEventKey(
          streamId,
          access.profile.id,
          getNairobiTenMinuteBlockStamp(now)
        ),
        eventType: 'stream_watch',
        availableDelta: REWARD_RULES.watchStream,
        lifetimeDelta: REWARD_RULES.watchStream,
        source: 'live_stream',
        metadata: {
          stream_id: streamId,
        },
      }).catch((error) => {
        console.error('[Streams Heartbeat] Reward error:', error);
        return null;
      });

      if (rewardResult?.inserted) {
        rpAwarded = REWARD_RULES.watchStream;
      }
    }

    if (rpAwarded > 0) {
      await supabase
        .from('stream_watch_sessions')
        .update({
          rp_awarded: (existingSession?.rp_awarded ?? 0) + rpAwarded,
        })
        .eq('stream_id', streamId)
        .eq('user_id', access.profile.id);
    }

    await refreshLiveStreamViewerCount(supabase, streamId, now);

    return NextResponse.json({ rp_awarded: rpAwarded });
  } catch (error) {
    console.error('[Streams Heartbeat] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
