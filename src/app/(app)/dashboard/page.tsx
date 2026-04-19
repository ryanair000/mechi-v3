'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertCircle, ChevronRight, Radar, Swords, Users } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
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
  const rankedReadyGames = rankedGames.filter((game) =>
    getConfiguredPlatformForGame(game, profileGameIds, profilePlatforms)
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
  const streak = (profile?.win_streak as number) ?? 0;
  const xpProgress = getXpProgress(xp, level);
  const xpRemaining = Math.max(xpProgress.nextLevelXp - xp, 0);
  const livePlayerPreview = onlinePlayers.slice(0, 4);
  const activeQueuePath = getQueuePath(activeQueueEntry);
  const activeQueuePlatformLabel = formatPlatformLabel(activeQueueEntry?.platform);
  const activeQueueGame = activeQueueEntry?.game ? GAMES[activeQueueEntry.game] : null;
  const setupGame = rankedSetupGaps[0] ?? null;
  const recommendedRankedGame =
    [...rankedReadyGames].sort((gameA, gameB) => {
      const queueDiff = (queueCounts[gameB] ?? 0) - (queueCounts[gameA] ?? 0);
      if (queueDiff !== 0) {
        return queueDiff;
      }

      const ratingA = (profile?.[getGameRatingKey(gameA)] as number) ?? 1000;
      const ratingB = (profile?.[getGameRatingKey(gameB)] as number) ?? 1000;
      return ratingB - ratingA;
    })[0] ?? null;
  const featuredLobbyGame = lobbyGames[0] ?? null;
  const queueHeat =
    queueTotal >= 8
      ? { label: 'Hot', detail: 'Matches should move quickly in your ranked lane.' }
      : queueTotal >= 4
        ? { label: 'Warm', detail: 'Healthy traffic is building right now.' }
        : queueTotal >= 1
          ? { label: 'Building', detail: 'A few players are already waiting.' }
          : { label: 'Quiet', detail: 'No same-lane players are waiting yet.' };

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <div className="h-40 shimmer" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 shimmer" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-72 shimmer" />
          <div className="h-72 shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {showPaywall ? (
        <PaywallModal reason={paywallReason} onClose={() => setShowPaywall(false)} />
      ) : null}

      <section
        className={`card overflow-hidden p-5 sm:p-6 ${
          activeMatch || activeQueuePath ? 'surface-live' : !userGames.length || setupGame ? 'surface-action' : ''
        }`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {activeMatch ? (
              <>
                <p className="app-page-eyebrow">Active match</p>
                <h2 className="text-[1.75rem] font-bold leading-tight text-[var(--text-primary)] sm:text-[2.1rem]">
                  Finish your {GAMES[activeMatch.game]?.label ?? 'live'} match
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  Your room is already live. Head back there before starting another queue so your score report and
                  dispute flow stay clean.
                </p>
              </>
            ) : activeQueuePath && activeQueueGame ? (
              <>
                <p className="app-page-eyebrow">Queue live</p>
                <h2 className="text-[1.75rem] font-bold leading-tight text-[var(--text-primary)] sm:text-[2.1rem]">
                  You are already searching in {activeQueueGame.label}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  Your queue session{activeQueuePlatformLabel ? ` on ${activeQueuePlatformLabel}` : ''} is still active.
                  Resume that search instead of starting a second one.
                </p>
              </>
            ) : !userGames.length ? (
              <>
                <p className="app-page-eyebrow">Finish setup</p>
                <h2 className="text-[1.75rem] font-bold leading-tight text-[var(--text-primary)] sm:text-[2.1rem]">
                  Choose the games you want on this dashboard
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  Pick the titles you actually compete in, then Mechi can focus your queue, profile, and session stats
                  around them.
                </p>
              </>
            ) : setupGame ? (
              <>
                <p className="app-page-eyebrow">Finish setup</p>
                <h2 className="text-[1.75rem] font-bold leading-tight text-[var(--text-primary)] sm:text-[2.1rem]">
                  Set your {GAMES[setupGame].label} platform
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  You already selected the game, but matchmaking still needs the platform you play on before you can
                  queue cleanly.
                </p>
              </>
            ) : recommendedRankedGame ? (
              <>
                <p className="app-page-eyebrow">Next action</p>
                <h2 className="text-[1.75rem] font-bold leading-tight text-[var(--text-primary)] sm:text-[2.1rem]">
                  Queue into {GAMES[recommendedRankedGame].label}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  {queueCounts[recommendedRankedGame] > 0
                    ? `There are ${queueCounts[recommendedRankedGame]} players already live in this lane, so it is your fastest next match from here.`
                    : 'This is your cleanest ranked next step from the dashboard right now.'}
                </p>
              </>
            ) : featuredLobbyGame ? (
              <>
                <p className="app-page-eyebrow">Next action</p>
                <h2 className="text-[1.75rem] font-bold leading-tight text-[var(--text-primary)] sm:text-[2.1rem]">
                  Start with {GAMES[featuredLobbyGame].label} lobbies
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  Your setup is currently better suited to room-based play. Browse active squads or create a new lobby
                  in one cleaner flow.
                </p>
              </>
            ) : (
              <>
                <p className="app-page-eyebrow">Welcome back</p>
                <h2 className="text-[1.75rem] font-bold leading-tight text-[var(--text-primary)] sm:text-[2.1rem]">
                  Set your next session in motion
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  Browse games, complete your setup, or head to tutorials to learn the ranked and lobby flow.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {activeMatch ? (
              <>
                <Link href={`/match/${activeMatch.id}`} className="btn-ghost text-sm">
                  <Swords size={14} />
                  Open match
                </Link>
                <Link href="/leaderboard" className="btn-outline text-sm">
                  View leaderboard
                </Link>
              </>
            ) : activeQueuePath && activeQueueGame ? (
              <>
                <button type="button" onClick={() => resumeQueue(activeQueueEntry)} className="btn-ghost text-sm">
                  <Radar size={14} />
                  Resume queue
                </button>
                <Link href="/leaderboard" className="btn-outline text-sm">
                  View leaderboard
                </Link>
              </>
            ) : !userGames.length ? (
              <>
                <Link href="/games" className="btn-primary text-sm">
                  Choose games
                </Link>
                <Link href="/profile/settings" className="btn-outline text-sm">
                  Open settings
                </Link>
              </>
            ) : setupGame ? (
              <>
                <Link href="/profile/settings" className="btn-primary text-sm">
                  Update settings
                </Link>
                <Link href="/games" className="btn-outline text-sm">
                  Review games
                </Link>
              </>
            ) : recommendedRankedGame ? (
              <>
                <button
                  type="button"
                  onClick={() => handleJoinQueue(recommendedRankedGame)}
                  disabled={queuingGame !== null}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-[1rem] border px-4 py-2 text-sm font-semibold ${
                    queuingGame === recommendedRankedGame
                      ? 'cursor-not-allowed border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-soft)]'
                      : 'cursor-pointer border-[rgba(50,224,196,0.22)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)] hover:border-[rgba(50,224,196,0.34)] hover:bg-[rgba(50,224,196,0.2)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Swords size={14} />
                  {queuingGame === recommendedRankedGame ? 'Searching...' : 'Find match'}
                </button>
                <Link href="/leaderboard" className="btn-outline text-sm">
                  View leaderboard
                </Link>
              </>
            ) : featuredLobbyGame ? (
              <>
                <Link href={`/lobbies?game=${featuredLobbyGame}`} className="btn-primary text-sm">
                  <Users size={14} />
                  Browse lobbies
                </Link>
                <Link href={`/lobbies/create?game=${featuredLobbyGame}`} className="btn-outline text-sm">
                  Create lobby
                </Link>
              </>
            ) : (
              <>
                <Link href="/games" className="btn-primary text-sm">
                  Explore games
                </Link>
                <Link href="/tutorials" className="btn-outline text-sm">
                  View tutorials
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="subtle-stat-strip sm:grid-cols-2 xl:grid-cols-4">
        <div className="subtle-stat-item">
          <p className="subtle-stat-value">Lv {level}</p>
          <p className="subtle-stat-label">Level</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{xpRemaining} XP to next level</p>
        </div>

        <div className="subtle-stat-item">
          <p className="subtle-stat-value">{bestDivision ? bestDivision.label : userGames.length || 'None'}</p>
          <p className="subtle-stat-label">{bestDivision ? 'Best rank' : 'Selected games'}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {bestDivision ? `${bestRating} rating peak` : userGames.length ? 'Current dashboard focus' : 'Choose your titles'}
          </p>
        </div>

        <div className="subtle-stat-item">
          <p className="subtle-stat-value">{rankedGames.length > 0 ? queueHeat.label : lobbyGames.length || 0}</p>
          <p className="subtle-stat-label">{rankedGames.length > 0 ? 'Queue pulse' : 'Lobby ready'}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {rankedGames.length > 0 ? `${queueTotal} players live in your lane` : 'Room-based games ready to play'}
          </p>
        </div>

        <div className="subtle-stat-item">
          <p className="subtle-stat-value">{streak}</p>
          <p className="subtle-stat-label">Win streak</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {streak === 1 ? 'One win in a row' : `${streak} wins in a row`}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-title">Play</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Keep the next move obvious: queue ranked matches here and handle lobby games in their own lighter flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {lobbyGames.length > 0 ? (
              <Link href="/lobbies/create" className="btn-outline text-sm">
                Create lobby
              </Link>
            ) : null}
            <Link href="/leaderboard" className="btn-outline text-sm">
              Leaderboard
            </Link>
          </div>
        </div>

        {queueFeedback ? (
          <ActionFeedback
            tone={queueFeedback.tone}
            title={queueFeedback.title}
            detail={queueFeedback.detail}
          />
        ) : null}

        {!userGames.length ? (
          <div className="subtle-card flex items-start gap-3 p-4 sm:p-5">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-[var(--brand-coral)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No games selected yet</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Add the titles you actually play so ranked and lobby actions can stay focused.
              </p>
              <Link href="/games" className="brand-link-coral mt-3 inline-flex text-sm font-semibold">
                Choose games
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {rankedGames.length > 0 ? (
              <div className="subtle-card p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">Ranked</h3>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Queue straight into your 1v1 titles without competing panels around it.
                    </p>
                  </div>
                  {rankedSetupGaps.length > 0 ? (
                    <Link href="/profile/settings" className="brand-link text-xs font-semibold">
                      Finish setup
                    </Link>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            ) : null}

            {lobbyGames.length > 0 ? (
              <div className="subtle-card p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">Lobbies</h3>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Browse or create room-based sessions when your game needs a squad instead of a duel.
                    </p>
                  </div>
                  <Link href="/lobbies" className="brand-link text-xs font-semibold">
                    View all
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            ) : null}
          </div>
        )}
      </section>

      {rankedGames.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title">Live in your lane</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Same-platform players already in queue. Open a public profile or check the ladder for a broader view.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="badge-blue">
                <Radar size={12} />
                {onlinePlayers.length} live
              </span>
              <Link href="/leaderboard" className="brand-link text-xs font-semibold">
                View more
              </Link>
            </div>
          </div>

          {livePlayerPreview.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {livePlayerPreview.map((player) => (
                <Link
                  key={`${player.id}-${player.game}`}
                  href={`/s/${encodeURIComponent(player.username)}`}
                  className="subtle-card group flex items-center gap-3 p-4"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.1)] text-sm font-black text-[var(--brand-teal)]">
                    {player.username[0]?.toUpperCase() ?? '?'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{player.username}</p>
                      <span className="badge-gray">Lv. {player.level}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {GAMES[player.game].label}
                      {player.platform ? ` / ${player.platform.toUpperCase()}` : ''}
                      {player.region ? ` / ${player.region}` : ''}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-soft)]">
                      {player.wait_minutes > 0 ? `${player.wait_minutes}m in queue right now` : 'Just joined the queue'}
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
            <div className="subtle-card p-4 sm:p-5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">No same-lane players are live right now</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                When players enter your ranked queue lane, they will show up here as a lighter secondary view instead
                of competing with your main action area.
              </p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
