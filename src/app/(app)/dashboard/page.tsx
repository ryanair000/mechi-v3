'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertCircle, ChevronRight, Radar, Swords } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCard } from '@/components/GameCard';
import { PaywallModal } from '@/components/PaywallModal';
import { RatingBadge } from '@/components/RatingBadge';
import { TierMedal } from '@/components/TierMedal';
import { GAMES, getConfiguredPlatformForGame } from '@/lib/config';
import { getLevelFromXp, getRankDivision, getXpProgress } from '@/lib/gamification';
import { getPlan } from '@/lib/plans';
import type { GameKey, Match, PlatformKey } from '@/types';

interface UserProfile {
  id: string;
  username: string;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean;
  platforms: PlatformKey[];
  game_ids?: Record<string, string>;
  selected_games: GameKey[];
  region: string;
  [key: string]: unknown;
}

const WHATSAPP_JOIN_URL = process.env.NEXT_PUBLIC_WHATSAPP_JOIN_URL ?? '';
const WHATSAPP_PROMPT_SESSION_KEY = 'mechi_whatsapp_join_prompt';

interface QueueStatusResponse {
  inQueue?: boolean;
  queueEntry?: {
    game?: GameKey | null;
    platform?: PlatformKey | null;
  } | null;
  activeMatch?: {
    id: string;
  } | null;
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
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'match_limit' | 'game_limit' | 'feature'>('match_limit');
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);

  const resumeQueue = useCallback((queueEntry: QueueStatusResponse['queueEntry']) => {
    const queueGame = queueEntry?.game;
    if (!queueGame || !GAMES[queueGame]) {
      return false;
    }

    const params = new URLSearchParams({ game: queueGame });
    if (queueEntry?.platform) {
      params.set('platform', queueEntry.platform);
    }

    router.replace(`/queue?${params.toString()}`);
    return true;
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [profileRes, activeMatchRes, queueStatusRes] = await Promise.all([
          authFetch('/api/users/profile'),
          authFetch('/api/matches/current'),
          authFetch('/api/queue/status'),
        ]);

        if (cancelled) return;

        const [profileData, matchData, queueData] = await Promise.all([
          profileRes.ok ? profileRes.json() : Promise.resolve(null),
          activeMatchRes.ok ? activeMatchRes.json() : Promise.resolve(null),
          queueStatusRes.ok ? queueStatusRes.json() as Promise<QueueStatusResponse> : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (matchData?.match?.id) {
          router.replace(`/match/${matchData.match.id}`);
          return;
        }

        if (queueData?.inQueue && resumeQueue(queueData.queueEntry)) {
          return;
        }

        if (profileRes.ok) {
          setProfile(profileData.profile);
        }

        if (activeMatchRes.ok) {
          setActiveMatch(matchData.match);
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
  }, [authFetch, resumeQueue, router]);

  useEffect(() => {
    const selectedGames = (profile?.selected_games ?? []).filter(
      (game) => GAMES[game]?.mode === '1v1'
    );
    const profileGameIds = (profile?.game_ids as Record<string, string>) ?? {};
    const profilePlatforms = profile?.platforms ?? [];

    if (!selectedGames.length) {
      setQueueCounts({});
      return;
    }

    let cancelled = false;

    async function loadQueueCounts() {
      const results = await Promise.allSettled(
        selectedGames.map(async (game) => {
          const platform = getConfiguredPlatformForGame(game, profileGameIds, profilePlatforms);
          const platformQuery = platform ? `?platform=${encodeURIComponent(platform)}` : '';
          const res = await fetch(`/api/queue/count/${game}${platformQuery}`);
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
  }, [profile]);

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    const whatsappNotifications =
      profile?.whatsapp_notifications ?? user.whatsapp_notifications ?? false;
    const whatsappNumber = profile?.whatsapp_number ?? user.whatsapp_number ?? null;
    const hasWhatsAppSetup = Boolean(whatsappNotifications && whatsappNumber);

    if (hasWhatsAppSetup) {
      setShowWhatsAppPrompt(false);
      return;
    }

    const sessionKey = `${WHATSAPP_PROMPT_SESSION_KEY}:${user.id}`;
    const alreadyShown = sessionStorage.getItem(sessionKey) === '1';

    setShowWhatsAppPrompt(true);

    if (!alreadyShown) {
      toast('Want WhatsApp alerts? Text us "Join Mechi" on WhatsApp, then keep alerts on in your profile.');
      sessionStorage.setItem(sessionKey, '1');
    }
  }, [
    loading,
    profile?.whatsapp_notifications,
    profile?.whatsapp_number,
    user,
  ]);

  const handleJoinQueue = async (game: GameKey) => {
    if (activeMatch) {
      toast.error('You have an active match');
      router.push(`/match/${activeMatch.id}`);
      return;
    }

    const profileGameIds = (profile?.game_ids as Record<string, string>) ?? {};
    const platform = getConfiguredPlatformForGame(game, profileGameIds, profile?.platforms ?? []);
    if (!platform) {
      toast.error('Choose a platform for this game in your profile');
      router.push('/profile');
      return;
    }

    setQueuingGame(game);
    try {
      const res = await authFetch('/api/queue/join', {
        method: 'POST',
        body: JSON.stringify({ game, platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.limit_reached) {
          setPaywallReason('match_limit');
          setShowPaywall(true);
          setQueuingGame(null);
          return;
        }
        if (data.matchId) {
          router.push(`/match/${data.matchId}`);
        } else if (data.queueEntry?.game) {
          if (!resumeQueue(data.queueEntry)) {
            toast.error('You already have a live queue session');
            setQueuingGame(null);
          }
        } else {
          toast.error(data.error ?? 'Failed to join queue');
          setQueuingGame(null);
        }
        return;
      }
      router.push(`/queue?game=${game}&platform=${platform}`);
    } catch {
      toast.error('Network error');
      setQueuingGame(null);
    }
  };

  const userGames = profile?.selected_games ?? [];
  const rankedGames = userGames.filter((game) => GAMES[game]?.mode === '1v1');
  const lobbyGames = userGames.filter((game) => GAMES[game]?.mode === 'lobby');

  const bestRating = rankedGames.reduce((best, game) => {
    const rating = (profile?.[`rating_${game}`] as number) ?? 1000;
    return rating > best ? rating : best;
  }, 1000);
  const queueTotal = rankedGames.reduce((total, game) => total + (queueCounts[game] ?? 0), 0);
  const bestDivision = getRankDivision(bestRating);
  const xp = (profile?.xp as number) ?? 0;
  const level = (profile?.level as number) ?? getLevelFromXp(xp);
  const mp = (profile?.mp as number) ?? 0;
  const streak = (profile?.win_streak as number) ?? 0;
  const xpProgress = getXpProgress(xp, level);
  const currentPlan = getPlan((profile?.plan as string | undefined) ?? user?.plan ?? 'free');

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
      {showPaywall ? (
        <PaywallModal reason={paywallReason} onClose={() => setShowPaywall(false)} />
      ) : null}

      {showWhatsAppPrompt ? (
        <div className="card surface-live mb-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Turn on WhatsApp notifications
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                Text us on WhatsApp with <span className="font-semibold text-[var(--text-primary)]">Join Mechi</span> to receive match notifications on your number.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {WHATSAPP_JOIN_URL ? (
                <a
                  href={WHATSAPP_JOIN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  Open WhatsApp
                </a>
              ) : null}
              <Link href="/profile" className="btn-ghost">
                Open profile
              </Link>
              <button
                type="button"
                onClick={() => setShowWhatsAppPrompt(false)}
                className="btn-ghost"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card circuit-panel mb-5 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-[1.55rem] font-black tracking-normal text-[var(--text-primary)] sm:text-[1.95rem]">
              Command your climb, {user?.username ?? 'Player'}.
            </h1>
            <div className="mt-4 max-w-md rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-2.5">
              <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                <span>XP progress</span>
                <span>{xpProgress.progressInLevel}/{xpProgress.progressNeeded}</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-strong)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${xpProgress.progressPercent}%`,
                    background: 'linear-gradient(90deg, var(--brand-teal), var(--brand-coral))',
                  }}
                />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="brand-chip px-2 py-0.5">Lv. {level}</span>
                <span className="brand-chip-coral px-2 py-0.5">{mp} MP</span>
                <span>{xpProgress.nextLevelXp - xp} XP until next level</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[16rem] lg:max-w-[17rem]">
            <div className="card p-2.5">
              <p className="stat-label">Queue Heat</p>
              <p className="mt-1.5 text-[1.45rem] font-black text-[var(--brand-teal)]">{queueTotal}</p>
              <p className="mt-1 text-[10px] leading-4 text-[var(--text-soft)]">Players visible in your queues</p>
            </div>
            <div className="card p-2.5">
              <p className="stat-label">Win Streak</p>
              <p className="mt-1.5 text-[1.45rem] font-black text-[var(--brand-coral)]">{streak}</p>
              <p className="mt-1 text-[10px] leading-4 text-[var(--text-soft)]">Matches in a row right now</p>
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
              Head to your profile, lock in your focus title{currentPlan.maxGames > 1 ? 's' : ''}, and Mechi will
              tailor your ladder from there.
            </p>
            <Link href="/profile" className="brand-link-coral mt-2 inline-block text-xs font-semibold">
              Update profile
            </Link>
          </div>
        </div>
      )}

      {rankedGames.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Ranked Games</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Queue ranked play, track your record, and keep moving upward.
              </p>
            </div>
            <Link href="/leaderboard" className="brand-link text-xs font-semibold">
              View leaderboard
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {rankedGames.map((game) => (
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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

      {rankedGames.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Rank Overview</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Quick read on how each title is moving.
              </p>
            </div>
            <div className="brand-chip-coral gap-2">
              <TierMedal rating={bestRating} size="sm" />
              <span>{bestDivision.label} profile</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rankedGames.map((game) => {
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
                  <div className="flex items-center gap-2">
                    <TierMedal rating={rating} size="sm" showName />
                    <RatingBadge rating={rating} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
