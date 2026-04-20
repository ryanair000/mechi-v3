'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Crown, Trophy } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { ChallengePlayerButton } from '@/components/ChallengePlayerButton';
import { TierMedal } from '@/components/TierMedal';
import { GAMES, getConfiguredPlatformForGame, normalizeSelectedGameKeys } from '@/lib/config';
import { getRankDivision, withAlpha } from '@/lib/gamification';
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
  if (entry.wins + entry.losses === 0) {
    return 0;
  }

  return Math.round((entry.wins / (entry.wins + entry.losses)) * 100);
}

function formatTournamentWins(value: number): string {
  return `${value} tournament${value === 1 ? '' : 's'} won`;
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

  const tierProgression = [
    { name: 'Bronze', range: '0-1099', rating: 1000 },
    { name: 'Silver', range: '1100-1299', rating: 1150 },
    { name: 'Gold', range: '1300-1499', rating: 1350 },
    { name: 'Platinum', range: '1500-1699', rating: 1550 },
    { name: 'Diamond', range: '1700-1899', rating: 1750 },
    { name: 'Legend', range: '1900+', rating: 1900 },
  ] as const;

  const tierCounts = entries.reduce<Record<string, number>>((counts, entry) => {
    const { tier } = getRankDivision(entry.rating);
    counts[tier] = (counts[tier] ?? 0) + 1;
    return counts;
  }, {});

  const podiumEntries = entries.slice(0, 3);
  const remainingEntries = entries.slice(3);

  return (
    <>
      <div className="page-container">
        <div className="card circuit-panel mb-4 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
              <Trophy size={15} />
            </div>
            <div>
              <h1 className="text-[1.75rem] font-black tracking-normal text-[var(--text-primary)] sm:text-[2rem]">
                Leaderboard
              </h1>
              <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)] sm:text-[13px]">
                Track the ladder, compare match volume, and see who is winning tournaments.
              </p>
            </div>
          </div>
        </div>

        <div className="card mb-4 p-3 sm:p-4">
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
          <div className="space-y-5">
            <div className="card overflow-hidden p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="section-title">Rank ladder</p>
                  <p className="mt-1 max-w-xl text-[12px] leading-5 text-[var(--text-secondary)] sm:text-[13px]">
                    A tighter view of each rating band from Bronze to Legend.
                  </p>
                </div>
                <div className="brand-chip self-start px-2 py-1 text-[10px] sm:self-auto">
                  <span>6 tiers live</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                {tierProgression.map((tier) => {
                  const division = getRankDivision(tier.rating);
                  const count = tierCounts[tier.name] ?? 0;

                  return (
                    <div
                      key={tier.name}
                      className="rounded-xl border p-2.5"
                      style={{
                        borderColor: withAlpha(division.color, '28'),
                        backgroundColor: withAlpha(division.color, '0D'),
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TierMedal rating={tier.rating} size="sm" />
                          <div>
                            <p className="text-xs font-bold text-[var(--text-primary)]">{tier.name}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">{tier.range}</p>
                          </div>
                        </div>
                        {count > 0 ? (
                          <span
                            className="inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                            style={{
                              color: division.color,
                              backgroundColor: withAlpha(division.color, '18'),
                            }}
                          >
                            {count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="px-1">
                <p className="section-title">Podium</p>
                <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)] sm:text-[13px]">
                  Current leaders with position, matches played, and tournaments won.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {podiumEntries.map((entry) => {
                  const division = getRankDivision(entry.rating);
                  const isMe = entry.id === user?.id;
                  const challengePlatform = getConfiguredPlatformForGame(
                    selectedGame,
                    entry.game_ids,
                    entry.platforms
                  );
                  const isFirstPlace = entry.rank === 1;

                  return (
                    <div
                      key={entry.id}
                      className={`card relative flex h-full flex-col overflow-hidden p-4 sm:p-5 ${
                        isMe ? 'surface-live' : ''
                      }`}
                      style={{
                        borderColor: withAlpha(division.color, '28'),
                        background: isMe
                          ? `linear-gradient(180deg, ${withAlpha(division.color, '10')}, ${withAlpha(
                              division.color,
                              '06'
                            )}), var(--success-soft)`
                          : `linear-gradient(180deg, ${withAlpha(division.color, '08')}, var(--surface))`,
                        boxShadow: isFirstPlace
                          ? `0 0 0 2px ${withAlpha(division.color, '40')}, 0 20px 46px ${withAlpha(
                              division.color,
                              '18'
                            )}`
                          : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black"
                              style={{
                                color: division.color,
                                backgroundColor: withAlpha(division.color, '18'),
                              }}
                            >
                              Position #{entry.rank}
                            </span>
                            {isMe ? <span className="brand-chip px-1.5 py-0.5 text-[9px]">YOU</span> : null}
                            {isFirstPlace ? (
                              <Crown size={14} className="flex-shrink-0 text-[var(--brand-coral)]" />
                            ) : null}
                          </div>
                          <p
                            className={`mt-3 truncate text-lg font-black ${
                              isMe ? 'text-[var(--brand-teal)]' : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {entry.username}
                          </p>
                          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                            {entry.matchesPlayed} matches played / {formatTournamentWins(entry.tournamentsWon)}
                          </p>
                        </div>

                        <TierMedal rating={entry.rating} size="md" />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                            Matches played
                          </p>
                          <p className="mt-1 text-lg font-black text-[var(--text-primary)]">
                            {entry.matchesPlayed}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                            Tournaments won
                          </p>
                          <p className="mt-1 text-lg font-black text-[var(--text-primary)]">
                            {entry.tournamentsWon}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-4">
                        {!isMe && challengePlatform ? (
                          <ChallengePlayerButton
                            opponentId={entry.id}
                            opponentUsername={entry.username}
                            game={selectedGame}
                            platform={challengePlatform}
                            label="Challenge"
                            className="btn-outline min-h-10 w-full justify-center px-3 py-2 text-xs"
                          />
                        ) : (
                          <div className="h-10" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {remainingEntries.length > 0 ? (
              <div className="space-y-2">
                <div className="px-1">
                  <p className="section-title">Ranked list</p>
                  <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)] sm:text-[13px]">
                    The rest of the ladder with position, match volume, and tournament wins.
                  </p>
                </div>

                <div className="mb-2 hidden gap-3 px-3 py-1.5 text-[10px] font-semibold text-[var(--text-soft)] sm:grid sm:grid-cols-[4.5rem_1fr_6rem_6rem_4rem_4.5rem_4.5rem_5.5rem_7.5rem]">
                  <div>Position</div>
                  <div>Player</div>
                  <div className="text-right">Tournaments</div>
                  <div className="text-right">Matches</div>
                  <div className="text-right">Lv.</div>
                  <div className="text-right">Wins</div>
                  <div className="text-right">Losses</div>
                  <div className="text-right">Win rate</div>
                  <div className="text-right">Action</div>
                </div>

                <div className="space-y-1.5">
                  {remainingEntries.map((entry, index) => {
                    const winRate = getWinRate(entry);
                    const isMe = entry.id === user?.id;
                    const challengePlatform = getConfiguredPlatformForGame(
                      selectedGame,
                      entry.game_ids,
                      entry.platforms
                    );

                    return (
                      <div
                        key={entry.id}
                        className={`animate-fade-in-up flex translate-y-1 flex-col gap-3 rounded-xl px-3 py-3 opacity-0 transition-all sm:grid sm:grid-cols-[4.5rem_1fr_6rem_6rem_4rem_4.5rem_4.5rem_5.5rem_7.5rem] sm:items-center sm:gap-3 ${
                          isMe ? 'surface-live' : 'card hover:bg-[var(--surface)]'
                        }`}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="text-[12px] font-medium text-[var(--text-soft)] sm:text-[13px]">
                          Position #{entry.rank}
                        </div>

                        <div className="flex min-w-0 items-center gap-2.5">
                          <TierMedal rating={entry.rating} size="sm" />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p
                                className={`truncate text-[13px] font-medium sm:text-sm ${
                                  isMe ? 'text-[var(--brand-teal)]' : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {entry.username}
                              </p>
                              {isMe ? <span className="brand-chip px-1.5 py-0.5 text-[9px]">YOU</span> : null}
                            </div>
                            <p className="mt-0.5 text-[11px] text-[var(--text-soft)] sm:hidden">
                              {entry.matchesPlayed} matches / {formatTournamentWins(entry.tournamentsWon)} / {winRate}%
                              {' '}WR
                            </p>
                          </div>
                        </div>

                        <div className="hidden text-right text-[13px] text-[var(--text-secondary)] sm:block">
                          {entry.tournamentsWon}
                        </div>
                        <div className="hidden text-right text-[13px] text-[var(--text-secondary)] sm:block">
                          {entry.matchesPlayed}
                        </div>
                        <div className="hidden text-right text-[13px] text-[var(--text-secondary)] sm:block">
                          {entry.level}
                        </div>
                        <div className="hidden text-right text-[13px] text-[var(--text-secondary)] sm:block">
                          {entry.wins}
                        </div>
                        <div className="hidden text-right text-[13px] text-[var(--text-secondary)] sm:block">
                          {entry.losses}
                        </div>
                        <div className="hidden text-right text-[13px] text-[var(--text-secondary)] sm:block">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                              <div
                                className="h-full rounded-full bg-[var(--brand-teal)]"
                                style={{ width: `${winRate}%` }}
                              />
                            </div>
                            <span>{winRate}%</span>
                          </div>
                        </div>
                        <div className="hidden justify-end sm:flex">
                          {!isMe && challengePlatform ? (
                            <ChallengePlayerButton
                              opponentId={entry.id}
                              opponentUsername={entry.username}
                              game={selectedGame}
                              platform={challengePlatform}
                              label="Challenge"
                              className="btn-outline min-h-9 px-3 py-2 text-xs"
                            />
                          ) : null}
                        </div>

                        <div className="sm:hidden">
                          {!isMe && challengePlatform ? (
                            <ChallengePlayerButton
                              opponentId={entry.id}
                              opponentUsername={entry.username}
                              game={selectedGame}
                              platform={challengePlatform}
                              label="Challenge"
                              className="btn-outline min-h-8 w-full justify-center px-3 py-1.5 text-[11px]"
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes leaderboard-fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(0.25rem);
          }

          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: leaderboard-fade-in-up 200ms ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in-up {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}
