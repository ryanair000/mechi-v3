'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Loader2, ShieldAlert, Trophy, Users, X } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';

interface TournamentRow {
  id: string;
  slug: string;
  title: string;
  game: string;
  size: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  created_at: string;
  organizer: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  player_count: Array<{ count: number }> | null;
}

const STATUS_TABS = ['all', 'open', 'full', 'active', 'completed', 'cancelled'] as const;

export default function AdminTournamentsPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (tab !== 'all') params.set('status', tab);
      const res = await authFetch(`/api/admin/tournaments?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load tournaments');
        setTournaments([]);
        return;
      }
      setTournaments((data.tournaments ?? []) as TournamentRow[]);
    } catch {
      toast.error('Network error while loading tournaments');
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, tab]);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  const handleAction = useCallback(
    async (tournamentId: string, body: Record<string, unknown>, successMessage: string) => {
      setActingOn(tournamentId);
      try {
        const res = await authFetch(`/api/admin/tournaments/${tournamentId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Action failed');
          return;
        }
        toast.success(successMessage);
        await fetchTournaments();
      } catch {
        toast.error('Network error');
      } finally {
        setActingOn(null);
      }
    },
    [authFetch, fetchTournaments]
  );

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="brand-kicker">Admin tournaments</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Brackets, entries, and tournament health
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Review live brackets, kill broken events when needed, and keep paid competition from getting messy.
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
                    ? 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]'
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
            <div key={item} className="h-24 shimmer rounded-3xl" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card p-10 text-center">
          <Trophy size={22} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No tournaments matched that status.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Switch tabs to inspect older or live events.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((tournament) => {
            const gameLabel = GAMES[tournament.game as GameKey]?.label ?? tournament.game;
            const playerCount = tournament.player_count?.[0]?.count ?? 0;
            const canCancel = ['open', 'full', 'active'].includes(tournament.status) && user?.role === 'admin';

            return (
              <div key={tournament.id} className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--text-primary)]">{tournament.title}</p>
                      <span className="brand-chip px-2 py-0.5">{gameLabel}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          tournament.status === 'active'
                            ? 'bg-blue-500/14 text-blue-400'
                            : tournament.status === 'completed'
                              ? 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                              : tournament.status === 'cancelled'
                                ? 'bg-red-500/14 text-red-400'
                                : 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                        }`}
                      >
                        {tournament.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      By {tournament.organizer?.username ?? 'Unknown'} • {playerCount}/{tournament.size} players • KSh{' '}
                      {tournament.entry_fee.toLocaleString()} entry
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Prize pool: KSh {tournament.prize_pool.toLocaleString()}
                      {tournament.winner ? ` • Winner: ${tournament.winner.username}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      Created {new Date(tournament.created_at).toLocaleString()}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={12} />
                        {playerCount} locked in
                      </span>
                      <Link href={`/t/${tournament.slug}`} className="brand-link font-semibold">
                        Open bracket
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {actingOn === tournament.id ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 size={14} className="animate-spin" />
                        Working...
                      </div>
                    ) : canCancel ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleAction(
                            tournament.id,
                            { action: 'cancel', reason: 'Admin cancelled tournament' },
                            'Tournament cancelled'
                          )
                        }
                        className="btn-danger"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <ShieldAlert size={14} className="text-[var(--text-soft)]" />
                        {user?.role === 'admin' ? 'No action needed' : 'Admin-only cancel'}
                      </span>
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
