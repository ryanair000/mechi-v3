'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Swords, Trophy, Users } from 'lucide-react';
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

export default function TournamentsPage() {
  const authFetch = useAuthFetch();
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('open');
  const [loading, setLoading] = useState(true);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/tournaments?status=${status}`);
      const data = await res.json();
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
      <div className="card circuit-panel mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="brand-kicker">Bracket Mode</p>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-[var(--text-primary)]">
              Tournaments
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Create a bracket, fill the slots, and let Mechi move winners forward after confirmed results.
            </p>
          </div>
          <Link href="/tournaments/create" className="btn-primary text-sm">
            <Plus size={14} /> Create
          </Link>
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={`flex-shrink-0 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${
              status === item
                ? 'bg-[var(--brand-coral)] text-[var(--brand-night)]'
                : 'border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-44 shimmer" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card py-16 text-center">
          <Trophy size={36} className="mx-auto mb-4 text-[var(--text-soft)] opacity-50" />
          <p className="font-black text-[var(--text-primary)]">No {status} brackets yet</p>
          <p className="mt-2 text-sm text-[var(--text-soft)]">Start one and bring your scene in.</p>
          <Link href="/tournaments/create" className="btn-primary mt-5 inline-flex">
            <Plus size={14} /> Create Tournament
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((tournament) => {
            const playerCount = getPlayerCount(tournament);
            const slotsLeft = Math.max(0, tournament.size - playerCount);
            const game = GAMES[tournament.game as GameKey];

            return (
              <Link
                key={tournament.id}
                href={`/t/${tournament.slug}`}
                className="card group overflow-hidden p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="brand-kicker">{game?.label ?? tournament.game}</p>
                    <h2 className="mt-3 truncate text-xl font-black tracking-normal text-[var(--text-primary)]">
                      {tournament.title}
                    </h2>
                  </div>
                  <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                    {tournament.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-[var(--surface-strong)] p-3">
                    <Users size={14} className="mx-auto mb-1 text-[var(--brand-teal)]" />
                    <p className="text-sm font-black text-[var(--text-primary)]">
                      {playerCount}/{tournament.size}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-soft)]">slots</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-strong)] p-3">
                    <Swords size={14} className="mx-auto mb-1 text-[var(--brand-coral)]" />
                    <p className="text-sm font-black text-[var(--text-primary)]">
                      {tournament.entry_fee > 0 ? `KES ${tournament.entry_fee}` : 'Free'}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-soft)]">entry</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-strong)] p-3">
                    <Trophy size={14} className="mx-auto mb-1 text-[var(--brand-coral)]" />
                    <p className="text-sm font-black text-[var(--text-primary)]">
                      {slotsLeft}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-soft)]">left</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
