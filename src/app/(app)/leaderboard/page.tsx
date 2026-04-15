'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Crown, Trophy } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES } from '@/lib/config';
import { getRankDivision, withAlpha } from '@/lib/gamification';
import type { GameKey } from '@/types';

interface LeaderboardEntry {
  id: string;
  username: string;
  rating: number;
  division: string;
  level: number;
  wins: number;
  losses: number;
}

function filterRankedGames(games: readonly string[] = []): GameKey[] {
  return games.filter(
    (game): game is GameKey => Boolean(GAMES[game as GameKey]) && GAMES[game as GameKey].mode === '1v1'
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const fallbackGames = filterRankedGames(user?.selected_games ?? []);
  const [profileGames, setProfileGames] = useState<GameKey[] | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(fallbackGames[0] ?? null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const availableGames = profileGames ?? fallbackGames;

  const fetchLeaderboard = useCallback(async (game: GameKey) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/users/leaderboard/${game}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileGames() {
      try {
        const res = await authFetch('/api/users/profile');
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const nextGames = filterRankedGames((data.profile?.selected_games as string[]) ?? []);

        if (!cancelled) {
          setProfileGames(nextGames);
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfileGames();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    if (!availableGames.length) {
      setSelectedGame(null);
      return;
    }

    if (!selectedGame || !availableGames.includes(selectedGame)) {
      setSelectedGame(availableGames[0]);
    }
  }, [availableGames, selectedGame]);

  useEffect(() => {
    if (!selectedGame) {
      setEntries([]);
      setLoading(false);
      return;
    }

    void fetchLeaderboard(selectedGame);
  }, [selectedGame, fetchLeaderboard]);

  const placements = ['1', '2', '3'];

  return (
    <div className="page-container">
      <div className="card circuit-panel mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
              <Trophy size={16} />
            </div>
            <div>
              <h1 className="text-[2rem] font-black tracking-[-0.05em] text-[var(--text-primary)] sm:text-[2.3rem]">
                Leaderboard
              </h1>
              <p className="mt-1.5 text-[13px] leading-6 text-[var(--text-secondary)] sm:text-sm">
                Watch the top players, compare records, and see where your climb can go next.
              </p>
            </div>
          </div>
          {selectedGame ? (
            <div className="brand-chip-coral px-2.5 py-1 text-[11px]">
              <Trophy size={11} />
              <span>{GAMES[selectedGame].label}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card mb-5 p-3 sm:p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-title">Pick a game</p>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)] sm:text-sm">
              Only the ranked games on your profile show up here.
            </p>
          </div>
          <div className="brand-chip-coral self-start px-2.5 py-1 text-[11px] sm:self-auto">
            <Trophy size={11} />
            <span>{entries.length} players ranked</span>
          </div>
        </div>

        {availableGames.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible">
            {availableGames.map((game) => {
              const isSelected = selectedGame === game;

              return (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`flex-shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-[13px] font-semibold transition-all ${
                    isSelected
                      ? 'border-[rgba(255,107,107,0.28)] bg-[var(--brand-coral)] text-[var(--brand-night)] shadow-[0_10px_24px_rgba(255,107,107,0.2)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[rgba(50,224,196,0.22)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
                  }`}
                  aria-pressed={isSelected}
                >
                  {GAMES[game].label}
                </button>
              );
            })}
          </div>
        ) : profileLoading ? (
          <div className="h-12 shimmer" />
        ) : (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No ranked games on your profile yet</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Add a competitive title to your profile first, then its leaderboard will show up here.
            </p>
            <Link href="/profile" className="brand-link-coral mt-3 inline-block text-xs font-semibold">
              Update profile
            </Link>
          </div>
        )}
      </div>

      <div className="mb-2 hidden gap-3 px-3 py-1.5 text-[10px] font-semibold text-[var(--text-soft)] sm:grid sm:grid-cols-[2.5rem_1fr_6.5rem_4rem_5rem_5rem_4.5rem]">
        <div>Rank</div>
        <div>Player</div>
        <div className="text-right">Rank</div>
        <div className="text-right">Lv.</div>
        <div className="text-right">Wins</div>
        <div className="text-right">Losses</div>
        <div className="text-right">Win rate</div>
      </div>

      {loading || (profileLoading && !selectedGame) ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-14 shimmer" />
          ))}
        </div>
      ) : !selectedGame ? (
        <div className="card py-20 text-center text-[var(--text-soft)]">
          <Trophy size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-[var(--text-primary)]">No leaderboard available yet</p>
          <p className="mt-1 text-xs">Choose a ranked game in your profile to unlock this page.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card py-20 text-center text-[var(--text-soft)]">
          <Trophy size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-[var(--text-primary)]">No players yet</p>
          <p className="mt-1 text-xs">Be the first to compete in {GAMES[selectedGame].label}.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, index) => {
            const division = getRankDivision(entry.rating);
            const winRate =
              entry.wins + entry.losses > 0
                ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100)
                : 0;
            const isMe = entry.id === user?.id;
            const isTopThree = index < 3;

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all ${
                  isMe
                    ? 'surface-live'
                    : isTopThree
                      ? 'card border-[rgba(255,107,107,0.18)]'
                      : 'card hover:bg-[var(--surface)]'
                }`}
              >
                <div className="w-7 flex-shrink-0 text-center">
                  {isTopThree ? (
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                        index === 0
                          ? 'bg-[rgba(255,107,107,0.18)] text-[var(--brand-coral)]'
                          : 'bg-[rgba(50,224,196,0.16)] text-[var(--brand-teal)]'
                      }`}
                    >
                      {placements[index]}
                    </span>
                  ) : (
                    <span className="text-[13px] font-medium text-[var(--text-soft)]">#{index + 1}</span>
                  )}
                </div>

                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold"
                  style={{
                    color: division.color,
                    backgroundColor: withAlpha(division.color, '14'),
                    borderColor: withAlpha(division.color, '28'),
                  }}
                >
                  {entry.username[0].toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`truncate text-[13px] font-medium sm:text-sm ${isMe ? 'text-[var(--brand-teal)]' : 'text-[var(--text-primary)]'}`}>
                      {entry.username}
                    </p>
                    {isMe && <span className="brand-chip px-1.5 py-0.5 text-[9px]">YOU</span>}
                    {index === 0 && <Crown size={11} className="flex-shrink-0 text-[var(--brand-coral)]" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--text-soft)] sm:hidden">
                    {entry.division} / Lv. {entry.level} / {winRate}% WR
                  </p>
                </div>

                <div className="hidden w-28 text-right sm:block">
                  <span
                    className="text-[13px] font-bold sm:text-sm"
                    style={{ color: division.color }}
                  >
                    {entry.division}
                  </span>
                </div>
                <div className="hidden w-16 text-right text-[13px] text-[var(--text-secondary)] sm:block">{entry.level}</div>
                <div className="hidden w-20 text-right text-[13px] text-[var(--text-secondary)] sm:block">{entry.wins}</div>
                <div className="hidden w-20 text-right text-[13px] text-[var(--text-secondary)] sm:block">{entry.losses}</div>
                <div className="hidden w-[4.5rem] text-right text-[13px] text-[var(--text-secondary)] sm:block">{winRate}%</div>

                <div className="text-right sm:hidden">
                  <div className="text-[13px] font-bold" style={{ color: division.color }}>
                    {entry.division}
                  </div>
                  <div className="text-[9px] text-[var(--text-soft)]">Lv. {entry.level}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
