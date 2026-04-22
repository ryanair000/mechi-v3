'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import type { GameKey } from '@/types';

interface MatchHistoryEntry {
  id: string;
  game: GameKey;
  opponent_username: string;
  opponent_id: string;
  is_win: boolean;
  rating_change: number;
  completed_at: string;
  status: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Initial({ name }: { name: string }) {
  return (
    <span className="avatar-shell flex h-8 w-8 shrink-0 items-center justify-center text-xs font-black">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-0">
      {[0, 1, 2, 3, 4].map((n) => (
        <div key={n} className="flex items-center gap-3 border-b border-[var(--border-color)] py-3 last:border-0">
          <div className="h-8 w-8 shrink-0 rounded-2xl shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-36 rounded shimmer" />
            <div className="h-3 w-24 rounded shimmer" />
          </div>
          <div className="h-4 w-8 rounded shimmer" />
        </div>
      ))}
    </div>
  );
}

export default function MatchHistoryPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    setLoadError(null);
    try {
      const res = await authFetch('/api/matches/history');
      const data = (await res.json()) as { error?: string; matches?: MatchHistoryEntry[] };
      if (!res.ok) {
        setLoadError(data.error ?? 'Could not load match history.');
        return;
      }
      setMatches(data.matches ?? []);
    } catch {
      setLoadError('Could not load match history.');
    } finally {
      silent ? setRefreshing(false) : setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page-container max-w-[52rem]">
      <div className="flex items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-[var(--text-primary)]">Match history</h1>
          {!loading && matches.length > 0 && (
            <span className="brand-chip px-2.5 py-1">{matches.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load({ silent: true })}
          disabled={loading || refreshing}
          className="icon-button h-9 w-9"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
        </button>
      </div>

      {loadError ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span>{loadError}</span>
          <button type="button" onClick={() => void load()} className="shrink-0 text-xs font-semibold underline underline-offset-2">Retry</button>
        </div>
      ) : null}

      {loading ? (
        <Skeleton />
      ) : matches.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-sm text-[var(--text-soft)]">No matches yet.</p>
          <Link
            href="/leaderboard"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-secondary-text)] hover:text-[var(--text-primary)]"
          >
            Find someone to play <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="border-t border-[var(--border-color)]">
          {matches.map((match) => {
            const gameLabel = GAMES[match.game]?.label ?? match.game;
            return (
              <div
                key={match.id}
                className="flex items-center gap-3 border-b border-[var(--border-color)] py-3 last:border-0"
              >
                <Initial name={match.opponent_username} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {match.opponent_username}
                    </p>
                    <span className="brand-chip px-2 py-0.5 text-[10px]">{gameLabel}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
                    {match.completed_at ? formatTime(match.completed_at) : 'Pending'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${match.is_win ? 'text-[var(--accent-secondary-text)]' : 'text-red-400'}`}>
                    {match.is_win ? 'W' : 'L'}
                  </p>
                  {match.rating_change !== 0 && (
                    <p className="text-[11px] text-[var(--text-soft)]">
                      {match.rating_change > 0 ? '+' : ''}{match.rating_change}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
