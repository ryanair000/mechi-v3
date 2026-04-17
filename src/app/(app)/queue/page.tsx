'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Users, X } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { PlatformLogo } from '@/components/PlatformLogo';
import { createClient } from '@/lib/supabase';
import { GAMES, PLATFORMS, getCanonicalGameKey } from '@/lib/config';
import type { GameKey, PlatformKey } from '@/types';

function QueueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const rawGame = searchParams.get('game') as GameKey | null;
  const game = rawGame && GAMES[rawGame] ? getCanonicalGameKey(rawGame) : null;
  const platform = searchParams.get('platform') as PlatformKey | null;
  const [elapsed, setElapsed] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const checkStatus = useCallback(async () => {
    if (!user) return;

    try {
      const res = await authFetch('/api/queue/status');
      if (!res.ok) return;

      const data = await res.json();
      if (data.activeMatch) {
        router.push(`/match/${data.activeMatch.id}`);
      } else if (!data.inQueue) {
        router.push('/dashboard');
      }
    } catch {
      // ignore
    }
  }, [authFetch, user, router]);

  useEffect(() => {
    if (!game || !GAMES[game]) {
      router.push('/dashboard');
      return;
    }

    timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);

    const fetchCount = async () => {
      try {
        const platformQuery = platform ? `?platform=${encodeURIComponent(platform)}` : '';
        const res = await fetch(`/api/queue/count/${game}${platformQuery}`);
        if (res.ok) {
          const data = await res.json();
          setQueueCount(data.count);
        }
      } catch {
        // ignore
      }
    };

    void fetchCount();
    pollRef.current = setInterval(fetchCount, 8000);

    const supabase = createClient();
    if (user?.id) {
      const channel = supabase
        .channel(`queue_user_${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'queue' },
          (payload) => {
            const row = payload.new as { user_id: string; status: string };
            if (row.user_id !== user.id) return;

            if (row.status === 'matched') {
              void checkStatus();
            } else if (row.status === 'cancelled') {
              router.push('/dashboard');
            }
          }
        )
        .subscribe();
      channelRef.current = channel;
    }

    const statusPoll = setInterval(() => {
      void checkStatus();
    }, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(statusPoll);
      if (channelRef.current) channelRef.current.unsubscribe();
    };
  }, [game, platform, user, router, checkStatus]);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      const res = await authFetch('/api/queue/leave', { method: 'POST' });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed to leave queue');
      }
      toast.success('Left the queue');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave queue');
      setLeaving(false);
    }
  };

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (!game) return null;
  const gameConfig = GAMES[game];
  const queuePlatforms = platform
    ? gameConfig.platforms.filter((item) => item === platform)
    : gameConfig.platforms.filter((item) => (user?.platforms ?? []).includes(item));
  const displayedPlatforms = queuePlatforms.length > 0 ? queuePlatforms : gameConfig.platforms;
  const platformLabel = displayedPlatforms
    .map((platform) => PLATFORMS[platform]?.label ?? platform)
    .join(' / ');

  return (
    <div className="page-container flex min-h-[80vh] items-center justify-center">
      <div className="card circuit-panel relative w-full max-w-lg overflow-hidden p-6 text-center sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.18),transparent_65%)]" />

        <div className="relative mb-7 inline-flex">
          <div className="absolute inset-0 scale-150 animate-ping rounded-full border border-[rgba(50,224,196,0.16)]" />
          <div
            className="absolute inset-0 scale-125 animate-ping rounded-full border border-[rgba(255,107,107,0.18)]"
            style={{ animationDelay: '0.5s' }}
          />
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.1)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.12)]">
              <BrandLogo
                variant="symbol"
                size="lg"
                iconClassName="h-12 w-12 rounded-full border-0 bg-transparent shadow-none"
              />
            </div>
          </div>
        </div>

        <h1 className="text-[2rem] font-black tracking-normal text-[var(--text-primary)] sm:text-[2.15rem]">
          We&apos;re cooking up your next matchup.
        </h1>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{gameConfig.label}</p>
        <p className="mt-3 text-[2rem] font-black tabular-nums text-[var(--brand-coral)] sm:text-[2.25rem]">
          {formatTime(elapsed)}
        </p>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <div className="card flex items-center justify-center gap-2 px-3 py-2.5">
            <Users size={13} className="text-[var(--text-soft)]" />
            <span className="text-[13px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{queueCount}</span> in queue
            </span>
          </div>
          <div className="card flex flex-wrap items-center justify-center gap-2 px-3 py-2.5 text-center">
            {displayedPlatforms.map((platform) => (
              <span key={platform} aria-hidden="true">
                <PlatformLogo platform={platform} size={16} />
              </span>
            ))}
            <span className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">{platformLabel}</span>
          </div>
        </div>

        <p className="mx-auto mb-6 mt-5 max-w-sm text-center text-[13px] leading-6 text-[var(--text-secondary)]">
          Mechi is checking your {platformLabel} pool first, then opening the net wider if things stay quiet. You can
          leave the app and keep your queue live. When a match lands, Mechi sends the update by email and WhatsApp.
        </p>

        <button onClick={handleLeave} disabled={leaving} className="btn-danger mx-auto px-4 py-2 text-sm">
          <X size={13} />
          {leaving ? 'Leaving...' : 'Cancel Search'}
        </button>
      </div>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-teal)] border-t-transparent" />
        </div>
      }
    >
      <QueueContent />
    </Suspense>
  );
}
