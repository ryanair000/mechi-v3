'use client';

import MuxPlayer from '@mux/mux-player-react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import type { LiveStream } from '@/types';

interface StreamPlayerProps {
  stream: Pick<
    LiveStream,
    'id' | 'mux_playback_id' | 'recording_playback_id' | 'status' | 'title'
  >;
}

export function StreamPlayer({ stream }: StreamPlayerProps) {
  const authFetch = useAuthFetch();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const isLivePlayback = stream.status !== 'ended';
  const playbackId = useMemo(
    () =>
      isLivePlayback
        ? stream.mux_playback_id
        : (stream.recording_playback_id ?? null),
    [isLivePlayback, stream.mux_playback_id, stream.recording_playback_id]
  );

  const sendHeartbeat = useEffectEvent(async () => {
    if (!isLivePlayback) {
      return;
    }

    try {
      const response = await authFetch('/api/streams/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ stream_id: stream.id }),
      });
      const payload = (await response.json()) as { rp_awarded?: number; error?: string };

      if (!response.ok) {
        return;
      }

      if ((payload.rp_awarded ?? 0) > 0) {
        toast.success(`+${payload.rp_awarded} RP for watching live`);
      }
    } catch {
      // Heartbeats are best-effort.
    }
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchToken() {
      if (!playbackId) {
        setToken('');
        setError('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await authFetch(
          `/api/streams/token?playback_id=${encodeURIComponent(playbackId)}`
        );
        const payload = (await response.json()) as { token?: string; error?: string };

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.token) {
          setToken('');
          setError(payload.error ?? 'Could not load the secure stream');
          return;
        }

        setToken(payload.token);
      } catch {
        if (!cancelled) {
          setToken('');
          setError('Could not load the secure stream');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchToken();

    return () => {
      cancelled = true;
    };
  }, [authFetch, playbackId]);

  useEffect(() => {
    if (!isPlaying || !isLivePlayback) {
      return;
    }

    void sendHeartbeat();

    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, 10 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isLivePlayback, isPlaying]);

  if (!playbackId) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-black text-[var(--text-primary)]">Stream ended</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          The broadcast is over and the replay is not ready yet.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)]">
        <div className="aspect-video shimmer" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-black text-[var(--text-primary)]">
          Could not start this stream
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {error || 'Try refreshing the page in a moment.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <MuxPlayer
        className="aspect-video w-full"
        playbackId={playbackId}
        streamType={isLivePlayback ? 'll-live' : 'on-demand'}
        tokens={{ playback: token }}
        envKey={process.env.NEXT_PUBLIC_MUX_ENV_KEY || undefined}
        metadata={{
          video_title: stream.title,
          video_id: stream.id,
        }}
        poster=""
        storyboardSrc=""
        onPlay={() => setIsPlaying(true)}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}
