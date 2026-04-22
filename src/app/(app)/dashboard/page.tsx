'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertCircle, ChevronRight, CirclePlay, Radar, Swords, Users } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { openAppOnboarding } from '@/components/AppOnboarding';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCard } from '@/components/GameCard';
import { PaywallModal } from '@/components/PaywallModal';
import {
  GAMES,
  getConfiguredPlatformForGame,
  getGameLossesKey,
  getGameRatingKey,
  getGameWinsKey,
  normalizeSelectedGameKeys,
  supportsLobbyMode,
} from '@/lib/config';
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

interface OnlineQueuePlayer {
  id: string;
  username: string;
  avatar_url?: string | null;
  level: number;
  region?: string | null;
  game: GameKey;
  platform?: PlatformKey | null;
  joined_at: string;
  wait_minutes: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});
  const [onlinePlayers, setOnlinePlayers] = useState<OnlineQueuePlayer[]>([]);
  const [queuingGame, setQueuingGame] = useState<GameKey | null>(null);
  const [queueFeedback, setQueueFeedback] = useState<ActionFeedbackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'match_limit' | 'game_limit' | 'feature'>('match_limit');

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
        const [profileRes, activeMatchRes, queueStatusRes, onlinePlayersRes] = await Promise.all([
          authFetch('/api/users/profile'),
          authFetch('/api/matches/current'),
          authFetch('/api/queue/status'),
          authFetch('/api/queue/players'),
        ]);

        if (cancelled) return;

        const [profileData, matchData, queueData, onlinePlayersData] = await Promise.all([
          profileRes.ok ? profileRes.json() : Promise.resolve(null),
          activeMatchRes.ok ? activeMatchRes.json() : Promise.resolve(null),
          queueStatusRes.ok ? queueStatusRes.json() as Promise<QueueStatusResponse> : Promise.resolve(null),
          onlinePlayersRes.ok
            ? onlinePlayersRes.json() as Promise<{ players?: OnlineQueuePlayer[] }>
            : Promise.resolve(null),
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

        if (onlinePlayersRes.ok) {
          setOnlinePlayers((onlinePlayersData?.players ?? []) as OnlineQueuePlayer[]);
        } else {
          setOnlinePlayers([]);
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
    const selectedGames = normalizeSelectedGameKeys(profile?.selected_games ?? []).filter(
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

  const handleJoinQueue = async (game: GameKey) => {
    const gameLabel = GAMES[game]?.label ?? game;

    if (activeMatch) {
      setQueueFeedback({
        tone: 'info',
        title: 'You already have a live match.',
        detail: 'Opening that match so you can finish it before joining another queue.',
      });
      toast.error('You have an active match');
      router.push(`/match/${activeMatch.id}`);
      return;
    }

    const profileGameIds = (profile?.game_ids as Record<string, string>) ?? {};
    const platform = getConfiguredPlatformForGame(game, profileGameIds, profile?.platforms ?? []);
    if (!platform) {
      setQueueFeedback({
        tone: 'error',
        title: `Set up your ${gameLabel} platform first.`,
        detail: 'Mechi needs the right platform to place you in the correct matchmaking pool.',
      });
      toast.error('Choose a platform for this game in your profile');
      router.push('/profile');
      return;
    }

    const joiningToast = toast.loading(`Checking the ${gameLabel} queue...`);
    setQueuingGame(game);
    setQueueFeedback({
      tone: 'loading',
      title: `Joining ${gameLabel} matchmaking...`,
      detail: `We're checking your ${platform.toUpperCase()} lane and making sure you do not already have a live match.`,
    });
    try {
      const res = await authFetch('/api/queue/join', {
        method: 'POST',
        body: JSON.stringify({ game, platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.limit_reached) {
          setQueueFeedback({
            tone: 'error',
            title: 'Daily ranked limit reached.',
            detail: 'Upgrade your plan to keep queueing matches today.',
          });
          toast.error('Daily ranked limit reached', { id: joiningToast });
          setPaywallReason('match_limit');
          setShowPaywall(true);
          setQueuingGame(null);
          return;
        }
        if (data.matchId) {
          setQueueFeedback({
            tone: 'info',
            title: 'Match already live.',
            detail: 'Opening your active match now.',
          });
          toast.success('Active match found. Opening it now.', { id: joiningToast });
          router.push(`/match/${data.matchId}`);
        } else if (data.queueEntry?.game) {
          setQueueFeedback({
            tone: 'info',
            title: 'Your queue session is already live.',
            detail: 'Reopening the active search so you can keep tracking it.',
          });
          if (!resumeQueue(data.queueEntry)) {
            setQueueFeedback({
              tone: 'error',
              title: 'We found your queue session, but could not reopen it cleanly.',
              detail: 'Try joining again in a moment.',
            });
            toast.error('You already have a live queue session', { id: joiningToast });
            setQueuingGame(null);
          } else {
            toast.success('Queue still active. Reopening it now.', { id: joiningToast });
          }
        } else {
          setQueueFeedback({
            tone: 'error',
            title: `Could not join the ${gameLabel} queue.`,
            detail: data.error ?? 'Please try again in a moment.',
          });
          toast.error(data.error ?? 'Failed to join queue', { id: joiningToast });
          setQueuingGame(null);
        }
        return;
      }
      setQueueFeedback({
        tone: 'success',
        title: `${gameLabel} queue joined.`,
        detail: "We'll keep searching and notify you the moment a match lands.",
      });
      toast.success('Queue joined. Searching for a match now.', { id: joiningToast });
      router.push(`/queue?game=${game}&platform=${platform}`);
    } catch {
      setQueueFeedback({
        tone: 'error',
        title: 'Queue request failed.',
        detail: 'Check your connection and try joining again.',
      });
      toast.error('Network error', { id: joiningToast });
      setQueuingGame(null);
    }
  };

  const userGames = normalizeSelectedGameKeys(profile?.selected_games ?? []);
  const rankedGames = userGames.filter((game) => GAMES[game]?.mode === '1v1');
  const lobbyGames = userGames.filter((game) => supportsLobbyMode(game));

  const bestRating = rankedGames.reduce((best, game) => {
    const rating = (profile?.[getGameRatingKey(game)] as number) ?? 1000;
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
  const queueHeat =
    queueTotal >= 8
      ? {
          label: 'Hot',
          tone: 'text-[var(--brand-teal)]',
          detail: 'Queue traffic is moving fast across your ranked lane.',
        }
      : queueTotal >= 4
        ? {
            label: 'Warm',
            tone: 'text-[var(--accent-secondary-text)]',
            detail: 'There is enough activity for a healthy match pulse.',
          }
        : queueTotal >= 1
          ? {
              label: 'Building',
              tone: 'text-[var(--brand-coral)]',
              detail: 'A few players are live, so the queue is warming up.',
            }
          : {
              label: 'Quiet',
              tone: 'text-[var(--text-primary)]',
              detail: 'No live players are sitting in your lane just yet.',
            };

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <div className="h-28 shimmer rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[5.5rem] shimmer rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const panelBase =
    'rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] shadow-[var(--shadow-soft)]';

  return (
    <div className="page-container space-y-4">
      {showPaywall ? (
        <PaywallModal reason={paywallReason} onClose={() => setShowPaywall(false)} />
      ) : null}

      {/* ── Welcome header ────────────────────────────── */}
      <div className={`${panelBase} relative overflow-hidden`}>
        <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-[var(--brand-teal)]" />
        <div className="flex flex-col gap-4 px-5 py-4 pl-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.1)] text-lg font-black text-[var(--brand-teal)]">
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-secondary-text)]">
                  Lv {level}
                </span>
                {rankedGames.length > 0 ? (
                  <span className="rounded border border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-coral)]">
                    {bestDivision.label}
                  </span>
                ) : null}
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                  {currentPlan.name}
                </span>
              </div>
              <h1 className="mt-1 text-xl font-black leading-tight text-[var(--text-primary)] sm:text-2xl">
                {user?.username ?? 'Player'}
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:min-w-[17rem] sm:items-end">
            <div className="w-full sm:max-w-[17rem]">
              <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
                <span>XP · Lv {level}</span>
                <span>{xpProgress.nextLevelXp - xp} to next</span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-sm bg-[var(--border-color)]">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${xpProgress.progressPercent}%`,
                    background: 'linear-gradient(90deg, var(--brand-teal), var(--brand-coral))',
                  }}
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-soft)]">
                {xp} XP · {mp} MP
              </p>
            </div>
            <div className="flex items-center gap-2">
              {userGames.length === 0 ? (
                <Link href="/games" className="btn-primary text-sm">
                  Set Up Games
                </Link>
              ) : null}
              <button type="button" onClick={openAppOnboarding} className="btn-outline text-sm">
                <CirclePlay size={13} />
                Intro
              </button>
              <Link href="/tutorials" className="btn-outline text-sm">
                Tutorials
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Queue Heat */}
        <div className={`${panelBase} overflow-hidden`}>
          <div className="h-[3px] bg-[var(--brand-teal)]" />
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
              Queue Heat
            </p>
            <p className={`mt-1.5 text-xl font-black sm:text-2xl ${queueHeat.tone}`}>
              {queueHeat.label}
            </p>
            <p className="mt-1 hidden text-xs leading-5 text-[var(--text-soft)] sm:block">
              {queueHeat.detail}
            </p>
          </div>
        </div>
        {/* Online */}
        <div className={`${panelBase} overflow-hidden`}>
          <div className="h-[3px] bg-[var(--border-strong)]" />
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
              Online
            </p>
            <p className="mt-1.5 text-xl font-black text-[var(--accent-secondary-text)] sm:text-2xl">
              {queueTotal}
            </p>
            <p className="mt-1 hidden text-xs leading-5 text-[var(--text-soft)] sm:block">
              Players in your lane
            </p>
          </div>
        </div>
        {/* Streak */}
        <div className={`${panelBase} overflow-hidden`}>
          <div className="h-[3px] bg-[var(--brand-coral)]" />
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
              Streak
            </p>
            {streak > 0 ? (
              <p className="mt-1.5 text-xl font-black text-[var(--brand-coral)] sm:text-2xl">
                {streak}
              </p>
            ) : (
              <p className="mt-1.5 text-xl font-black text-[var(--text-soft)] sm:text-2xl">—</p>
            )}
            <p className="mt-1 hidden text-xs leading-5 text-[var(--text-soft)] sm:block">
              Consecutive wins
            </p>
          </div>
        </div>
      </div>

      {/* ── Active match banner ───────────────────────── */}
      {activeMatch ? (
        <Link href={`/match/${activeMatch.id}`} className="block">
          <div className="flex items-center gap-4 rounded-xl border border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.08)] p-4 transition-all hover:border-[rgba(50,224,196,0.44)] hover:bg-[rgba(50,224,196,0.12)]">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(50,224,196,0.18)]">
              <Swords size={16} className="text-[var(--brand-teal)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">Match in Progress</p>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {GAMES[activeMatch.game]?.label} — open the room to submit your result.
              </p>
            </div>
            <ChevronRight size={15} className="flex-shrink-0 text-[var(--brand-teal)]" />
          </div>
        </Link>
      ) : null}

      {/* ── No games banner ───────────────────────────── */}
      {userGames.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.06)] p-4">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-[var(--brand-coral)]" />
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">No games selected yet</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Pick your focus title{currentPlan.maxGames > 1 ? 's' : ''} and Mechi will build your
              ladder from there.
            </p>
            <Link href="/games" className="brand-link-coral mt-2 inline-block text-xs font-bold">
              Choose games →
            </Link>
          </div>
        </div>
      ) : null}

      {/* ── Ranked Games ──────────────────────────────── */}
      {rankedGames.length > 0 ? (
        <section>
          {/* Section header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-4 w-[3px] rounded-full bg-[var(--brand-teal)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
              Ranked Games
            </p>
            <div className="h-px flex-1 bg-[var(--border-color)]" />
            <Link href="/leaderboard" className="brand-link text-xs font-bold whitespace-nowrap">
              Leaderboard →
            </Link>
          </div>
          {queueFeedback ? (
            <ActionFeedback
              tone={queueFeedback.tone}
              title={queueFeedback.title}
              detail={queueFeedback.detail}
              className="mb-4 rounded-xl"
            />
          ) : null}
          {queuingGame ? (
            <p className="mb-3 text-xs text-[var(--text-soft)]">
              Other games are paused while you search for a {GAMES[queuingGame]?.label} match.
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rankedGames.map((game) => (
              <GameCard
                key={game}
                gameKey={game}
                rating={(profile?.[getGameRatingKey(game)] as number) ?? 1000}
                wins={(profile?.[getGameWinsKey(game)] as number) ?? 0}
                losses={(profile?.[getGameLossesKey(game)] as number) ?? 0}
                queueCount={queueCounts[game]}
                onJoinQueue={() => handleJoinQueue(game)}
                isQueuing={queuingGame === game}
                isDisabled={!!activeMatch || (queuingGame !== null && queuingGame !== game)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Players Online ────────────────────────────── */}
      {rankedGames.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-4 w-[3px] rounded-full bg-[var(--brand-teal)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
              Players in Your Queue
            </p>
            <div className="h-px flex-1 bg-[var(--border-color)]" />
            <span className="flex items-center gap-1 rounded border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-secondary-text)]">
              <Radar size={10} />
              {onlinePlayers.length} live
            </span>
          </div>

          {onlinePlayers.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {onlinePlayers.map((player) => (
                <Link
                  key={`${player.id}-${player.game}`}
                  href={`/s/${encodeURIComponent(player.username)}`}
                  aria-label={`View ${player.username}'s profile`}
                  className={`${panelBase} group flex items-center gap-3 p-4 transition-all hover:border-[rgba(50,224,196,0.32)]`}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] text-sm font-black text-[var(--brand-teal)]">
                    {player.username[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {player.username}
                      </p>
                      <span className="rounded border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-secondary-text)]">
                        Lv {player.level}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      {GAMES[player.game].label}
                      {player.platform ? ` · ${player.platform.toUpperCase()}` : ''}
                      {player.region ? ` · ${player.region}` : ''}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
                      {player.wait_minutes > 0
                        ? `${player.wait_minutes}m in queue`
                        : 'Just joined'}
                    </p>
                  </div>
                  <ChevronRight
                    size={15}
                    className="flex-shrink-0 text-[var(--text-soft)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-teal)]"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className={`${panelBase} flex items-center justify-between gap-4 p-5`}>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No same-platform players are live right now
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  Invite friends to grow the pool and get faster matches.
                </p>
              </div>
              <Link href="/share" className="btn-outline shrink-0 text-xs">
                Invite
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {/* ── Lobby Games ───────────────────────────────── */}
      {lobbyGames.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-4 w-[3px] rounded-full bg-[var(--brand-teal)]" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
              Lobby Games
            </p>
            <div className="h-px flex-1 bg-[var(--border-color)]" />
            <span className="flex items-center gap-1 rounded border border-[var(--border-color)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-soft)]">
              <Users size={10} />
              {lobbyGames.length} title{lobbyGames.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lobbyGames.map((game) => (
              <GameCard
                key={game}
                gameKey={game}
                onViewLobby={() => router.push(`/lobbies?game=${game}`)}
                displayMode="lobby"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
