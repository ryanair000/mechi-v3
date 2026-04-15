'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, Loader2, Swords, X } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';

interface MatchRow {
  id: string;
  game: string;
  platform: string | null;
  region: string;
  status: string;
  winner_id: string | null;
  created_at: string;
  completed_at: string | null;
  dispute_screenshot_url: string | null;
  tournament_id: string | null;
  player1: { id: string; username: string } | null;
  player2: { id: string; username: string } | null;
}

const STATUS_TABS = ['all', 'disputed', 'pending', 'completed', 'cancelled'] as const;

export default function AdminMatchesPage() {
  const authFetch = useAuthFetch();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('disputed');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (tab !== 'all') params.set('status', tab);
      const res = await authFetch(`/api/admin/matches?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load matches');
        setMatches([]);
        return;
      }
      setMatches((data.matches ?? []) as MatchRow[]);
    } catch {
      toast.error('Network error while loading matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, tab]);

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  const doAction = useCallback(
    async (matchId: string, body: Record<string, unknown>, successMessage: string) => {
      setActingOn(matchId);
      try {
        const res = await authFetch(`/api/admin/matches/${matchId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Action failed');
          return;
        }
        toast.success(successMessage);
        await fetchMatches();
      } catch {
        toast.error('Network error');
      } finally {
        setActingOn(null);
      }
    },
    [authFetch, fetchMatches]
  );

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="brand-kicker">Admin matches</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Match reviews and dispute fixes
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Step into broken results fast, resolve disputes, and keep the queue from stalling.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setTab(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                  tab === status
                    ? 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 shimmer rounded-3xl" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="card p-10 text-center">
          <Swords size={22} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No matches in this lane.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Try a different status tab if you want to review older results.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const gameLabel = GAMES[match.game as GameKey]?.label ?? match.game;
            const player1 = match.player1;
            const player2 = match.player2;
            const winnerName =
              match.winner_id === player1?.id
                ? player1?.username
                : match.winner_id === player2?.id
                  ? player2?.username
                  : null;

            return (
              <div key={match.id} className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--text-primary)]">
                        {match.player1?.username ?? 'Unknown'} vs {match.player2?.username ?? 'Unknown'}
                      </p>
                      <span className="brand-chip px-2 py-0.5">{gameLabel}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          match.status === 'disputed'
                            ? 'bg-amber-500/14 text-amber-400'
                            : match.status === 'completed'
                              ? 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                              : match.status === 'pending'
                                ? 'bg-blue-500/14 text-blue-400'
                                : 'bg-red-500/14 text-red-400'
                        }`}
                      >
                        {match.status}
                      </span>
                      {match.tournament_id ? (
                        <span className="brand-chip-coral px-2 py-0.5">Tournament match</span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {match.region}
                      {match.platform ? ` • ${match.platform}` : ''} • Started{' '}
                      {new Date(match.created_at).toLocaleString()}
                    </p>

                    {winnerName ? (
                      <p className="mt-2 text-sm text-[var(--brand-teal)]">Winner set: {winnerName}</p>
                    ) : null}

                    {match.dispute_screenshot_url ? (
                      <Link
                        href={match.dispute_screenshot_url}
                        target="_blank"
                        className="brand-link mt-3 inline-flex text-xs font-semibold"
                      >
                        Open dispute proof
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {actingOn === match.id ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 size={14} className="animate-spin" />
                        Working...
                      </div>
                    ) : (
                      <>
                        {match.status === 'disputed' && player1 && player2 ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void doAction(
                                  match.id,
                                  {
                                    action: 'resolve_dispute',
                                    winner_id: player1.id,
                                    reason: 'Admin reviewed dispute evidence',
                                  },
                                  `${player1.username} set as winner`
                                )
                              }
                              className="btn-ghost"
                            >
                              <Check size={14} />
                              {player1.username}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void doAction(
                                  match.id,
                                  {
                                    action: 'resolve_dispute',
                                    winner_id: player2.id,
                                    reason: 'Admin reviewed dispute evidence',
                                  },
                                  `${player2.username} set as winner`
                                )
                              }
                              className="btn-ghost"
                            >
                              <Check size={14} />
                              {player2.username}
                            </button>
                          </>
                        ) : null}

                        {match.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void doAction(
                                match.id,
                                { action: 'cancel', reason: 'Admin cancelled stale match' },
                                'Match cancelled'
                              )
                            }
                            className="btn-danger"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        ) : null}

                        {match.status === 'completed' ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                            <AlertTriangle size={14} className="text-[var(--text-soft)]" />
                            Completed
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
