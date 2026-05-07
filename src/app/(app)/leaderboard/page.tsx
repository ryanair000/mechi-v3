'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { MemberList, type MemberListItem } from '@/components/ui/member-list';

type TournamentLeaderboardEntry = MemberListItem & {
  matchesPlayed: number;
};

export default function LeaderboardPage() {
  const authFetch = useAuthFetch();
  const [entries, setEntries] = useState<TournamentLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/users/leaderboard/tournaments');
      if (!res.ok) {
        setEntries([]);
        return;
      }

      const data = (await res.json()) as { leaderboard?: TournamentLeaderboardEntry[] };
      setEntries(data.leaderboard ?? []);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  const totals = useMemo(
    () => ({
      matchWins: entries.reduce((sum, entry) => sum + entry.matchWins, 0),
      players: entries.length,
      tournamentWins: entries.reduce((sum, entry) => sum + entry.tournamentWins, 0),
      tournamentsPlayed: entries.reduce((sum, entry) => sum + entry.tournamentsPlayed, 0),
    }),
    [entries]
  );

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Leaderboard</p>
            <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Tournament standings
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Ranked from tournament participation, bracket wins, and completed tournament wins only.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-80">
            <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-lg font-black text-[var(--text-primary)]">{totals.players}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Players
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-lg font-black text-[var(--text-primary)]">{totals.tournamentWins}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Trophies
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2">
              <p className="text-lg font-black text-[var(--text-primary)]">{totals.matchWins}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                Wins
              </p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-16 shimmer" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card py-20 text-center text-[var(--text-soft)]">
          <Trophy size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-[var(--text-primary)]">No tournament data yet</p>
          <p className="mt-1 text-xs">Players appear here after joining or winning tournaments.</p>
        </div>
      ) : (
        <MemberList
          items={entries}
          emptyLabel="No tournament leaderboard data yet"
        />
      )}
    </div>
  );
}
