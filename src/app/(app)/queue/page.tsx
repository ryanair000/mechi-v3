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
      if (data.activeMatch) router.push(`/match/${data.activeMatch.id}`);
      else if (!data.inQueue) router.push('/dashboard');
    } catch { /* ignore */ }
  }, [authFetch, token, router]);

  useEffect(() => {
    if (!game || !GAMES[game]) { router.push('/dashboard'); return; }

    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    const fetchCount = async () => {
      try { const res = await fetch(`/api/queue/count/${game}`); if (res.ok) { const d = await res.json(); setQueueCount(d.count); } } catch {}
    };
    fetchCount();
    pollRef.current = setInterval(fetchCount, 8000);

    const supabase = createClient();
    if (user?.id) {
      const channel = supabase.channel(`queue_user_${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'queue' },
          (payload) => {
            const row = payload.new as { user_id: string; status: string };
            if (row.user_id !== user.id) return;
            if (row.status === 'matched') checkStatus();
            else if (row.status === 'cancelled') router.push('/dashboard');
          }
        ).subscribe();
      channelRef.current = channel;
    }

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
    try { await authFetch('/api/queue/leave', { method: 'POST' }); toast.success('Left the queue'); router.push('/dashboard'); }
    catch { toast.error('Failed to leave queue'); setLeaving(false); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  if (!game) return null;
  const gameConfig = GAMES[game];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-5 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[100px]" />
      </div>

      {/* Pulse rings */}
      <div className="relative mb-10">
        <div className="absolute inset-0 rounded-full border border-emerald-500/8 animate-ping scale-150" />
        <div className="absolute inset-0 rounded-full border border-emerald-500/5 animate-ping scale-125" style={{ animationDelay: '0.5s' }} />
        <div className="w-24 h-24 rounded-full bg-emerald-500/8 border border-emerald-500/15 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <div className="text-2xl">🎮</div>
          </div>
        </div>
      </div>

      <h1 className="text-xl font-bold text-white mb-1">Searching...</h1>
      <p className="text-white/30 text-sm mb-2">{gameConfig.label}</p>
      <p className="text-emerald-400 font-mono text-xl font-bold mb-6 tabular-nums">{fmt(elapsed)}</p>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
          <Users size={13} className="text-white/30" />
          <span className="text-sm text-white/50"><span className="text-white font-semibold">{queueCount}</span> in queue</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/15 rounded-lg px-3 py-2">
          <Wifi size={13} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Live</span>
        </div>
      </div>

      <p className="text-white/15 text-xs text-center max-w-sm mb-8 leading-relaxed">
        Looking for an opponent at your skill level. You&apos;ll be notified when a match is found.
      </p>

      <button onClick={handleLeave} disabled={leaving}
        className="flex items-center gap-2 border border-red-500/20 text-red-400 hover:bg-red-500/8 px-5 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-[0.98]">
        <X size={14} />
        {leaving ? 'Leaving...' : 'Cancel Search'}
      </button>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    }>
      <QueueContent />
    </Suspense>
  );
}
