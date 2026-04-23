'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, normalizeSelectedGameKeys } from '@/lib/config';
import type { GameKey, PlatformKey } from '@/types';

interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  rating: number;
  division: string;
  level: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  tournamentsWon: number;
}

function filterRankedGames(games: readonly string[] = []): GameKey[] {
  return normalizeSelectedGameKeys(games).filter(
    (game): game is GameKey => Boolean(GAMES[game]) && GAMES[game].mode === '1v1'
  );
}

function getWinRate(entry: Pick<LeaderboardEntry, 'wins' | 'losses'>): number {
  const totalMatches = entry.wins + entry.losses;

  if (totalMatches === 0) {
    return 0;
  }

  return Math.round((entry.wins / totalMatches) * 100);
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

  const fetchLeaderboard = useCallback(
    async (game: GameKey) => {
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
    },
    [authFetch]
  );

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

  return (
    <div className="page-container space-y-4">
      <div>
        <h1 className="text-[1.75rem] font-black tracking-normal text-[var(--text-primary)] sm:text-[2rem]">
          Leaderboard
        </h1>
      </div>

      <div className="card p-3 sm:p-4">
        <div className="mb-3">
          <p className="section-title">Pick a game</p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)] sm:text-[13px]">
            Only ranked games on your profile show up here.
          </p>
        </div>

        {availableGames.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible">
            {availableGames.map((game) => {
              const isSelected = selectedGame === game;

              return (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`flex-shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all sm:text-[13px] ${
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
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--border-color)] px-3 py-3 sm:px-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{GAMES[selectedGame].label}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Simple ranked table for current players.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="bg-[var(--surface-elevated)] text-[11px] uppercase tracking-[0.08em] text-[var(--text-soft)]">
                <tr>
                  <th className="px-3 py-3 font-semibold sm:px-4">Rank</th>
                  <th className="px-3 py-3 font-semibold">Player</th>
                  <th className="px-3 py-3 font-semibold">Rating</th>
                  <th className="px-3 py-3 font-semibold">Tier</th>
                  <th className="px-3 py-3 font-semibold">Matches</th>
                  <th className="px-3 py-3 font-semibold">W-L</th>
                  <th className="px-3 py-3 font-semibold">Win rate</th>
                  <th className="px-3 py-3 font-semibold">Tournaments</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border-color)]">
                {entries.map((entry) => {
                  const isMe = entry.id === user?.id;
                  const winRate = getWinRate(entry);

                  return (
                    <tr
                      key={entry.id}
                      className={isMe ? 'bg-[rgba(50,224,196,0.08)]' : 'bg-transparent'}
                    >
                      <td className="px-3 py-3 font-semibold text-[var(--text-primary)] sm:px-4">#{entry.rank}</td>
                      <td className="px-3 py-3 text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{entry.username}</span>
                          {isMe ? <span className="brand-chip px-1.5 py-0.5 text-[9px]">YOU</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">{entry.rating}</td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">{entry.division}</td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">{entry.matchesPlayed}</td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">
                        {entry.wins}-{entry.losses}
                      </td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">{winRate}%</td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">{entry.tournamentsWon}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
