'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertTriangle, Gamepad2, Play, Users, X } from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { PlatformLogo } from '@/components/PlatformLogo';
import {
  GAMES,
  PLATFORMS,
  getCanonicalGameKey,
  getConfiguredPlatformForGame,
  getGameIdValue,
} from '@/lib/config';
import type { GameKey, PlatformKey, QueueEntry } from '@/types';

type QueueJoinResponse = {
  entry?: QueueEntry & Record<string, unknown>;
  error?: string;
  limit_reached?: boolean;
  matchId?: string;
  queueEntry?: QueueEntry & Record<string, unknown>;
  upgrade_url?: string;
};

type QueueStatusResponse = {
  activeMatch?: { id: string } | null;
  inQueue?: boolean;
  queueEntry?: QueueEntry | null;
};

function getQueuePlatformsForUser(
  game: GameKey,
  gameIds: Record<string, string>,
  platforms: PlatformKey[]
) {
  const gameConfig = GAMES[game];
  if (!gameConfig) return [];

  const configuredPlatform = getConfiguredPlatformForGame(game, gameIds, platforms);
  const eligiblePlatforms = gameConfig.platforms.filter((item) => {
    return platforms.includes(item) && getGameIdValue(gameIds, game, item).trim().length > 0;
  });

  if (configuredPlatform && !eligiblePlatforms.includes(configuredPlatform)) {
    eligiblePlatforms.unshift(configuredPlatform);
  }

  return eligiblePlatforms;
}

