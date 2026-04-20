'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BookOpen, ChevronRight, CirclePlay, Swords } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { openAppOnboarding } from '@/components/AppOnboarding';
import { useAuthFetch } from '@/components/AuthProvider';
import { GameCard } from '@/components/GameCard';
import { PaywallModal } from '@/components/PaywallModal';
import {
  GAMES,
  getConfiguredPlatformForGame,
  getGameLossesKey,
  getGameRatingKey,
  getGameWinsKey,
  normalizeSelectedGameKeys,
  PLATFORMS,
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

function formatPlatformLabel(platform?: PlatformKey | null) {
  if (!platform) {
    return null;
  }

  return PLATFORMS[platform]?.label ?? platform.toUpperCase();
}

export default function DashboardPage() {
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [activeQueueEntry, setActiveQueueEntry] = useState<QueueStatusResponse['queueEntry']>(null);
  const [queueCounts, setQueueCounts] = useState<Record<string, number>>({});
  const [onlinePlayers, setOnlinePlayers] = useState<OnlineQueuePlayer[]>([]);
  const [queuingGame, setQueuingGame] = useState<GameKey | null>(null);
  const [queueFeedback, setQueueFeedback] = useState<ActionFeedbackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'match_limit' | 'game_limit' | 'feature'>('match_limit');

  const getQueuePath = useCallback((queueEntry: QueueStatusResponse['queueEntry']) => {
    const queueGame = queueEntry?.game;
    if (!queueGame || !GAMES[queueGame]) {
      return null;
    }

    const params = new URLSearchParams({ game: queueGame });
    if (queueEntry?.platform) {
      params.set('platform', queueEntry.platform);
    }

    return `/queue?${params.toString()}`;
  }, []);

  const resumeQueue = useCallback((queueEntry: QueueStatusResponse['queueEntry']) => {
    const nextPath = getQueuePath(queueEntry);
    if (!nextPath) {
      return false;
    }

    router.push(nextPath);
    return true;
  }, [getQueuePath, router]);

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
          queueStatusRes.ok ? (queueStatusRes.json() as Promise<QueueStatusResponse>) : Promise.resolve(null),
          onlinePlayersRes.ok
            ? (onlinePlayersRes.json() as Promise<{ players?: OnlineQueuePlayer[] }>)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setProfile(profileRes.ok ? profileData.profile : null);
        setActiveMatch(activeMatchRes.ok ? (matchData.match as Match | null) : null);
        setActiveQueueEntry(
          queueData?.inQueue && queueData.queueEntry?.game && GAMES[queueData.queueEntry.game]
            ? queueData.queueEntry
            : null
        );
        setOnlinePlayers(onlinePlayersRes.ok ? ((onlinePlayersData?.players ?? []) as OnlineQueuePlayer[]) : []);
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
    const profileGameIds = (profile?.game_ids as Record<string, string>) ?? {};
    const platform = getConfiguredPlatformForGame(game, profileGameIds, profile?.platforms ?? []);

    if (activeMatch) {
      setQueueFeedback({
        tone: 'info',
        title: 'You already have a live match.',
        detail: 'Open that match first so your next queue starts from a clean state.',
      });
      toast.error('You have an active match');
      router.push(`/match/${activeMatch.id}`);
      return;
    }

    if (!platform) {
      setQueueFeedback({
        tone: 'error',
        title: `Set up your ${gameLabel} platform first.`,
        detail: 'Mechi needs the right platform before it can place you in the correct matchmaking lane.',
      });
      toast.error('Choose a platform for this game in settings');
      router.push('/profile/settings');
      return;
    }

    const joiningToast = toast.loading(`Checking the ${gameLabel} queue...`);
    setQueuingGame(game);
    setQueueFeedback({
      tone: 'loading',
      title: `Joining ${gameLabel} matchmaking...`,
      detail: `Checking your ${platform.toUpperCase()} lane and making sure you do not already have a live session.`,
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
  const profileGameIds = (profile?.game_ids as Record<string, string>) ?? {};
  const profilePlatforms = profile?.platforms ?? [];
  const rankedGames = userGames.filter((game) => GAMES[game]?.mode === '1v1');
  const lobbyGames = userGames.filter((game) => supportsLobbyMode(game));
  const rankedSetupGaps = rankedGames.filter(
    (game) => !getConfiguredPlatformForGame(game, profileGameIds, profilePlatforms)
  );

  const bestRating = rankedGames.length
    ? rankedGames.reduce((best, game) => {
        const rating = (profile?.[getGameRatingKey(game)] as number) ?? 1000;
        return rating > best ? rating : best;
      }, 1000)
    : null;
  const bestDivision = bestRating !== null ? getRankDivision(bestRating) : null;
  const queueTotal = rankedGames.reduce((total, game) => total + (queueCounts[game] ?? 0), 0);
  const xp = (profile?.xp as number) ?? 0;
  const level = (profile?.level as number) ?? getLevelFromXp(xp);
  const xpProgress = getXpProgress(xp, level);
  const xpRemaining = Math.max(xpProgress.nextLevelXp - xp, 0);
  const currentPlan = getPlan((profile?.plan as string | null | undefined) ?? 'free');
  const livePlayerPreview = onlinePlayers.slice(0, 3);
  const activeQueuePath = getQueuePath(activeQueueEntry);
  const activeQueuePlatformLabel = formatPlatformLabel(activeQueueEntry?.platform);
  const activeQueueGame = activeQueueEntry?.game ? GAMES[activeQueueEntry.game] : null;
  const setupGame = rankedSetupGaps[0] ?? null;
  const queueHeat =
    queueTotal >= 8
      ? { label: 'Hot', detail: 'Queue traffic moving fast across your ranked lane.' }
      : queueTotal >= 4
        ? { label: 'Active', detail: 'Your ranked lane has enough movement for solid match starts.' }
        : queueTotal >= 1
          ? { label: 'Warm', detail: 'A few players are already waiting in your saved games.' }
          : { label: 'Quiet', detail: 'No one is waiting yet, but you can still start the lane now.' };
  const winStreak = (profile?.win_streak as number) ?? 0;
  const rankedRecord = rankedGames.map((game) => ({
    game,
    wins: (profile?.[getGameWinsKey(game)] as number) ?? 0,
    losses: (profile?.[getGameLossesKey(game)] as number) ?? 0,
    rating: (profile?.[getGameRatingKey(game)] as number) ?? 1000,
  }));
  const heroTitle = activeMatch
    ? `Your ${GAMES[activeMatch.game]?.label ?? 'match'} is live, ${profile?.username ?? 'Player'}.`
    : activeQueueGame
      ? `Search is live in ${activeQueueGame.label}, ${profile?.username ?? 'Player'}.`
      : !userGames.length
        ? `Set up your first Mechi game, ${profile?.username ?? 'Player'}.`
        : setupGame
          ? `Finish your ${GAMES[setupGame].label} setup, ${profile?.username ?? 'Player'}.`
          : `Command your climb, ${profile?.username ?? 'Player'}.`;
  const heroBody = activeMatch
    ? 'Open the match, play it through, and finish the result flow before starting a new queue.'
    : activeQueueGame
      ? `Your${activeQueuePlatformLabel ? ` ${activeQueuePlatformLabel}` : ''} search is still running. Pick it up from where you left off.`
      : !userGames.length
        ? 'Add the title you actually play first so queue energy, level progress, and the right next actions can show up here.'
        : setupGame
          ? 'Mechi needs the correct platform and player ID before it can match you into the right lane.'
          : 'Check your live queue energy, level track, and next match from one cleaner home base.';

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div className="h-72 shimmer" />
          <div className="space-y-3">
            <div className="h-[132px] shimmer" />
            <div className="h-[132px] shimmer" />
          </div>
        </div>
        <div className="h-44 shimmer" />
        <div className="h-72 shimmer" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-7">
      {showPaywall ? (
        <PaywallModal reason={paywallReason} onClose={() => setShowPaywall(false)} />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div
          className={`card p-5 sm:p-6 ${
            activeMatch || activeQueuePath ? 'surface-live' : !userGames.length || setupGame ? 'surface-action' : ''
          }`}
        >
          <div className="flex flex-wrap gap-2">
            <span className="brand-chip hidden px-3 py-1 sm:inline-flex">Dashboard</span>
            <span className={`${bestDivision ? 'brand-chip-coral' : 'brand-chip'} px-3 py-1`}>
              {bestDivision ? bestDivision.label : currentPlan.name}
            </span>
          </div>

          <h1 className="mt-4 text-[1.65rem] font-black leading-[1.08] text-[var(--text-primary)] sm:text-[1.85rem]">
            {heroTitle}
          </h1>
          <p className="mt-2 max-w-[32rem] text-sm leading-7 text-[var(--text-secondary)]">{heroBody}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {activeMatch ? (
              <>
                <Link href={`/match/${activeMatch.id}`} className="btn-primary">
                  <Swords size={13} />
                  Open match
                </Link>
                <Link href="/leaderboard" className="btn-outline">
                  View leaderboard
                </Link>
              </>
            ) : activeQueuePath && activeQueueGame ? (
              <>
                <button type="button" onClick={() => resumeQueue(activeQueueEntry)} className="btn-primary">
                  <Swords size={13} />
                  Resume search
                </button>
                <Link href="/leaderboard" className="btn-outline">
                  View leaderboard
                </Link>
              </>
            ) : !userGames.length || setupGame ? (
              <>
                <button type="button" onClick={openAppOnboarding} className="btn-outline">
                  <CirclePlay size={13} />
                  Quick intro
                </button>
                <Link href="/tutorials" className="btn-outline">
                  <BookOpen size={13} />
                  Full tutorial
                </Link>
              </>
            ) : (
              <>
                <button type="button" onClick={openAppOnboarding} className="btn-outline">
                  <CirclePlay size={13} />
                  Quick intro
                </button>
                <Link href="/tutorials#start-flow" className="btn-outline">
                  <BookOpen size={13} />
                  Full tutorial
                </Link>
              </>
            )}
          </div>

          <div className="mt-5 border-t border-[var(--border-color)] pt-4">
            <div className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              <span>XP Progress</span>
              <span>{`${xp} / ${xpProgress.nextLevelXp}`}</span>
            </div>
            <div className="h-[6px] overflow-hidden rounded-[2px] bg-white/[0.06]">
              <div
                className="h-full rounded-[2px] bg-[linear-gradient(90deg,#32e0c4,#ff6b6b)]"
                style={{ width: `${Math.min(100, Math.max(0, xpProgress.progressPercent))}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="brand-chip px-3 py-1">{`Lv. ${level}`}</span>
              <span className="brand-chip-coral px-3 py-1">{`${(profile?.mp as number) ?? 0} MP`}</span>
              <span className="text-xs text-[var(--text-soft)]">{`${xpRemaining} XP until next level`}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="card p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Queue Heat</p>
            <p className="mt-2 text-[2rem] font-black leading-none text-[var(--brand-teal)]">{queueHeat.label}</p>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{queueHeat.detail}</p>
          </div>
          <div className="card p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">Win Streak</p>
            <p className="mt-2 text-[2rem] font-black leading-none text-[var(--brand-coral)]">{winStreak}</p>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">Matches won in a row right now.</p>
          </div>
        </div>
      </section>

      {queueFeedback ? <ActionFeedback tone={queueFeedback.tone} title={queueFeedback.title} detail={queueFeedback.detail} /> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="section-title !mb-0">Players Online Now</p>
          <span className="brand-chip px-3 py-1">{`${livePlayerPreview.length} live`}</span>
        </div>

        {livePlayerPreview.length > 0 ? (
          <div className="grid gap-2 lg:grid-cols-3">
            {livePlayerPreview.map((player) => (
              <Link
                key={`${player.id}-${player.game}`}
                href={`/s/${encodeURIComponent(player.username)}`}
                className="card-hover flex items-center gap-3 px-4 py-3"
              >
                <div className="avatar-shell flex h-10 w-10 shrink-0 items-center justify-center text-sm font-black">
                  {player.username[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{player.username}</p>
                    <span className="brand-chip px-2 py-0.5">{`Lv. ${player.level}`}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {GAMES[player.game].label}
                    {player.platform ? ` / ${formatPlatformLabel(player.platform)}` : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-soft)]">
                    {player.wait_minutes > 0 ? `Waiting for ${player.wait_minutes}m` : 'Just joined the queue'}
                  </p>
                </div>
                <ChevronRight size={13} className="shrink-0 text-[var(--text-soft)]" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No players are waiting right now</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              You can still start a queue now. When players join your games, they will show up here.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="section-title !mb-0">Ranked Games</p>
          <Link href="/leaderboard" className="text-xs font-bold text-[var(--accent-secondary-text)]">
            {'View leaderboard ->'}
          </Link>
        </div>

        {rankedGames.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rankedGames.map((game) => {
              const platform = getConfiguredPlatformForGame(game, profileGameIds, profilePlatforms);
              return (
                <GameCard
                  key={game}
                  gameKey={game}
                  rating={(profile?.[getGameRatingKey(game)] as number) ?? 1000}
                  wins={(profile?.[getGameWinsKey(game)] as number) ?? 0}
                  losses={(profile?.[getGameLossesKey(game)] as number) ?? 0}
                  queueCount={queueCounts[game]}
                  platform={platform}
                  onJoinQueue={() => handleJoinQueue(game)}
                  isQueuing={queuingGame === game}
                  isDisabled={!!activeMatch || (queuingGame !== null && queuingGame !== game)}
                />
              );
            })}
          </div>
        ) : (
          <div className="card p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No ranked titles ready yet</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Add a competitive title and the right platform to unlock these cards.
            </p>
          </div>
        )}
      </section>

      {lobbyGames.length > 0 ? (
        <section className="space-y-3">
          <p className="section-title !mb-0">Lobby Games</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {lobbyGames.map((game) => (
              <GameCard
                key={game}
                gameKey={game}
                platform={getConfiguredPlatformForGame(game, profileGameIds, profilePlatforms)}
                onViewLobby={() => router.push(`/lobbies?game=${game}`)}
                displayMode="lobby"
              />
            ))}
          </div>
        </section>
      ) : null}

      {rankedRecord.length > 0 ? (
        <section className="space-y-3">
          <p className="section-title !mb-0">Rank Overview</p>
          <div className="card divide-y divide-[var(--border-color)]">
            {rankedRecord.map((item) => {
              const division = getRankDivision(item.rating);
              return (
                <div key={item.game} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{GAMES[item.game].label}</p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">{`${item.wins}W / ${item.losses}L`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black" style={{ color: division.color }}>
                      {division.label}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-soft)]">{`${item.rating} pts`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
