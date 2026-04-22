import type Mux from '@mux/mux-node';
import { createServiceClient } from '@/lib/supabase';
import { REWARD_RULES } from '@/lib/rewards';

export const STREAM_ACTIVE_STATUSES = ['idle', 'active'] as const;
export const STREAM_HEARTBEAT_INTERVAL_MINUTES = 10;
export const STREAM_ACTIVE_VIEWER_WINDOW_MINUTES = 15;
export const STREAM_MAX_WATCH_AWARDS_PER_DAY =
  REWARD_RULES.maxWatchRpPerDay / REWARD_RULES.watchStream;

type SupabaseClient = ReturnType<typeof createServiceClient>;

export function getStreamHeartbeatCutoff(date = new Date()) {
  return new Date(
    date.getTime() - STREAM_ACTIVE_VIEWER_WINDOW_MINUTES * 60 * 1000
  ).toISOString();
}

function getNairobiDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';

  return {
    year,
    month,
    day,
    hour,
    minute,
  };
}

export function getNairobiTenMinuteBlockStamp(date = new Date()) {
  const parts = getNairobiDateParts(date);
  const flooredMinute = Math.floor(Number(parts.minute) / STREAM_HEARTBEAT_INTERVAL_MINUTES)
    * STREAM_HEARTBEAT_INTERVAL_MINUTES;

  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}-${String(
    flooredMinute
  ).padStart(2, '0')}`;
}

export function getNairobiDayBounds(date = new Date()) {
  const parts = getNairobiDateParts(date);
  const start = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function buildStreamWatchEventKey(streamId: string, userId: string, blockStamp: string) {
  return `stream:watch:${streamId}:${userId}:${blockStamp}`;
}

export function buildGoLiveBonusEventKey(streamId: string) {
  return `stream:go-live-bonus:${streamId}`;
}

type PlaybackLike = Array<{ id?: string | null; policy?: string | null }> | null | undefined;

export function getMuxPlaybackId(playbackIds: PlaybackLike) {
  const signed = playbackIds?.find((playbackId) => playbackId.policy === 'signed')?.id;
  if (signed) {
    return signed;
  }

  return playbackIds?.[0]?.id ?? null;
}

export async function refreshLiveStreamViewerCount(
  supabase: SupabaseClient,
  streamId: string,
  date = new Date()
) {
  const cutoff = getStreamHeartbeatCutoff(date);
  const { count, error } = await supabase
    .from('stream_watch_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('stream_id', streamId)
    .gte('last_heartbeat_at', cutoff);

  if (error) {
    throw error;
  }

  const viewerCount = count ?? 0;
  const nowIso = date.toISOString();

  const { error: updateError } = await supabase
    .from('live_streams')
    .update({
      viewer_count: viewerCount,
      updated_at: nowIso,
    })
    .eq('id', streamId);

  if (updateError) {
    throw updateError;
  }

  return viewerCount;
}

export function getMuxAssetPlaybackId(
  event:
    | Awaited<ReturnType<Mux['webhooks']['unwrap']>>
    | {
        data?: {
          playback_ids?: PlaybackLike;
        };
      }
) {
  const playbackIds = (event as { data?: { playback_ids?: PlaybackLike } }).data?.playback_ids;
  return getMuxPlaybackId(playbackIds);
}
