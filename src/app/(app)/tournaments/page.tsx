'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES } from '@/lib/config';
import type { GameKey, Tournament } from '@/types';

type TournamentListItem = Tournament & {
  confirmed_count?: number;
  player_count?: Array<{ count: number }> | number;
};

const STATUS_FILTERS = ['open', 'full', 'active', 'completed'] as const;

function getPlayerCount(tournament: TournamentListItem): number {
  const count = tournament.player_count;
  if (Array.isArray(count)) return count[0]?.count ?? 0;
  return typeof count === 'number' ? count : 0;
}

function formatTournamentStatus(status: string) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'full':
      return 'Full';
    case 'active':
      return 'Live';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'open':
      return 'bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)] border-[rgba(50,224,196,0.2)]';
    case 'active':
      return 'bg-[rgba(96,165,250,0.14)] text-[#93c5fd] border-[rgba(96,165,250,0.2)]';
    case 'full':
      return 'bg-[rgba(255,107,107,0.12)] text-[#ff9a9a] border-[rgba(255,107,107,0.2)]';
    default:
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border-color)]';
  }
}

function formatTournamentDate(tournament: TournamentListItem) {
  const source = tournament.started_at ?? tournament.created_at;
  if (!source) {
    return 'TBA';
  }

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return 'TBA';
  }

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export default function TournamentsPage() {
  const authFetch = useAuthFetch();
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('open');
  const [loading, setLoading] = useState(true);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/tournaments?status=${status}`);
      const data = (await res.json()) as {
        error?: string;
        tournaments?: TournamentListItem[];
      };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not load tournaments');
        setTournaments([]);
        return;
      }

      setTournaments(data.tournaments ?? []);
    } catch {
      toast.error('Could not load tournaments');
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, status]);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-[var(--text-primary)]">Tournaments</h1>
          {!loading && tournaments.filter((t) => t.status === 'open').length > 0 && (
            <span className="brand-chip px-2.5 py-1">
              {tournaments.filter((t) => t.status === 'open').length} open
            </span>
          )}
        </div>
        <Link href="/tournaments/create" className="btn-primary text-sm">
          <Plus size={14} />
          Host tournament
        </Link>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={`flex-shrink-0 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all ${
              status === item
                ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card overflow-hidden">
          <div className="space-y-0">
            {[1, 2, 3, 4].map((item, index) => (
              <div
                key={item}
                className={`px-4 py-4 ${index < 3 ? 'border-b border-[var(--border-color)]' : ''}`}
              >
                <div className="h-16 shimmer rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card py-16 text-center">
          <Trophy size={36} className="mx-auto mb-4 text-[var(--text-soft)] opacity-50" />
          <p className="font-black text-[var(--text-primary)]">No {status} brackets yet</p>
          <p className="mt-2 text-sm text-[var(--text-soft)]">Start one and bring your scene in.</p>
          <Link href="/tournaments/create" className="btn-primary mt-5 inline-flex">
            <Plus size={14} />
            Create tournament
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] lg:block">
            <div className="grid grid-cols-[minmax(0,1.45fr)_100px_100px_110px_90px] gap-4 border-b border-[var(--border-color)] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              <span>Tournament</span>
              <span>Slots</span>
              <span>Starts</span>
              <span className="text-right">Prize</span>
              <span className="text-right">Action</span>
            </div>

            {tournaments.map((tournament, index) => {
              const playerCount = getPlayerCount(tournament);
              const progress = Math.min(100, (playerCount / Math.max(1, tournament.size)) * 100);
              const game = GAMES[tournament.game as GameKey];
              const actionLabel =
                tournament.status === 'open' ? 'Join' : tournament.status === 'full' ? 'Watch' : 'View';

              return (
                <div
                  key={tournament.id}
                  className={`grid grid-cols-[minmax(0,1.45fr)_100px_100px_110px_90px] items-center gap-4 px-5 py-4 ${
                    index < tournaments.length - 1 ? 'border-b border-[var(--border-color)]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-[var(--text-primary)]">
                        {tournament.title}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${getStatusClasses(tournament.status)}`}
                      >
                        {formatTournamentStatus(tournament.status)}
                      </span>
                      {tournament.is_featured ? (
                        <span className="brand-chip-coral px-2 py-0.5">Featured</span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="brand-chip px-2 py-0.5">
                        {game?.label ?? tournament.game}
                      </span>
                      {tournament.entry_fee > 0 ? (
                        <span className="text-[11px] text-[var(--text-soft)]">
                          Entry KES {tournament.entry_fee.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--text-soft)]">Free entry</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 h-1.5 w-16 overflow-hidden rounded-full bg-[var(--border-color)]">
                      <div
                        className={tournament.status === 'full' ? 'h-full bg-[var(--brand-coral)]' : 'h-full bg-[var(--brand-teal)]'}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-soft)]">
                      {playerCount}/{tournament.size}
                    </span>
                  </div>

                  <span className="text-sm text-[var(--text-secondary)]">
                    {formatTournamentDate(tournament)}
                  </span>

                  <span className="text-right text-sm font-black text-[var(--brand-teal)]">
                    {tournament.prize_pool > 0
                      ? `KES ${tournament.prize_pool.toLocaleString()}`
                      : tournament.entry_fee > 0
                        ? 'Community prize'
                        : 'No prize'}
                  </span>

                  <div className="text-right">
                    <Link
                      href={`/t/${tournament.slug}`}
                      className={`inline-flex min-h-8 items-center justify-center rounded-md px-3 py-2 text-xs font-bold ${
                        tournament.status === 'full'
                          ? 'border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                          : 'border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
                      }`}
                    >
                      {actionLabel}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:hidden">
            {tournaments.map((tournament) => {
              const playerCount = getPlayerCount(tournament);
              const game = GAMES[tournament.game as GameKey];

              return (
                <div key={tournament.id} className="flex flex-col gap-2 border-b border-[var(--border-color)] py-4 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{tournament.title}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getStatusClasses(tournament.status)}`}>
                          {formatTournamentStatus(tournament.status)}
                        </span>
                        {tournament.is_featured && <span className="brand-chip-coral px-2 py-0.5 text-[10px]">Featured</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="brand-chip px-2 py-0.5 text-[10px]">{game?.label ?? tournament.game}</span>
                        <span className="text-[11px] text-[var(--text-soft)]">{playerCount}/{tournament.size} slots</span>
                        <span className="text-[11px] text-[var(--text-soft)]">· {formatTournamentDate(tournament)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[var(--brand-teal)]">
                        {tournament.prize_pool > 0
                          ? `KES ${tournament.prize_pool.toLocaleString()}`
                          : tournament.entry_fee > 0
                            ? 'Community prize'
                            : 'No prize'}
                      </p>
                      {tournament.entry_fee > 0 && (
                        <p className="text-[11px] text-[var(--text-soft)]">KES {tournament.entry_fee.toLocaleString()} entry</p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/t/${tournament.slug}`}
                    className="btn-primary w-full py-2 text-center text-xs"
                  >
                    {tournament.status === 'open' ? 'Join tournament' : tournament.status === 'active' ? 'Watch live' : 'View bracket'}
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
