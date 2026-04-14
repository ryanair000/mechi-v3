'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCard } from '@/components/GameCard';
import { RatingBadge } from '@/components/RatingBadge';
import { GAMES, PLATFORMS, getTier } from '@/lib/config';
import type { GameKey, Match, PlatformKey } from '@/types';
import toast from 'react-hot-toast';
import { Swords, AlertCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  username: string;
  platforms: PlatformKey[];
  selected_games: GameKey[];
  region: string;
  [key: string]: unknown;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});
  const [queuingGame, setQueuingGame] = useState<GameKey | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const res = await authFetch('/api/users/profile');
    if (res.ok) { const d = await res.json(); setProfile(d.profile); }
    setLoading(false);
  }, [authFetch]);

  const fetchActiveMatch = useCallback(async () => {
    const res = await authFetch('/api/matches/current');
    if (res.ok) { const d = await res.json(); setActiveMatch(d.match); }
  }, [authFetch]);

  const fetchQueueCounts = useCallback(async (games: GameKey[]) => {
    const results = await Promise.allSettled(
      games.map(async (game) => {
        const res = await fetch(`/api/queue/count/${game}`);
        if (res.ok) { const d = await res.json(); return { game, count: d.count }; }
        return { game, count: 0 };
      })
    );
    const counts: Record<string, number> = {};
    results.forEach((r) => { if (r.status === 'fulfilled') counts[r.value.game] = r.value.count; });
    setQueueCounts(counts);
  }, []);

  useEffect(() => { fetchProfile(); fetchActiveMatch(); }, [fetchProfile, fetchActiveMatch]);
  useEffect(() => { if (profile?.selected_games) fetchQueueCounts(profile.selected_games); }, [profile, fetchQueueCounts]);

  const handleJoinQueue = async (game: GameKey) => {
    if (activeMatch) { toast.error('You have an active match'); router.push(`/match/${activeMatch.id}`); return; }
    setQueuingGame(game);
    try {
      const res = await authFetch('/api/queue/join', { method: 'POST', body: JSON.stringify({ game }) });
      const data = await res.json();
      if (!res.ok) {
        if (data.matchId) { router.push(`/match/${data.matchId}`); }
        else { toast.error(data.error ?? 'Failed to join queue'); setQueuingGame(null); }
        return;
      }
      router.push(`/queue?game=${game}`);
    } catch {
      toast.error('Network error');
      setQueuingGame(null);
    }
  };

  const userGames = profile?.selected_games ?? [];
  const lobbyGames = (Object.keys(GAMES) as GameKey[]).filter(
    (g) => GAMES[g].mode === 'lobby' && GAMES[g].platforms.some((p) => profile?.platforms?.includes(p))
  );

  // Best rating across selected games
  const bestRating = userGames.reduce((best, g) => {
    const r = (profile?.[`rating_${g}`] as number) ?? 1000;
    return r > best ? r : best;
  }, 1000);
  const tier = getTier(bestRating);

  if (loading) {
    return (
      <div className="page-container space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-48 shimmer" />)}
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Hero header */}
      <div className="mb-6 pt-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/40 text-xs font-semibold mb-1">
              {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <h1 className="text-2xl font-black text-white leading-tight">
              Hey, {user?.username ?? 'Player'} 👋
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`px-3 py-1 rounded-full text-xs font-bold`} style={{ background: tier.color + '25', color: tier.color }}>
              {tier.name}
            </div>
            <div className="flex gap-1">
              {(profile?.platforms ?? []).slice(0, 3).map((p) => (
                <span key={p} title={PLATFORMS[p]?.label} className="text-base">{PLATFORMS[p]?.icon}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active match banner */}
      {activeMatch && (
        <Link href={`/match/${activeMatch.id}`} className="block mb-5">
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Swords size={20} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">Active Match</p>
              <p className="text-xs text-white/50 truncate">{GAMES[activeMatch.game]?.label} · Tap to view</p>
            </div>
            <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* No games warning */}
      {userGames.length === 0 && (
        <div className="mb-5 bg-yellow-500/8 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-yellow-300 text-sm">No games selected</p>
            <p className="text-xs text-white/40 mt-0.5">Head to your profile to choose up to 3 games.</p>
            <Link href="/profile" className="text-xs font-bold text-yellow-400 mt-2 inline-block">
              Update Profile →
            </Link>
          </div>
        </div>
      )}

      {/* 1v1 games */}
      {userGames.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">Your Games</p>
            <Link href="/leaderboard" className="text-xs text-emerald-400 font-semibold">View Ranks →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {userGames.map((gameKey) => (
              <GameCard
                key={gameKey}
                gameKey={gameKey}
                rating={(profile?.[`rating_${gameKey}`] as number) ?? 1000}
                wins={(profile?.[`wins_${gameKey}`] as number) ?? 0}
                losses={(profile?.[`losses_${gameKey}`] as number) ?? 0}
                queueCount={queueCounts[gameKey]}
                onJoinQueue={() => handleJoinQueue(gameKey)}
                isQueuing={queuingGame === gameKey}
                isDisabled={!!activeMatch || (queuingGame !== null && queuingGame !== gameKey)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Lobby games */}
      {lobbyGames.length > 0 && (
        <section className="mb-6">
          <p className="section-title mb-3">Lobby Games</p>
          <div className="grid grid-cols-2 gap-3">
            {lobbyGames.map((gameKey) => (
              <GameCard key={gameKey} gameKey={gameKey} onViewLobby={() => router.push(`/lobbies?game=${gameKey}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Rating overview */}
      {userGames.length > 0 && (
        <section>
          <p className="section-title mb-3">Your Ratings</p>
          <div className="space-y-2">
            {userGames.map((gameKey) => {
              const rating = (profile?.[`rating_${gameKey}`] as number) ?? 1000;
              const wins = (profile?.[`wins_${gameKey}`] as number) ?? 0;
              const losses = (profile?.[`losses_${gameKey}`] as number) ?? 0;
              return (
                <div key={gameKey} className="card px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{GAMES[gameKey].label}</p>
                    <p className="text-xs text-white/30 mt-0.5">{wins}W · {losses}L</p>
                  </div>
                  <RatingBadge rating={rating} size="sm" />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
