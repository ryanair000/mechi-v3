'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';
import toast from 'react-hot-toast';
import { X, Users, Wifi } from 'lucide-react';

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
    try {
      const res = await authFetch('/api/queue/status');
      if (!res.ok) return;
      const data = await res.json();
      if (data.activeMatch) {
        router.push(`/match/${data.activeMatch.id}`);
      } else if (!data.inQueue) {
        router.push('/dashboard');
      }
    } catch { /* ignore */ }
  }, [authFetch, token, router]);

  useEffect(() => {
    if (!game || !GAMES[game]) { router.push('/dashboard'); return; }

    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/queue/count/${game}`);
        if (res.ok) { const d = await res.json(); setQueueCount(d.count); }
      } catch { /* ignore */ }
    };
    fetchCount();
    pollRef.current = setInterval(fetchCount, 8000);

    // Supabase Realtime — instant notification
    const supabase = createClient();
    if (user?.id) {
      const channel = supabase
        .channel(`queue_user_${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'queue' },
          (payload) => {
            const row = payload.new as { user_id: string; status: string };
            if (row.user_id !== user.id) return;
            if (row.status === 'matched') checkStatus();
            else if (row.status === 'cancelled') router.push('/dashboard');
          }
        )
        .subscribe();
      channelRef.current = channel;
    }

    // Fallback polling every 4s
    const statusPoll = setInterval(checkStatus, 4000);

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

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  if (!game) return null;
  const gameConfig = GAMES[game];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-5 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      {/* Pulse rings */}
      <div className="relative mb-12">
        <div className="absolute inset-0 rounded-full border border-emerald-500/10 animate-ping scale-150" />
        <div className="absolute inset-0 rounded-full border border-emerald-500/8 animate-ping scale-125" style={{ animationDelay: '0.5s' }} />
        <div className="w-28 h-28 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <div className="text-3xl">🎮</div>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-black text-white mb-1">Searching...</h1>
      <p className="text-white/40 text-sm mb-2">{gameConfig.label}</p>
      <p className="text-emerald-400 font-mono text-2xl font-black mb-8 tabular-nums">{fmt(elapsed)}</p>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5">
          <Users size={14} className="text-white/40" />
          <span className="text-sm text-white/60">
            <span className="text-white font-bold">{queueCount}</span> in queue
          </span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
          <Wifi size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-semibold">Live</span>
        </div>
      </div>

      <p className="text-white/25 text-xs text-center max-w-xs mb-10 leading-relaxed">
        We&apos;re looking for an opponent at your skill level. You&apos;ll be notified on WhatsApp when a match is found.
      </p>

      <button onClick={handleLeave} disabled={leaving}
        className="flex items-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 px-6 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95">
        <X size={16} />
        {leaving ? 'Leaving...' : 'Cancel Search'}
      </button>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    }>
      <QueueContent />
    </Suspense>
  );
}
