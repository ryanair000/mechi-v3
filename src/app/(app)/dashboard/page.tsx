'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCard } from '@/components/GameCard';
import { RatingBadge } from '@/components/RatingBadge';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { GameKey, Match, PlatformKey } from '@/types';
import toast from 'react-hot-toast';
import { Swords, AlertCircle } from 'lucide-react';
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
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfile = useCallback(async () => {
    const res = await authFetch('/api/users/profile');
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
    }
    setLoadingProfile(false);
  }, [authFetch]);

  const fetchActiveMatch = useCallback(async () => {
    const res = await authFetch('/api/matches/current');
    if (res.ok) {
      const data = await res.json();
      setActiveMatch(data.match);
    }
  }, [authFetch]);

  const fetchQueueCounts = useCallback(async (games: GameKey[]) => {
    const results = await Promise.allSettled(
      games.map(async (game) => {
        const res = await fetch(`/api/queue/count/${game}`);
        if (res.ok) {
          const data = await res.json();
          return { game, count: data.count };
        }
        return { game, count: 0 };
      })
    );

    const counts: Record<string, number> = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        counts[r.value.game] = r.value.count;
      }
    });
    setQueueCounts(counts);
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchActiveMatch();
  }, [fetchProfile, fetchActiveMatch]);

  useEffect(() => {
    if (profile?.selected_games) {
      fetchQueueCounts(profile.selected_games);
    }
  }, [profile, fetchQueueCounts]);

  const handleJoinQueue = async (game: GameKey) => {
    if (activeMatch) {
      toast.error('You have an active match');
      router.push(`/match/${activeMatch.id}`);
      return;
    }

    setQueuingGame(game);
    try {
      const res = await authFetch('/api/queue/join', {
        method: 'POST',
        body: JSON.stringify({ game }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.matchId) {
          router.push(`/match/${data.matchId}`);
        } else {
          toast.error(data.error ?? 'Failed to join queue');
          setQueuingGame(null);
        }
        return;
      }

      toast.success(`Searching for ${GAMES[game].label} opponent...`);
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

  if (loadingProfile) {
    return (
      <div className="page-container">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Hey, {user?.username} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.region}</p>
        </div>
        <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
          {(profile?.platforms ?? []).map((p) => (
            <span key={p} title={PLATFORMS[p]?.label} className="text-lg">
              {PLATFORMS[p]?.icon}
            </span>
          ))}
        </div>
      </div>

      {/* Active match banner */}
      {activeMatch && (
        <Link href={`/match/${activeMatch.id}`}>
          <div className="mb-5 bg-emerald-600 text-white rounded-2xl p-4 flex items-center gap-3">
            <Swords size={24} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Active Match</p>
              <p className="text-xs text-emerald-100 truncate">
                {GAMES[activeMatch.game]?.label} · Tap to view
              </p>
            </div>
            <span className="text-emerald-200 text-xl">→</span>
          </div>
        </Link>
      )}

      {/* No games selected warning */}
      {userGames.length === 0 && (
        <div className="mb-5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm">No games selected</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
              Go to your profile to select games to play.
            </p>
            <Link href="/profile" className="text-xs font-bold text-yellow-700 dark:text-yellow-300 underline mt-1 inline-block">
              Update Profile →
            </Link>
          </div>
        </div>
      )}

      {/* 1v1 Games */}
      {userGames.length > 0 && (
        <section className="mb-6">
          <h2 className="section-title mb-3">Your 1v1 Games</h2>
          <div className="grid grid-cols-2 gap-3">
            {userGames.map((gameKey) => {
              const ratingKey = `rating_${gameKey}`;
              const winsKey = `wins_${gameKey}`;
              const lossesKey = `losses_${gameKey}`;
              return (
                <GameCard
                  key={gameKey}
                  gameKey={gameKey}
                  rating={(profile?.[ratingKey] as number) ?? 1000}
                  wins={(profile?.[winsKey] as number) ?? 0}
                  losses={(profile?.[lossesKey] as number) ?? 0}
                  queueCount={queueCounts[gameKey]}
                  onJoinQueue={() => handleJoinQueue(gameKey)}
                  isQueuing={queuingGame === gameKey}
                  isDisabled={!!activeMatch || (queuingGame !== null && queuingGame !== gameKey)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Lobby Games */}
      {lobbyGames.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Lobby Games</h2>
          <div className="grid grid-cols-2 gap-3">
            {lobbyGames.map((gameKey) => (
              <GameCard
                key={gameKey}
                gameKey={gameKey}
                onViewLobby={() => router.push(`/lobbies?game=${gameKey}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick rating overview */}
      {userGames.length > 0 && (
        <section className="mt-6">
          <h2 className="section-title mb-3">Your Ratings</h2>
          <div className="space-y-2">
            {userGames.map((gameKey) => {
              const ratingKey = `rating_${gameKey}`;
              const rating = (profile?.[ratingKey] as number) ?? 1000;
              return (
                <div key={gameKey} className="card px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {GAMES[gameKey].label}
                  </span>
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
