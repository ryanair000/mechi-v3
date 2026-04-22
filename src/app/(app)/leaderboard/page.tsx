'use client';

import { useEffect, useState, useCallback } from 'react';
import { Crown, Trophy } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { ChallengePlayerButton } from '@/components/ChallengePlayerButton';
import { TierMedal } from '@/components/TierMedal';
import { GAMES, getConfiguredPlatformForGame } from '@/lib/config';
import { getRankDivision, withAlpha, TRACKED_RANKED_GAMES } from '@/lib/gamification';
import type { GameKey, PlatformKey } from '@/types';

interface LeaderboardEntry {
  id: string;
  username: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  rating: number;
  division: string;
  level: number;
  wins: number;
  losses: number;
}

const LOBBY_GAMES: GameKey[] = ['codm', 'pubgm', 'freefire', 'fortnite'];
const ALL_RANKED_GAMES: GameKey[] = TRACKED_RANKED_GAMES;

export default function LeaderboardPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [mode, setMode] = useState<'ranked' | 'lobby'>('ranked');
  const [selectedGame, setSelectedGame] = useState<GameKey>(ALL_RANKED_GAMES[0] ?? ('efootball' as GameKey));
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = useCallback(async (game: GameKey) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/users/leaderboard/${game}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard ?? []);
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (mode === 'ranked') {
      void fetchLeaderboard(selectedGame);
    }
  }, [selectedGame, mode, fetchLeaderboard]);

  const placements = ['1', '2', '3'];
  const isUserInList = entries.some((e) => e.id === user?.id);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-[var(--text-primary)]">Leaderboard</h1>
          {selectedGame && !loading && mode === 'ranked' && (
            <span className="brand-chip-coral px-2.5 py-1 text-[11px]">{entries.length} ranked</span>
          )}
        </div>
        {/* Mode toggle */}
        <div className="flex rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-0.5">
          <button
            onClick={() => setMode('ranked')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === 'ranked'
                ? 'bg-[var(--surface)] text-[var(--text-primary)]'
                : 'text-[var(--text-soft)]'
            }`}
          >
            Ranked
          </button>
          <button
            onClick={() => setMode('lobby')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === 'lobby'
                ? 'bg-[var(--surface)] text-[var(--text-primary)]'
                : 'text-[var(--text-soft)]'
            }`}
          >
            Lobby
          </button>
        </div>
      </div>

      {mode === 'ranked' ? (
        <>
          {/* Game tabs */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {ALL_RANKED_GAMES.map((game) => {
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

          {/* Column headers */}
          <div className="mb-2 hidden gap-3 px-3 py-1.5 text-[10px] font-semibold text-[var(--text-soft)] sm:grid sm:grid-cols-[2.5rem_1fr_6.5rem_4rem_5rem_5rem_4.5rem_7.5rem]">
            <div>Rank</div>
            <div>Player</div>
            <div className="text-right">Division</div>
            <div className="text-right">Lv.</div>
            <div className="text-right">Wins</div>
            <div className="text-right">Losses</div>
            <div className="text-right">Win rate</div>
            <div className="text-right">Action</div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-14 shimmer" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="card py-20 text-center text-[var(--text-soft)]">
              <Trophy size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-[var(--text-primary)]">No players yet</p>
              <p className="mt-1 text-xs">Be the first to compete in {GAMES[selectedGame]?.label ?? selectedGame}.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {entries.map((entry, index) => {
                  const division = getRankDivision(entry.rating);
                  const winRate =
                    entry.wins + entry.losses > 0
                      ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100)
                      : 0;
                  const isMe = entry.id === user?.id;
                  const isTopThree = index < 3;
                  const challengePlatform = getConfiguredPlatformForGame(
                    selectedGame,
                    entry.game_ids,
                    entry.platforms
                  );
                  const userHasGame = user?.selected_games?.includes(selectedGame);

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

                      <div className="hidden w-28 sm:block">
                        <div className="flex items-center justify-end gap-2">
                          <TierMedal rating={entry.rating} size="sm" />
                          <span
                            className="text-[13px] font-bold sm:text-sm"
                            style={{ color: division.color }}
                          >
                            {entry.division}
                          </span>
                        </div>
                      </div>
                      <div className="hidden w-16 text-right text-[13px] text-[var(--text-secondary)] sm:block">{entry.level}</div>
                      <div className="hidden w-20 text-right text-[13px] text-[var(--text-secondary)] sm:block">{entry.wins}</div>
                      <div className="hidden w-20 text-right text-[13px] text-[var(--text-secondary)] sm:block">{entry.losses}</div>
                      <div className="hidden w-[4.5rem] text-right text-[13px] text-[var(--text-secondary)] sm:block">{winRate}%</div>
                      <div className="hidden w-[7.5rem] justify-end sm:flex">
                        {!isMe && userHasGame && challengePlatform ? (
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

                      <div className="text-right sm:hidden">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <TierMedal rating={entry.rating} size="sm" />
                          <div className="text-[13px] font-bold" style={{ color: division.color }}>
                            {entry.division}
                          </div>
                        </div>
                        <div className="text-[9px] text-[var(--text-soft)]">Lv. {entry.level}</div>
                        {!isMe && userHasGame && challengePlatform ? (
                          <div className="mt-2">
                            <ChallengePlayerButton
                              opponentId={entry.id}
                              opponentUsername={entry.username}
                              game={selectedGame}
                              platform={challengePlatform}
                              label="Challenge"
                              className="btn-outline min-h-8 px-3 py-1.5 text-[11px]"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* "You" row if not in visible list */}
              {!loading && !isUserInList && entries.length > 0 && user && (
                <div className="mt-3 border-t border-[var(--border-color)] pt-3">
                  <div className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-soft)] px-3 py-2.5 border border-[var(--border-color)]">
                    <div className="w-7 flex-shrink-0 text-center">
                      <span className="text-[11px] text-[var(--text-soft)]">You</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-[var(--brand-teal)]">
                        {user?.username ?? 'You'}
                      </p>
                      <p className="text-[11px] text-[var(--text-soft)]">Not in top {entries.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="py-14 text-center">
          <p className="text-sm text-[var(--text-soft)]">Lobby rankings are coming soon.</p>
          <p className="mt-2 text-xs text-[var(--text-soft)]">Submit lobby results after each match to start climbing.</p>
        </div>
      )}
    </div>
  );
}
