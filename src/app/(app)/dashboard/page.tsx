'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertCircle, ChevronRight, CirclePlay, Radar, Swords } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { openAppOnboarding } from '@/components/AppOnboarding';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GameCard } from '@/components/GameCard';
import { PaywallModal } from '@/components/PaywallModal';
import { RatingBadge } from '@/components/RatingBadge';
import { TierMedal } from '@/components/TierMedal';
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

      <div className="card circuit-panel mb-5 overflow-hidden p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(14.5rem,0.55fr)]">
          <div
            className="rounded-[1.35rem] border border-[var(--border-color)] p-4 sm:p-5"
            style={{
              background:
                'linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface) 100%)',
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="brand-chip px-3 py-1">Dashboard</span>
              {rankedGames.length > 0 ? (
                <span className="brand-chip-coral px-3 py-1">{bestDivision.label}</span>
              ) : null}
            </div>

            <h1 className="mt-3 text-[1.45rem] font-black leading-[1.06] tracking-normal text-[var(--text-primary)] sm:text-[1.9rem]">
              Command your climb, {user?.username ?? 'Player'}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Check your live queue energy, level track, and next match from one cleaner home base.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openAppOnboarding}
                className="btn-outline text-sm"
              >
                <CirclePlay size={14} />
                Quick intro
              </button>
              <Link href="/tutorials" className="btn-outline text-sm">
                Full tutorial
              </Link>
              {userGames.length === 0 ? (
                <Link href="/games" className="btn-primary text-sm">
                  Finish Game Setup
                </Link>
              ) : null}
            </div>

            <div className="mt-4 max-w-xl rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                <span>XP progress</span>
                <span>{xpProgress.progressInLevel}/{xpProgress.progressNeeded}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="card p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="stat-label">Queue Heat</p>
                  <p className={`mt-2 text-[1.45rem] font-black ${queueHeat.tone}`}>{queueHeat.label}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">{queueHeat.detail}</p>
                </div>
                <div className="border-l border-[var(--border-color)] pl-4">
                  <p className="stat-label">Players Online</p>
                  <p className="mt-2 text-[1.7rem] font-black text-[var(--accent-secondary-text)]">{queueTotal}</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">
                    Same-platform players live in your ranked pool
                  </p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <p className="stat-label">Win Streak</p>
              <p className="mt-2 text-[1.7rem] font-black text-[var(--brand-coral)]">{streak}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">Matches in a row right now</p>
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
              <p className="section-title">Players Online Now</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Live players in your same-platform ranked lane. Tap a card to open their public profile.
              </p>
            </div>
            <div className="brand-chip w-fit">
              <Radar size={12} />
              <span>{onlinePlayers.length} live now</span>
            </div>
          </div>

          {onlinePlayers.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {onlinePlayers.map((player) => (
                <Link
                  key={`${player.id}-${player.game}`}
                  href={`/s/${encodeURIComponent(player.username)}`}
                  className="card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-[rgba(50,224,196,0.24)] hover:bg-[var(--surface)]"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.1)] text-sm font-black text-[var(--brand-teal)]">
                    {player.username[0]?.toUpperCase() ?? '?'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {player.username}
                      </p>
                      <span className="brand-chip px-1.5 py-0.5 text-[9px]">Lv. {player.level}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {GAMES[player.game].label}
                      {player.platform ? ` / ${player.platform.toUpperCase()}` : ''}
                      {player.region ? ` / ${player.region}` : ''}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-soft)]">
                      {player.wait_minutes > 0
                        ? `${player.wait_minutes}m in queue right now`
                        : 'Just joined the queue'}
                    </p>
                  </div>

                  <ChevronRight
                    size={16}
                    className="flex-shrink-0 text-[var(--text-soft)] transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No same-platform players are live right now
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                When players enter your ranked queue lane, they will show up here and you can jump into
                their public profiles in one tap.
              </p>
            </div>
          )}
        </section>
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
          {queueFeedback ? (
            <ActionFeedback
              tone={queueFeedback.tone}
              title={queueFeedback.title}
              detail={queueFeedback.detail}
              className="mb-4"
            />
          ) : null}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      )}

      {rankedGames.length > 0 && (
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title">Rank Overview</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Quick read on how each title is moving.
              </p>
            </div>
            <div className="brand-chip-coral w-fit gap-2">
              <TierMedal rating={bestRating} size="sm" />
              <span>{bestDivision.label} profile</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rankedGames.map((game) => {
              const rating = (profile?.[getGameRatingKey(game)] as number) ?? 1000;
              const wins = (profile?.[getGameWinsKey(game)] as number) ?? 0;
              const losses = (profile?.[getGameLossesKey(game)] as number) ?? 0;

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
