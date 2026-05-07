import { NextRequest, NextResponse } from 'next/server';
import { applyRewardEvent, REWARD_RULES } from '@/lib/rewards';
import {
  buildGoLiveBonusEventKey,
  getMuxAssetPlaybackId,
} from '@/lib/live-streams';
import { createServiceClient } from '@/lib/supabase';
import { unwrapMuxWebhook } from '@/lib/mux';

export const runtime = 'nodejs';

function isWebhookVerificationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('signature') ||
    message.includes('webhook secret') ||
    message.includes('mux-signature')
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const event = await unwrapMuxWebhook(rawBody, request.headers);
    const supabase = createServiceClient();
    const now = new Date();
    const nowIso = now.toISOString();

    switch (event.type) {
      case 'video.live_stream.active': {
        const liveStreamId = event.data.id;
        const { data: streamRaw } = await supabase
          .from('live_streams')
          .select('id, started_at')
          .eq('mux_stream_id', liveStreamId)
          .maybeSingle();

        const stream = streamRaw as { id: string; started_at: string | null } | null;
        if (!stream) {
          return NextResponse.json({ received: true, ignored: true });
        }

        await supabase
          .from('live_streams')
          .update({
            status: 'active',
            started_at: stream.started_at ?? nowIso,
            updated_at: nowIso,
          })
          .eq('id', stream.id);

        break;
      }

      case 'video.live_stream.idle': {
        const liveStreamId = event.data.id;
        const { data: streamRaw } = await supabase
          .from('live_streams')
          .select('id, streamer_id, status, started_at')
          .eq('mux_stream_id', liveStreamId)
          .maybeSingle();

        const stream = streamRaw as
          | {
              id: string;
              streamer_id: string;
              status: string;
              started_at: string | null;
            }
          | null;

        if (!stream) {
          return NextResponse.json({ received: true, ignored: true });
        }

        if (stream.status === 'active') {
          await supabase
            .from('live_streams')
            .update({
              status: 'ended',
              ended_at: nowIso,
              viewer_count: 0,
              updated_at: nowIso,
            })
            .eq('id', stream.id);

          const startedAtMs = stream.started_at ? new Date(stream.started_at).getTime() : null;
          if (startedAtMs && now.getTime() - startedAtMs >= 10 * 60 * 1000) {
            await applyRewardEvent(supabase, {
              userId: stream.streamer_id,
              eventKey: buildGoLiveBonusEventKey(stream.id),
              eventType: 'stream_go_live_bonus',
              availableDelta: REWARD_RULES.goLiveBonus,
              lifetimeDelta: REWARD_RULES.goLiveBonus,
              source: 'live_stream',
              metadata: {
                duration_minutes: Math.floor((now.getTime() - startedAtMs) / 60000),
              },
            }).catch((error) => {
              console.error('[Streams Webhook] Go-live bonus error:', error);
              return null;
            });
          }
        } else if (stream.status !== 'ended') {
          await supabase
            .from('live_streams')
            .update({
              status: 'idle',
              updated_at: nowIso,
            })
            .eq('id', stream.id);
        }

        break;
      }

      case 'video.live_stream.disconnected':
        break;

      case 'video.asset.live_stream_completed': {
        const liveStreamId = event.data.live_stream_id;
        const recordingPlaybackId = getMuxAssetPlaybackId(event);

        if (!liveStreamId || !recordingPlaybackId) {
          return NextResponse.json({ received: true, ignored: true });
        }

        await supabase
          .from('live_streams')
          .update({
            recording_playback_id: recordingPlaybackId,
            updated_at: nowIso,
          })
          .eq('mux_stream_id', liveStreamId);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Streams Webhook] Error:', error);
    if (isWebhookVerificationError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
