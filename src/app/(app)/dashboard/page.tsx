'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCard } from '@/components/GameCard';
import { RatingBadge } from '@/components/RatingBadge';
import { GAMES, PLATFORMS, getTier } from '@/lib/config';
import type { GameKey, Match, PlatformKey } from '@/types';
import toast from 'react-hot-toast';
import { Swords, AlertCircle, ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';
import { ShareMenu } from '@/components/ShareMenu';
import { inviteShareText, getInviteUrl } from '@/lib/share';

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
        if (data.matchId) router.push(`/match/${data.matchId}`);
        else { toast.error(data.error ?? 'Failed to join queue'); setQueuingGame(null); }
        return;
      }
      router.push(`/queue?game=${game}`);
    } catch { toast.error('Network error'); setQueuingGame(null); }
  };

  const userGames = profile?.selected_games ?? [];
  const lobbyGames = (Object.keys(GAMES) as GameKey[]).filter(
    (g) => GAMES[g].mode === 'lobby' && GAMES[g].platforms.some((p) => profile?.platforms?.includes(p))
  );

  const bestRating = userGames.reduce((best, g) => {
    const r = (profile?.[`rating_${g}`] as number) ?? 1000;
    return r > best ? r : best;
  }, 1000);
  const tier = getTier(bestRating);

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pt-2">
        <div>
          <p className="text-white/25 text-xs font-medium mb-1">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.username ?? 'Player'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: tier.color + '15', color: tier.color }}>
            {tier.name} · {bestRating} ELO
          </div>
          <div className="flex gap-1.5">
            {(profile?.platforms ?? []).slice(0, 5).map((p) => (
              <span key={p} title={PLATFORMS[p]?.label} className="text-base">{PLATFORMS[p]?.icon}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Active match banner */}
      {activeMatch && (
        <Link href={`/match/${activeMatch.id}`} className="block mb-6">
          <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-2xl p-4 flex items-center gap-4 hover:bg-emerald-500/12 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Swords size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">Active Match</p>
              <p className="text-xs text-white/40 truncate">{GAMES[activeMatch.game]?.label} · Click to view</p>
            </div>
            <ChevronRight size={16} className="text-white/20 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* No games warning */}
      {userGames.length === 0 && (
        <div className="mb-6 bg-yellow-500/6 border border-yellow-500/15 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-300 text-sm">No games selected</p>
            <p className="text-xs text-white/30 mt-0.5">Head to your profile to choose up to 3 games.</p>
            <Link href="/profile" className="text-xs font-semibold text-yellow-400 mt-2 inline-block hover:text-yellow-300">
              Update Profile →
            </Link>
          </div>
        </div>
      )}

      {/* 1v1 games */}
      {userGames.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Your Games</p>
            <Link href="/leaderboard" className="text-xs text-emerald-400 font-medium hover:text-emerald-300">View Ranks →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {userGames.map((gameKey) => (
              <GameCard key={gameKey} gameKey={gameKey}
                rating={(profile?.[`rating_${gameKey}`] as number) ?? 1000}
                wins={(profile?.[`wins_${gameKey}`] as number) ?? 0}
                losses={(profile?.[`losses_${gameKey}`] as number) ?? 0}
                queueCount={queueCounts[gameKey]}
                onJoinQueue={() => handleJoinQueue(gameKey)}
                isQueuing={queuingGame === gameKey}
                isDisabled={!!activeMatch || (queuingGame !== null && queuingGame !== gameKey)} />
            ))}
          </div>
        </section>
      )}

      {/* Lobby games */}
      {lobbyGames.length > 0 && (
        <section className="mb-8">
          <p className="section-title mb-4">Lobby Games</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lobbyGames.map((gameKey) => (
              <GameCard key={gameKey} gameKey={gameKey} onViewLobby={() => router.push(`/lobbies?game=${gameKey}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Rating overview */}
      {userGames.length > 0 && (
        <section>
          <p className="section-title mb-4">Rating Overview</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {userGames.map((gameKey) => {
              const rating = (profile?.[`rating_${gameKey}`] as number) ?? 1000;
              const wins = (profile?.[`wins_${gameKey}`] as number) ?? 0;
              const losses = (profile?.[`losses_${gameKey}`] as number) ?? 0;
              return (
                <div key={gameKey} className="card px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{GAMES[gameKey].label}</p>
                    <p className="text-xs text-white/25 mt-0.5">{wins}W · {losses}L</p>
                  </div>
                  <RatingBadge rating={rating} size="sm" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Invite friends */}
      {user?.username && (
        <section className="mt-8">
          <div className="bg-emerald-500/[0.06] border border-emerald-500/15 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">Invite Friends</p>
              <p className="text-xs text-white/30 mt-0.5">Bring your squad to Mechi — earn your rank together</p>
            </div>
            <ShareMenu
              text={inviteShareText(user.username)}
              url={getInviteUrl()}
              title="Join Mechi"
              variant="ghost"
            />
          </div>
        </section>
      )}
    </div>
  );
}
