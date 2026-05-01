'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { Search, Trophy, UserSearch, X } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { ChallengePlayerButton } from '@/components/ChallengePlayerButton';
import { GAMES, PLATFORMS } from '@/lib/config';
import { formatLastSeen } from '@/lib/last-seen';
import type { ChallengeDiscoveryPlayer, GameKey, PlatformKey } from '@/types';

type ChallengePlayersResponse = {
  error?: string;
  platform?: PlatformKey;
  players?: ChallengeDiscoveryPlayer[];
};

type OpponentFinderModalProps = {
  open: boolean;
  availableGames: GameKey[];
  onClose: () => void;
  onChallengeSent: () => void | Promise<void>;
};

function PlayerInitial({ username }: { username: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] text-sm font-black text-[var(--brand-teal)]">
      {username[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function PlayerRowSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl shimmer" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded shimmer" />
          <div className="h-3 w-24 rounded shimmer" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="h-12 rounded-xl shimmer" />
        <div className="h-12 rounded-xl shimmer" />
        <div className="h-12 rounded-xl shimmer" />
      </div>
    </div>
  );
}

export function OpponentFinderModal({
  open,
  availableGames,
  onClose,
  onChallengeSent,
}: OpponentFinderModalProps) {
  const authFetch = useAuthFetch();
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(availableGames[0] ?? null);
  const [searchValue, setSearchValue] = useState('');
  const deferredSearchValue = useDeferredValue(searchValue.trim());
  const [players, setPlayers] = useState<ChallengeDiscoveryPlayer[]>([]);
  const [platform, setPlatform] = useState<PlatformKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!open) {
      setSearchValue('');
      setError(null);
      setPlayers([]);
      setPlatform(null);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !selectedGame) {
      return;
    }

    const activeGame = selectedGame;
    let cancelled = false;

    async function loadPlayers() {
      setLoading(true);
      setError(null);
      setPlayers([]);
      setPlatform(null);

      try {
        const params = new URLSearchParams({
          game: activeGame,
          limit: deferredSearchValue ? '8' : '6',
        });

        if (deferredSearchValue) {
          params.set('q', deferredSearchValue);
        }

        const response = await authFetch(`/api/challenges/players?${params.toString()}`);
        const payload = (await response.json()) as ChallengePlayersResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setError(payload.error ?? 'Could not load challenge players.');
          setPlayers([]);
          setPlatform(null);
          return;
        }

        setPlayers(payload.players ?? []);
        setPlatform(payload.platform ?? null);
      } catch {
        if (!cancelled) {
          setError('Could not load challenge players.');
          setPlayers([]);
          setPlatform(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlayers();

    return () => {
      cancelled = true;
    };
  }, [authFetch, deferredSearchValue, open, selectedGame]);

  if (!open) {
    return null;
  }

  const platformLabel = platform ? PLATFORMS[platform]?.label ?? platform.toUpperCase() : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Close opponent finder"
        className="absolute inset-0 bg-[rgba(11,17,33,0.76)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find opponent"
        className="card relative z-[1] flex w-full max-w-3xl flex-col overflow-hidden p-5 sm:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="icon-button absolute right-4 top-4 h-9 w-9"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="pr-10">
          <p className="section-title">Find opponent</p>
          <h2 className="mt-2 text-[1.4rem] font-black text-[var(--text-primary)] sm:text-[1.7rem]">
            Pick a game, browse a few players, or search by username.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Suggestions are ranked players on your configured platform, and the search bar looks up
            usernames with or without the @ sign.
          </p>
        </div>

        {availableGames.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Add a ranked game to your profile first.
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Mechi needs at least one 1-on-1 game with a platform before you can search for direct
              opponents.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/profile" className="btn-primary">
                Update profile
              </Link>
              <button type="button" onClick={onClose} className="btn-outline">
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Choose a game
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableGames.map((game) => {
                  const isSelected = selectedGame === game;

                  return (
                    <button
                      key={game}
                      type="button"
                      onClick={() => setSelectedGame(game)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                        isSelected
                          ? 'border-[rgba(255,107,107,0.28)] bg-[var(--brand-coral)] text-[var(--brand-night)] shadow-[0_10px_24px_rgba(255,107,107,0.2)]'
                          : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[rgba(50,224,196,0.22)] hover:text-[var(--text-primary)]'
                      }`}
                      aria-pressed={isSelected}
                    >
                      {GAMES[game].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <label className="block">
                <span className="label">Search by username</span>
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                  />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="@playername"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    className="input pl-11"
                  />
                </div>
              </label>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Lane
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {platformLabel ? `${GAMES[selectedGame ?? availableGames[0]].label} / ${platformLabel}` : 'Loading...'}
                </p>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {deferredSearchValue ? 'Search results' : 'Suggested players'}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {deferredSearchValue
                    ? 'Matches are ordered by exactness first, then rating and match volume.'
                    : 'These players are sorted by rank, then match volume.'}
                </p>
              </div>
              <span className="brand-chip px-2.5 py-1 text-[10px]">
                {players.length} shown
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <>
                  <PlayerRowSkeleton />
                  <PlayerRowSkeleton />
                  <PlayerRowSkeleton />
                </>
              ) : players.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.12)] text-[var(--brand-teal)]">
                    {deferredSearchValue ? <UserSearch size={18} /> : <Trophy size={18} />}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                    {deferredSearchValue
                      ? `No player found for "${deferredSearchValue}"`
                      : 'No challenge-ready players found yet'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {deferredSearchValue
                      ? 'Try a shorter username, remove the @ sign, or switch to another game.'
                      : 'Try another game or check back once more players have completed ranked matches on this lane.'}
                  </p>
                </div>
              ) : (
                players.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <PlayerInitial username={player.username} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                              {player.username}
                            </p>
                            <span className="rounded-full border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-secondary-text)]">
                              Lv {player.level}
                            </span>
                            <span className="rounded-full border border-[rgba(255,107,107,0.18)] bg-[rgba(255,107,107,0.08)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-coral)]">
                              {player.division}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {platformLabel ?? player.platform.toUpperCase()}
                            {player.region ? ` / ${player.region}` : ''}
                          </p>

                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                                Rating
                              </p>
                              <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                                {player.rating}
                              </p>
                            </div>
                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                                Matches
                              </p>
                              <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                                {player.matchesPlayed}
                              </p>
                            </div>
                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                                Last seen
                              </p>
                              <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                                {formatLastSeen(player.last_match_date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 md:w-40">
                        <ChallengePlayerButton
                          opponentId={player.id}
                          opponentUsername={player.username}
                          game={selectedGame ?? availableGames[0]}
                          platform={player.platform}
                          label="Challenge"
                          className="btn-primary min-h-10 w-full justify-center text-xs"
                          onSuccess={async () => {
                            await onChallengeSent();
                            onClose();
                          }}
                        />
                        <Link
                          href={`/s/${encodeURIComponent(player.username)}`}
                          className="btn-outline min-h-10 w-full justify-center text-xs"
                        >
                          View profile
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
