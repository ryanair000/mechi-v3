'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertCircle, ChevronRight, Radar, Swords, Trophy } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCard } from '@/components/GameCard';
import { RatingBadge } from '@/components/RatingBadge';
import { GAMES, PLATFORMS } from '@/lib/config';
import { getLevelFromXp, getRankDivision, getXpProgress, withAlpha } from '@/lib/gamification';
import type { GameKey, Match, PlatformKey } from '@/types';

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

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [profileRes, activeMatchRes] = await Promise.all([
          authFetch('/api/users/profile'),
          authFetch('/api/matches/current'),
        ]);

        if (cancelled) return;

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (!cancelled) {
            setProfile(profileData.profile);
          }
        }

        if (activeMatchRes.ok) {
          const matchData = await activeMatchRes.json();
          if (!cancelled) {
            setActiveMatch(matchData.match);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    const selectedGames = profile?.selected_games ?? [];

    if (!selectedGames.length) {
      setQueueCounts({});
      return;
    }

    let cancelled = false;

    async function loadQueueCounts() {
      const results = await Promise.allSettled(
        selectedGames.map(async (game) => {
          const res = await fetch(`/api/queue/count/${game}`);
          if (res.ok) {
            const data = await res.json();
            return { game, count: data.count as number };
          }

          return { game, count: 0 };
        })
      );

      if (cancelled) return;

      const counts: Record<string, number> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          counts[result.value.game] = result.value.count;
        }
      });
      setQueueCounts(counts);
    }

    void loadQueueCounts();

    return () => {
      cancelled = true;
    };
  }, [profile?.selected_games]);

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
      router.push(`/queue?game=${game}`);
    } catch {
      toast.error('Network error');
      setQueuingGame(null);
    }
  };

  const userGames = profile?.selected_games ?? [];
  const lobbyGames = (Object.keys(GAMES) as GameKey[]).filter(
    (game) =>
      GAMES[game].mode === 'lobby' &&
      GAMES[game].platforms.some((platform) => profile?.platforms?.includes(platform))
  );

  const bestRating = userGames.reduce((best, game) => {
    const rating = (profile?.[`rating_${game}`] as number) ?? 1000;
    return rating > best ? rating : best;
  }, 1000);
  const queueTotal = userGames.reduce((total, game) => total + (queueCounts[game] ?? 0), 0);
  const bestDivision = getRankDivision(bestRating);
  const xp = (profile?.xp as number) ?? 0;
  const level = (profile?.level as number) ?? getLevelFromXp(xp);
  const mp = (profile?.mp as number) ?? 0;
  const streak = (profile?.win_streak as number) ?? 0;
  const xpProgress = getXpProgress(xp, level);

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-48 shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card circuit-panel mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="brand-kicker px-2.5 py-0.5 text-[10px]">
              {new Date().toLocaleDateString('en-KE', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-[var(--text-primary)] sm:text-[2.5rem]">
              Command your climb, {user?.username ?? 'Player'}.
            </h1>
            <p className="mt-2 max-w-lg text-[13px] leading-6 text-[var(--text-secondary)] sm:text-sm">
              Queue faster, watch your rank move, and keep your competitive setup
              organized across every game you play on Mechi.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <div
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  color: bestDivision.color,
                  backgroundColor: withAlpha(bestDivision.color, '14'),
                  borderColor: withAlpha(bestDivision.color, '2f'),
                }}
              >
                {bestDivision.label} / Lv. {level}
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                {(profile?.platforms ?? []).slice(0, 5).map((platform) => (
                  <span key={platform} title={PLATFORMS[platform]?.label} className="text-sm">
                    {PLATFORMS[platform]?.icon}
                  </span>
                ))}
                <span>Connected platforms</span>
              </div>
            </div>
            <div className="mt-4 max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
              <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                <span>XP progress</span>
                <span>{xpProgress.progressInLevel}/{xpProgress.progressNeeded}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${xpProgress.progressPercent}%`,
                    background: 'linear-gradient(90deg, var(--brand-teal), var(--brand-coral))',
                  }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="brand-chip px-2 py-0.5">Lv. {level}</span>
                <span className="brand-chip-coral px-2 py-0.5">{mp} MP</span>
                <span>{xpProgress.nextLevelXp - xp} XP until next level</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:min-w-[20rem] lg:max-w-[22rem]">
            <div className="card p-3.5">
              <p className="stat-label">Focus Games</p>
              <p className="mt-2 text-[1.9rem] font-black text-[var(--text-primary)]">{userGames.length}</p>
              <p className="mt-1.5 text-[11px] leading-5 text-[var(--text-soft)]">Competitive titles selected</p>
            </div>
            <div className="card p-3.5">
              <p className="stat-label">Queue Heat</p>
              <p className="mt-2 text-[1.9rem] font-black text-[var(--brand-teal)]">{queueTotal}</p>
              <p className="mt-1.5 text-[11px] leading-5 text-[var(--text-soft)]">Players visible in your queues</p>
            </div>
            <div className="card p-3.5">
              <p className="stat-label">Win Streak</p>
              <p className="mt-2 text-[1.9rem] font-black text-[var(--brand-coral)]">{streak}</p>
              <p className="mt-1.5 text-[11px] leading-5 text-[var(--text-soft)]">Matches in a row right now</p>
            </div>
            <div className="card p-3.5">
              <p className="stat-label">Live Status</p>
              <p className="mt-2 text-[1.9rem] font-black text-[var(--brand-coral)]">
                {activeMatch ? 'Match On' : 'Ready'}
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-[var(--text-soft)]">
                {activeMatch ? 'Finish your match to queue again' : 'You can jump into ranked now'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {activeMatch && (
        <Link href={`/match/${activeMatch.id}`} className="mb-6 block">
          <div className="card surface-live flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(50,224,196,0.16)]">
              <Swords size={18} className="text-[var(--brand-teal)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Active Match</p>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {GAMES[activeMatch.game]?.label} / open the room and finish your report flow
              </p>
            </div>
            <ChevronRight size={16} className="flex-shrink-0 text-[var(--text-soft)]" />
          </div>
        </Link>
      )}

      {userGames.length === 0 && (
        <div className="card mb-6 flex items-start gap-3 p-4">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-[var(--brand-coral)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">No games selected yet</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Head to your profile, lock in up to three focus titles, and Mechi will
              tailor your ladder from there.
            </p>
            <Link href="/profile" className="brand-link-coral mt-2 inline-block text-xs font-semibold">
              Update profile
            </Link>
          </div>
        </div>
      )}

      {userGames.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Your Games</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Queue ranked play, track your record, and keep moving upward.
              </p>
            </div>
            <Link href="/leaderboard" className="brand-link text-xs font-semibold">
              View leaderboard
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {userGames.map((game) => (
              <GameCard
                key={game}
                gameKey={game}
                rating={(profile?.[`rating_${game}`] as number) ?? 1000}
                wins={(profile?.[`wins_${game}`] as number) ?? 0}
                losses={(profile?.[`losses_${game}`] as number) ?? 0}
                queueCount={queueCounts[game]}
                onJoinQueue={() => handleJoinQueue(game)}
                isQueuing={queuingGame === game}
                isDisabled={!!activeMatch || (queuingGame !== null && queuingGame !== game)}
              />
            ))}
          </div>
        </section>
      )}

      {lobbyGames.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Lobby Games</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Squad up when your game needs a room instead of a direct duel.
              </p>
            </div>
            <div className="brand-chip">
              <Radar size={12} />
              <span>{lobbyGames.length} active lobby titles</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {lobbyGames.map((game) => (
              <GameCard
                key={game}
                gameKey={game}
                onViewLobby={() => router.push(`/lobbies?game=${game}`)}
              />
            ))}
          </div>
        </section>
      )}

      {userGames.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Rank Overview</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Quick read on how each title is moving.
              </p>
            </div>
            <div className="brand-chip-coral">
              <Trophy size={12} />
              <span>{bestDivision.label} profile</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {userGames.map((game) => {
              const rating = (profile?.[`rating_${game}`] as number) ?? 1000;
              const wins = (profile?.[`wins_${game}`] as number) ?? 0;
              const losses = (profile?.[`losses_${game}`] as number) ?? 0;

              return (
                <div key={game} className="card flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {GAMES[game].label}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                      {wins}W / {losses}L
                    </p>
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