function QueueGamePicker() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const userGames = (user?.selected_games ?? []) as GameKey[];
  const gameIds = (user?.game_ids ?? {}) as Record<string, string>;
  const platforms = (user?.platforms ?? []) as PlatformKey[];
  const playBasePath = pathname.startsWith('/dashboard/play') ? '/dashboard/play' : '/queue';
  const ranked1v1Games = userGames.filter((g) => GAMES[g]?.mode === '1v1');
  const gamesToShow =
    ranked1v1Games.length > 0
      ? ranked1v1Games
      : (Object.keys(GAMES).filter((g) => GAMES[g as GameKey]?.mode === '1v1') as GameKey[]);
  const hasConfiguredRankedGame = ranked1v1Games.some(
    (game) => getQueuePlatformsForUser(game, gameIds, platforms).length > 0
  );

  return (
    <div className="dashboard-page-container flex min-h-[80vh] items-center justify-center py-4">
      <div className="w-full max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-secondary-text)]">
              Ranked matchmaking
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-[var(--text-primary)]">
              Choose your lane.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Select a configured game and platform. Mechi will join the queue, check for a match, then open the match room when one lands.
            </p>
          </div>
          <Link href={`${playBasePath}/active`} className="btn-outline h-10 px-3 text-sm">
            <Users size={14} />
            Active players
          </Link>
        </div>

        {!hasConfiguredRankedGame ? (
          <ActionFeedback
            tone="info"
            title="Finish game setup first."
            detail="Add at least one ranked game, platform, and in-game ID so opponents know where to find you."
            className="mb-4"
          />
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {gamesToShow.map((g) => {
            const platformOptions = getQueuePlatformsForUser(g, gameIds, platforms);
            const canQueue = platformOptions.length > 0;

            return (
              <div key={g} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--accent-secondary-text)]">
                    <Gamepad2 size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-black text-[var(--text-primary)]">{GAMES[g].label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {canQueue ? 'Pick a platform to enter matchmaking.' : 'Missing platform or game ID setup.'}
                    </p>
                  </div>
                </div>

                {canQueue ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {platformOptions.map((platform) => (
                      <button
                        key={`${g}-${platform}`}
                        type="button"
                        className="btn-primary px-3 py-2 text-xs"
                        onClick={() => router.push(`${playBasePath}?game=${g}&platform=${platform}`)}
                      >
                        <PlatformLogo platform={platform} size={14} />
                        {PLATFORMS[platform]?.label ?? platform}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Link href="/dashboard/game-ids" className="btn-outline mt-4 w-full px-3 py-2 text-xs">
                    <AlertTriangle size={13} />
                    Fix setup
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QueueContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const rawGame = searchParams.get('game') as GameKey | null;
  const game = rawGame && GAMES[rawGame] ? getCanonicalGameKey(rawGame) : null;
  const platform = searchParams.get('platform') as PlatformKey | null;
  const [elapsed, setElapsed] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinedQueue, setJoinedQueue] = useState(false);
  const [joinAttempt, setJoinAttempt] = useState(0);
  const [joinError, setJoinError] = useState<QueueJoinResponse | null>(null);
  const [queueFeedback, setQueueFeedback] = useState<ActionFeedbackState | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const resolvedRef = useRef(false);
  const joinKeyRef = useRef<string | null>(null);

  const moveToMatch = useCallback(
    (nextMatchId: string) => {
      if (resolvedRef.current) return;

      resolvedRef.current = true;
      setQueueFeedback({
        tone: 'success',
        title: 'Match found.',
        detail: 'Opening your live match now so you can connect with your opponent.',
      });
      toast.success('Match found. Opening it now.');
      router.push(
        pathname.startsWith('/dashboard/play')
          ? `/dashboard/matches/${nextMatchId}`
          : `/match/${nextMatchId}`
      );
    },
    [pathname, router]
  );

  const exitQueueToDashboard = useCallback(
    (feedback: ActionFeedbackState, toastMessage?: string) => {
      if (resolvedRef.current) return;

      resolvedRef.current = true;
      setQueueFeedback(feedback);
      if (toastMessage) {
        if (feedback.tone === 'error') {
          toast.error(toastMessage);
        } else if (feedback.tone === 'success') {
          toast.success(toastMessage);
        } else {
          toast(toastMessage);
        }
      }
      router.push('/dashboard');
    },
    [router]
  );

  const checkStatus = useCallback(async () => {
    if (!user || resolvedRef.current) return;

    try {
      const res = await authFetch('/api/queue/status');
      if (!res.ok) return;

      const data = (await res.json()) as QueueStatusResponse;
      if (data.activeMatch) {
        moveToMatch(data.activeMatch.id);
      } else if (!data.inQueue) {
        exitQueueToDashboard(
          {
            tone: 'info',
            title: 'Queue session ended.',
            detail: 'Returning you to the dashboard.',
          },
          'Queue session ended. Back to dashboard.'
        );
      }
    } catch {
      // ignore
    }
  }, [authFetch, exitQueueToDashboard, moveToMatch, user]);

  useEffect(() => {
    if (!game || !GAMES[game]) {
      joinKeyRef.current = null;
      return;
    }

    const joinKey = `${game}:${platform ?? 'auto'}:${joinAttempt}`;
    if (joinKeyRef.current === joinKey) {
      return;
    }

    joinKeyRef.current = joinKey;
    resolvedRef.current = false;
    setElapsed(0);
    setJoinError(null);
    setJoinedQueue(false);
    setQueueFeedback({
      tone: 'loading',
      title: `Joining ${GAMES[game].label} queue...`,
      detail: 'Checking your profile, platform, access, and live match state.',
    });
    setJoining(true);

    const joinQueue = async () => {
      try {
        const res = await authFetch('/api/queue/join', {
          method: 'POST',
          body: JSON.stringify({
            game,
            ...(platform ? { platform } : {}),
          }),
        });
        const payload = (await res.json().catch(() => null)) as QueueJoinResponse | null;

        if (res.ok) {
          setJoinedQueue(true);
          setQueueFeedback({
            tone: 'loading',
            title: `Searching ${GAMES[game].label} matchmaking...`,
            detail:
              'Keep this page open for live updates, or leave the app and wait for the match alert.',
          });
          void checkStatus();
          return;
        }

        if (payload?.matchId) {
          moveToMatch(payload.matchId);
          return;
        }

        if (res.status === 409 && payload?.queueEntry) {
          const existingGame = payload.queueEntry.game;
          const existingPlatform = payload.queueEntry.platform;
          if (existingGame && existingGame !== game) {
            const nextPath = `${pathname.startsWith('/dashboard/play') ? '/dashboard/play' : '/queue'}?game=${existingGame}${
              existingPlatform ? `&platform=${existingPlatform}` : ''
            }`;
            router.replace(nextPath);
            return;
          }

          setJoinedQueue(true);
          setQueueFeedback({
            tone: 'loading',
            title: `Searching ${GAMES[existingGame ?? game]?.label ?? GAMES[game].label} matchmaking...`,
            detail: 'You were already in this queue. Continuing the live search.',
          });
          void checkStatus();
          return;
        }

        setJoinError(payload ?? { error: 'Could not join queue' });
        joinKeyRef.current = null;
        setQueueFeedback({
          tone: 'error',
          title: payload?.error ?? 'Could not join queue.',
          detail: payload?.limit_reached
            ? 'Your current plan has reached the daily match limit.'
            : 'Review your game setup, platform, or active match state and try again.',
        });
      } catch {
        setJoinError({ error: 'Network error' });
        joinKeyRef.current = null;
        setQueueFeedback({
          tone: 'error',
          title: 'Network error.',
          detail: 'Could not reach matchmaking. Try again in a moment.',
        });
      } finally {
        setJoining(false);
      }
    };

    void joinQueue();
  }, [authFetch, checkStatus, game, joinAttempt, moveToMatch, pathname, platform, router]);

  useEffect(() => {
    if (!game || !GAMES[game] || !joinedQueue) {
      return;
    }

    timerRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);

    const fetchCount = async () => {
      try {
        const platformQuery = platform ? `?platform=${encodeURIComponent(platform)}` : '';
        const res = await fetch(`/api/queue/count/${game}${platformQuery}`);
        if (res.ok) {
          const data = await res.json();
          setQueueCount(data.count);
        }
      } catch {
        // ignore
      }
    };

    void fetchCount();
    pollRef.current = setInterval(fetchCount, 8000);

    const statusPoll = setInterval(() => {
      void checkStatus();
    }, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(statusPoll);
    };
  }, [game, joinedQueue, platform, user, router, checkStatus]);

  const handleLeave = async () => {
    setLeaving(true);
    setQueueFeedback({
      tone: 'loading',
      title: 'Leaving the queue...',
      detail: "We're closing your search and taking you back to the dashboard.",
    });
    try {
      const res = await authFetch('/api/queue/leave', { method: 'POST' });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed to leave queue');
      }
      exitQueueToDashboard(
        {
          tone: 'success',
          title: 'Queue cancelled.',
          detail: 'You are out of matchmaking and back on the dashboard.',
        },
        'Left the queue'
      );
    } catch (error) {
      setQueueFeedback({
        tone: 'error',
        title: 'Could not leave the queue.',
        detail: error instanceof Error ? error.message : 'Please try again.',
      });
      toast.error(error instanceof Error ? error.message : 'Failed to leave queue');
      setLeaving(false);
    }
  };

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  if (!game || !GAMES[game]) {
    return <QueueGamePicker />;
  }
  const gameConfig = GAMES[game];
  const queuePlatforms = platform
    ? gameConfig.platforms.filter((item) => item === platform)
    : gameConfig.platforms.filter((item) => (user?.platforms ?? []).includes(item));
  const displayedPlatforms = queuePlatforms.length > 0 ? queuePlatforms : gameConfig.platforms;
  const platformLabel = displayedPlatforms
    .map((platform) => PLATFORMS[platform]?.label ?? platform)
    .join(' / ');

  return (
    <div className="page-container flex min-h-[80vh] items-center justify-center">
      <div className="card circuit-panel relative w-full max-w-lg overflow-hidden p-6 text-center sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.18),transparent_65%)]" />

        <div className="relative mb-7 inline-flex">
          <div className="absolute inset-0 scale-150 animate-ping rounded-full border border-[rgba(50,224,196,0.16)]" />
          <div
            className="absolute inset-0 scale-125 animate-ping rounded-full border border-[rgba(255,107,107,0.18)]"
            style={{ animationDelay: '0.5s' }}
          />
          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.1)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.12)]">
              <BrandLogo
                variant="symbol"
                size="lg"
                iconClassName="h-12 w-12 rounded-full border-0 bg-transparent shadow-none"
              />
            </div>
          </div>
        </div>

        <h1 className="text-[2rem] font-black tracking-normal text-[var(--text-primary)] sm:text-[2.15rem]">
          {joinError ? 'Queue needs attention.' : "We're cooking up your next matchup."}
        </h1>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{gameConfig.label}</p>
        {queueFeedback ? (
          <ActionFeedback
            tone={queueFeedback.tone}
            title={queueFeedback.title}
            detail={queueFeedback.detail}
            className="mx-auto mt-4 max-w-md text-left"
          />
        ) : null}
        {joinedQueue ? (
          <p className="mt-3 text-[2rem] font-black tabular-nums text-[var(--brand-coral)] sm:text-[2.25rem]">
            {formatTime(elapsed)}
          </p>
        ) : null}

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <div className="card flex items-center justify-center gap-2 px-3 py-2.5">
            <Users size={13} className="text-[var(--text-soft)]" />
            <span className="text-[13px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{queueCount}</span> in queue
            </span>
          </div>
          <div className="card flex flex-wrap items-center justify-center gap-2 px-3 py-2.5 text-center">
            {displayedPlatforms.map((platform) => (
              <span key={platform} aria-hidden="true">
                <PlatformLogo platform={platform} size={16} />
              </span>
            ))}
            <span className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">{platformLabel}</span>
          </div>
        </div>

        <p className="mx-auto mb-6 mt-5 max-w-sm text-center text-[13px] leading-6 text-[var(--text-secondary)]">
          {joinError
            ? 'Fix the issue above, then retry matchmaking from this lane or update your game IDs.'
            : `Mechi is checking your ${platformLabel} pool first, then opening the net wider if things stay quiet. You can leave the app and keep your queue live. When a match lands, Mechi sends the update by email and WhatsApp.`}
        </p>

        {joinError ? (
          <div className="flex flex-wrap justify-center gap-2">
            {joinError.upgrade_url ? (
              <Link href={joinError.upgrade_url} className="btn-primary px-4 py-2 text-sm">
                <Play size={13} />
                Upgrade access
              </Link>
            ) : null}
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              onClick={() => setJoinAttempt((value) => value + 1)}
            >
              <Play size={13} />
              Retry
            </button>
            <Link href="/dashboard/game-ids" className="btn-outline px-4 py-2 text-sm">
              <AlertTriangle size={13} />
              Game IDs
            </Link>
            <Link href={pathname.startsWith('/dashboard/play') ? '/dashboard/play' : '/queue'} className="btn-outline px-4 py-2 text-sm">
              Choose another lane
            </Link>
          </div>
        ) : (
          <button onClick={handleLeave} disabled={leaving || joining} className="btn-danger mx-auto px-4 py-2 text-sm">
            <X size={13} />
            {leaving ? 'Leaving...' : joining ? 'Joining...' : 'Cancel Search'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-teal)] border-t-transparent" />
        </div>
      }
    >
      <QueueContent />
    </Suspense>
  );
}
