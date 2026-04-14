'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';
import toast from 'react-hot-toast';
import { Loader2, X, Users } from 'lucide-react';
import { Suspense } from 'react';

function QueueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const authFetch = useAuthFetch();

  const game = searchParams.get('game') as GameKey | null;
  const [elapsed, setElapsed] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const checkStatus = useCallback(async () => {
    if (!token) return;
    const res = await authFetch('/api/queue/status');
    if (res.ok) {
      const data = await res.json();
      if (data.activeMatch) {
        router.push(`/match/${data.activeMatch.id}`);
        return;
      }
      if (!data.inQueue && !data.activeMatch) {
        // Queue entry cancelled or matched
        router.push('/dashboard');
      }
    }
  }, [authFetch, token, router]);

  useEffect(() => {
    if (!game || !GAMES[game]) {
      router.push('/dashboard');
      return;
    }

    // Start timer
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    // Poll queue count
    const fetchCount = async () => {
      const res = await fetch(`/api/queue/count/${game}`);
      if (res.ok) {
        const data = await res.json();
        setQueueCount(data.count);
      }
    };
    fetchCount();
    pollRef.current = setInterval(fetchCount, 10000);

    // Realtime subscription
    const supabase = createClient();
    if (user?.id) {
      const channel = supabase
        .channel(`queue_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'queue',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newStatus = (payload.new as { status: string }).status;
            if (newStatus === 'matched') {
              checkStatus();
            } else if (newStatus === 'cancelled') {
              router.push('/dashboard');
            }
          }
        )
        .subscribe();
      channelRef.current = channel;
    }

    // Fallback polling for match status every 5s
    const statusPoll = setInterval(checkStatus, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(statusPoll);
      if (channelRef.current) channelRef.current.unsubscribe();
    };
  }, [game, user, router, checkStatus]);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await authFetch('/api/queue/leave', { method: 'POST' });
      toast.success('Left the queue');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to leave queue');
      setLeaving(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!game) return null;

  const gameConfig = GAMES[game];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-white">
      {/* Pulsing animation */}
      <div className="relative mb-10">
        <div className="w-28 h-28 rounded-full bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center animate-pulse">
          <div className="w-20 h-20 rounded-full bg-emerald-800/50 border border-emerald-600/50 flex items-center justify-center">
            <Loader2 size={36} className="text-emerald-400 animate-spin" />
          </div>
        </div>
        {/* Ripple rings */}
        <div className="absolute inset-0 rounded-full border border-emerald-600/20 animate-ping" />
      </div>

      <h1 className="text-2xl font-black mb-2">Searching...</h1>
      <p className="text-gray-400 mb-1">{gameConfig.label}</p>
      <p className="text-emerald-400 font-mono text-lg font-bold mb-8">
        {formatTime(elapsed)}
      </p>

      {/* Players in queue */}
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 mb-8">
        <Users size={16} className="text-gray-400" />
        <span className="text-sm text-gray-400">
          <span className="text-white font-bold">{queueCount}</span> player{queueCount !== 1 ? 's' : ''} in queue
        </span>
      </div>

      <p className="text-gray-500 text-sm text-center max-w-xs mb-8">
        We&apos;ll match you with an opponent of similar rating.
        You&apos;ll get a WhatsApp notification when a match is found.
      </p>

      <button
        onClick={handleLeave}
        disabled={leaving}
        className="flex items-center gap-2 border border-red-500/50 text-red-400 hover:bg-red-900/20 px-6 py-3 rounded-xl font-semibold transition-colors"
      >
        <X size={18} />
        {leaving ? 'Leaving...' : 'Cancel Search'}
      </button>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 size={32} className="text-emerald-400 animate-spin" />
      </div>
    }>
      <QueueContent />
    </Suspense>
  );
}
