'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { LiveBadge } from '@/components/LiveBadge';
import { GAMES } from '@/lib/config';
import { resolvePlan } from '@/lib/plans';
import { getTournamentPrizePoolLabel } from '@/lib/tournament-metrics';
import { formatTournamentDateTime } from '@/lib/tournament-schedule';
import type { GameKey, Tournament } from '@/types';

type TournamentListItem = Tournament & {
  confirmed_count?: number;
  player_count?: Array<{ count: number }> | number;
  active_stream?: {
    id: string;
    viewer_count: number;
  } | null;
};

const STATUS_FILTERS = ['all', 'open', 'active', 'completed'] as const;

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
      return 'Ongoing';
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

function formatTournamentFilterLabel(status: (typeof STATUS_FILTERS)[number]) {
  switch (status) {
    case 'all':
      return 'All';
    case 'open':
      return 'Open';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

function getEmptyStateTitle(status: (typeof STATUS_FILTERS)[number]) {
  if (status === 'all') {
    return 'No brackets yet';
  }

  return `No ${formatTournamentFilterLabel(status).toLowerCase()} brackets yet`;
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
  return formatTournamentDateTime(
    tournament.scheduled_for ?? tournament.started_at ?? tournament.created_at,
    'TBA'
  );
}

export default function TournamentsPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const canHostTournaments = resolvePlan(user?.plan, user?.plan_expires_at) !== 'free';
  const hostHref = canHostTournaments ? '/tournaments/create' : '/pricing';
  const hostLabel = canHostTournaments ? 'Host tournament' : 'Upgrade to host';

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
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Tournaments</p>
            <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Upcoming competitions
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Host a bracket, track filled slots, and move players into the right tournament detail when it is time to join.
            </p>
          </div>

          <Link href={hostHref} className="btn-primary text-sm">
            <Plus size={14} />
            {hostLabel}
          </Link>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
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
            {formatTournamentFilterLabel(item)}
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
          <p className="font-black text-[var(--text-primary)]">
            {getEmptyStateTitle(status)}
          </p>
          <p className="mt-2 text-sm text-[var(--text-soft)]">Start one and bring your scene in.</p>
          <Link href={hostHref} className="btn-primary mt-5 inline-flex">
            <Plus size={14} />
            {canHostTournaments ? 'Create tournament' : 'Upgrade to host'}
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] lg:block">
            <div className="grid grid-cols-[minmax(0,1.3fr)_100px_150px_110px_90px] gap-4 border-b border-[var(--border-color)] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
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
                  className={`grid grid-cols-[minmax(0,1.3fr)_100px_150px_110px_90px] items-center gap-4 px-5 py-4 ${
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
                      {tournament.active_stream ? (
                        <Link href={`/t/${tournament.slug}/live`}>
                          <LiveBadge viewerCount={tournament.active_stream.viewer_count} />
                        </Link>
                      ) : null}
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
                    {getTournamentPrizePoolLabel({
                      prizePool: tournament.prize_pool,
                      entryFee: tournament.entry_fee,
                      prizePoolMode: tournament.prize_pool_mode,
                    })}
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

          <div className="grid gap-4 lg:hidden">
            {tournaments.map((tournament) => {
              const playerCount = getPlayerCount(tournament);
              const progress = Math.min(100, (playerCount / Math.max(1, tournament.size)) * 100);
              const game = GAMES[tournament.game as GameKey];

              return (
                <div key={tournament.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          {tournament.title}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${getStatusClasses(tournament.status)}`}
                        >
                          {formatTournamentStatus(tournament.status)}
                        </span>
                        {tournament.active_stream ? (
                          <Link href={`/t/${tournament.slug}/live`}>
                            <LiveBadge viewerCount={tournament.active_stream.viewer_count} />
                          </Link>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-soft)]">
                        {game?.label ?? tournament.game}
                      </p>
                    </div>
                    {tournament.is_featured ? (
                      <span className="brand-chip-coral px-2 py-0.5">Featured</span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        Slots
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                        {playerCount}/{tournament.size}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border-color)]">
                        <div
                          className={tournament.status === 'full' ? 'h-full bg-[var(--brand-coral)]' : 'h-full bg-[var(--brand-teal)]'}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        Starts
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                        {formatTournamentDate(tournament)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        Prize
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--brand-teal)]">
                        {getTournamentPrizePoolLabel({
                          prizePool: tournament.prize_pool,
                          entryFee: tournament.entry_fee,
                          prizePoolMode: tournament.prize_pool_mode,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link href={`/t/${tournament.slug}`} className="btn-outline flex-1 py-2 text-xs">
                      View bracket
                    </Link>
                    <Link
                      href={tournament.active_stream ? `/t/${tournament.slug}/live` : `/t/${tournament.slug}`}
                      className="btn-primary flex-1 py-2 text-xs"
                    >
                      {tournament.active_stream
                        ? 'Watch live'
                        : tournament.status === 'open'
                          ? 'Join'
                          : tournament.status === 'full'
                            ? 'Watch'
                            : 'Open'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
