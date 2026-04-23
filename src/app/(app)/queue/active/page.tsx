'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Radar, RefreshCw, Users } from 'lucide-react';
import { ActionFeedback } from '@/components/ActionFeedback';
import { useAuthFetch } from '@/components/AuthProvider';
import { PlatformLogo } from '@/components/PlatformLogo';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { GameKey, PlatformKey } from '@/types';

const REFRESH_INTERVAL_MS = 10_000;
const PANEL_BASE =
  'rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] shadow-[var(--shadow-soft)]';

type QueueActivePlayer = {
  id: string;
  username: string;
  avatar_url?: string | null;
  level: number;
  region?: string | null;
  game: GameKey;
  platform?: PlatformKey | null;
  joined_at: string;
  wait_minutes: number;
};

type QueueActiveResponse = {
  players?: QueueActivePlayer[];
  updated_at?: string;
  error?: string;
};

function getWaitLabel(waitMinutes: number) {
  if (waitMinutes <= 0) {
    return 'Just joined';
  }

  if (waitMinutes === 1) {
    return '1 minute in queue';
  }

  return `${waitMinutes} minutes in queue`;
}

function getJoinedLabel(joinedAt: string) {
  const value = new Date(joinedAt);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return `Joined ${value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function getUpdatedLabel(updatedAt: string | null) {
  if (!updatedAt) {
    return null;
  }

  const value = new Date(updatedAt);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function QueueActivePage() {
  const authFetch = useAuthFetch();
  const isMountedRef = useRef(true);
  const [players, setPlayers] = useState<QueueActivePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadPlayers = useCallback(
    async (mode: 'initial' | 'background' | 'manual' = 'initial') => {
      const shouldShowLoading = mode === 'initial';
      const shouldShowRefreshing = mode === 'manual';

      if (shouldShowLoading) {
        setLoading(true);
      }

      if (shouldShowRefreshing) {
        setRefreshing(true);
      }

      try {
        const response = await authFetch('/api/queue/active', { cache: 'no-store' });
        const payload = (await response.json().catch(() => null)) as QueueActiveResponse | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to load active queue players');
        }

        if (!isMountedRef.current) {
          return;
        }

        setPlayers(Array.isArray(payload?.players) ? payload.players : []);
        setUpdatedAt(typeof payload?.updated_at === 'string' ? payload.updated_at : new Date().toISOString());
        setError(null);
      } catch (loadError) {
        if (!isMountedRef.current) {
          return;
        }

        if (mode !== 'background') {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load active queue players');
        }
      } finally {
        if (!isMountedRef.current) {
          return;
        }

        if (shouldShowLoading) {
          setLoading(false);
        }

        if (shouldShowRefreshing) {
          setRefreshing(false);
        }
      }
    },
    [authFetch]
  );

  useEffect(() => {
    isMountedRef.current = true;
    void loadPlayers('initial');

    const intervalId = window.setInterval(() => {
      void loadPlayers('background');
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [loadPlayers]);

  const groupedPlayers = Array.from(
    players.reduce<Map<GameKey, QueueActivePlayer[]>>((groups, player) => {
      const nextGroup = groups.get(player.game) ?? [];
      nextGroup.push(player);
      groups.set(player.game, nextGroup);
      return groups;
    }, new Map())
  )
    .map(([game, gamePlayers]) => [
      game,
      [...gamePlayers].sort(
        (left, right) =>
          right.wait_minutes - left.wait_minutes || left.username.localeCompare(right.username)
      ),
    ] as const)
    .sort(
      ([leftGame, leftPlayers], [rightGame, rightPlayers]) =>
        rightPlayers.length - leftPlayers.length || GAMES[leftGame].label.localeCompare(GAMES[rightGame].label)
    );

  const liveGameCount = groupedPlayers.length;
  const updatedLabel = getUpdatedLabel(updatedAt);

  return (
    <div className="page-container space-y-4">
      <div className={`${PANEL_BASE} relative overflow-hidden`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(50,224,196,0.16),transparent_58%)]" />
        <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-secondary-text)]">
              <Radar size={12} />
              Queue Watch
            </div>
            <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
              Active Queue Players
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              See who is live across every ranked lane right now. This page refreshes automatically
              and only shows players still inside the active queue window.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] px-3 py-1 text-xs font-bold text-[var(--accent-secondary-text)]">
                {players.length} player{players.length === 1 ? '' : 's'} live
              </span>
              <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                {liveGameCount} game{liveGameCount === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadPlayers('manual')}
                disabled={loading || refreshing}
                className="btn-outline text-sm"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <Link href="/queue" className="btn-outline text-sm">
                Back to Queue
              </Link>
            </div>

            {updatedLabel ? (
              <p className="text-xs text-[var(--text-soft)]">Last sync {updatedLabel}</p>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <ActionFeedback
          tone="error"
          title="Could not load the active queue."
          detail={error}
          className="rounded-xl"
        />
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className={`${PANEL_BASE} h-48 shimmer`} />
          ))}
        </div>
      ) : groupedPlayers.length === 0 ? (
        <div className={`${PANEL_BASE} flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="max-w-xl">
            <p className="text-lg font-black text-[var(--text-primary)]">No active queue players yet</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Once players join a ranked lane, they will appear here in a simple live list.
            </p>
          </div>
          <Link href="/dashboard" className="btn-primary text-sm">
            Open Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedPlayers.map(([game, gamePlayers]) => (
            <section key={game} className={`${PANEL_BASE} overflow-hidden`}>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] px-5 py-4">
                <div>
                  <p className="text-lg font-black text-[var(--text-primary)]">{GAMES[game].label}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {gamePlayers.length} active player{gamePlayers.length === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="rounded-full border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] px-3 py-1 text-xs font-bold text-[var(--accent-secondary-text)]">
                  {gamePlayers.length} live
                </span>
              </div>

              <div className="divide-y divide-[var(--border-color)]">
                {gamePlayers.map((player) => {
                  const joinedLabel = getJoinedLabel(player.joined_at);
                  const platformLabel = player.platform ? PLATFORMS[player.platform]?.label ?? player.platform : null;

                  return (
                    <Link
                      key={`${player.id}-${player.game}`}
                      href={`/s/${encodeURIComponent(player.username)}`}
                      className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-elevated)]"
                    >
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] text-sm font-black text-[var(--brand-teal)]">
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

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                          {player.platform ? (
                            <span className="inline-flex items-center gap-1.5">
                              <PlatformLogo platform={player.platform} size={14} />
                              {platformLabel}
                            </span>
                          ) : null}
                          {player.region ? <span>{player.region}</span> : null}
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--text-soft)] sm:hidden">
                          {getWaitLabel(player.wait_minutes)}
                        </p>
                      </div>

                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {getWaitLabel(player.wait_minutes)}
                        </p>
                        {joinedLabel ? (
                          <p className="mt-1 text-[11px] text-[var(--text-soft)]">{joinedLabel}</p>
                        ) : null}
                      </div>

                      <ChevronRight
                        size={15}
                        className="flex-shrink-0 text-[var(--text-soft)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-teal)]"
                      />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {!loading && players.length > 0 ? (
        <div className={`${PANEL_BASE} flex items-center gap-3 p-4 text-sm text-[var(--text-secondary)]`}>
          <Users size={15} className="text-[var(--accent-secondary-text)]" />
          Open any player card to check profile details before you queue into the same lane.
        </div>
      ) : null}
    </div>
  );
}
