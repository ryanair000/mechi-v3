'use client';

import Link from 'next/link';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BellRing,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Swords,
  TimerReset,
  X,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { ChallengePlayerButton } from '@/components/ChallengePlayerButton';
import { ChallengesPanel } from '@/components/ChallengesPanel';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import { TierMedal } from '@/components/TierMedal';
import {
  GAMES,
  PLATFORMS,
  getConfiguredPlatformForGame,
  normalizeSelectedGameKeys,
} from '@/lib/config';
import { getRankDivision, withAlpha } from '@/lib/gamification';
import type { GameKey, MatchChallenge, PlatformKey } from '@/types';

interface DiscoverablePlayer {
  rank: number;
  id: string;
  username: string;
  region: string | null;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  rating: number;
  division: string;
  level: number;
  wins: number;
  losses: number;
  matchesPlayed?: number;
  tournamentsWon?: number;
}

function filterRankedGames(games: readonly string[] = []): GameKey[] {
  return normalizeSelectedGameKeys(games).filter(
    (game): game is GameKey => Boolean(GAMES[game]) && GAMES[game].mode === '1v1'
  );
}

export default function ChallengesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const fallbackGames = filterRankedGames(user?.selected_games ?? []);
  const [inboundChallenges, setInboundChallenges] = useState<MatchChallenge[]>([]);
  const [outboundChallenges, setOutboundChallenges] = useState<MatchChallenge[]>([]);
  const [profileGames, setProfileGames] = useState<GameKey[] | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(fallbackGames[0] ?? null);
  const [playerDirectory, setPlayerDirectory] = useState<DiscoverablePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const leaderboardRequestRef = useRef(0);
  const availableGames = profileGames ?? fallbackGames;

  const loadChallenges = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError(null);

      try {
        const res = await authFetch('/api/challenges');
        const data = (await res.json()) as {
          error?: string;
          inbound?: MatchChallenge[];
          outbound?: MatchChallenge[];
        };

        if (!res.ok) {
          setLoadError(data.error ?? 'Could not load challenges right now.');
          return;
        }

        setInboundChallenges(data.inbound ?? []);
        setOutboundChallenges(data.outbound ?? []);
      } catch {
        setLoadError('Could not load challenges right now.');
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [authFetch]
  );

  const loadPlayerDirectory = useCallback(
    async (game: GameKey) => {
      const requestId = leaderboardRequestRef.current + 1;
      leaderboardRequestRef.current = requestId;

      setDirectoryLoading(true);
      setDirectoryError(null);

      try {
        const res = await authFetch(`/api/users/leaderboard/${game}`);
        const data = (await res.json()) as {
          error?: string;
          leaderboard?: DiscoverablePlayer[];
        };

        if (requestId !== leaderboardRequestRef.current) {
          return;
        }

        if (!res.ok) {
          setDirectoryError(data.error ?? 'Could not load players right now.');
          setPlayerDirectory([]);
          return;
        }

        setPlayerDirectory(data.leaderboard ?? []);
      } catch {
        if (requestId !== leaderboardRequestRef.current) {
          return;
        }

        setDirectoryError('Could not load players right now.');
        setPlayerDirectory([]);
      } finally {
        if (requestId === leaderboardRequestRef.current) {
          setDirectoryLoading(false);
        }
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

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
    setSearchQuery('');
  }, [selectedGame]);

  useEffect(() => {
    if (!selectedGame) {
      leaderboardRequestRef.current += 1;
      setPlayerDirectory([]);
      setDirectoryError(null);
      setDirectoryLoading(false);
      return;
    }

    void loadPlayerDirectory(selectedGame);
  }, [loadPlayerDirectory, selectedGame]);

  const handleChallengeAction = async (
    challengeId: string,
    action: 'accept' | 'decline' | 'cancel'
  ) => {
    setActionId(`${challengeId}:${action}`);

    try {
      const res = await authFetch(`/api/challenges/${challengeId}/${action}`, {
        method: 'POST',
      });
      const data = (await res.json()) as { error?: string; match_id?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not update challenge');
        return;
      }

      emitNotificationRefresh();
      await loadChallenges({ silent: true });

      if (action === 'accept' && data.match_id) {
        toast.success('Challenge accepted. Match is live.');
        router.push(`/match/${data.match_id}`);
        return;
      }

      if (action === 'decline') {
        toast.success('Challenge declined');
      } else if (action === 'cancel') {
        toast.success('Challenge cancelled');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionId(null);
    }
  };

  const totalChallenges = inboundChallenges.length + outboundChallenges.length;
  const filteredPlayers = playerDirectory.filter((entry) => {
    if (!deferredSearchQuery) {
      return true;
    }

    const matches = entry.matchesPlayed ?? entry.wins + entry.losses;
    const searchableText = [
      entry.rank,
      entry.username,
      entry.region ?? '',
      entry.division,
      `lv ${entry.level}`,
      `${matches} matches`,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(deferredSearchQuery);
  });

  return (
    <div className="page-container">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Challenges</p>
            <h1 className="mt-3 text-[1.5rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Every direct callout, one page.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Accept, decline, or cancel direct matches without digging through your wider inbox.
              This page keeps the head-to-head side of Mechi tight and easy to track.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadChallenges({ silent: true })}
              disabled={loading || refreshing}
              className="btn-ghost"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <a href="#player-search" className="btn-ghost">
              Search players
              <ArrowRight size={14} />
            </a>
            <Link href="/notifications" className="btn-primary">
              Open inbox
              <BellRing size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Swords,
              title: 'Incoming',
              value: loading ? '...' : String(inboundChallenges.length),
              copy: inboundChallenges.length
                ? 'Players waiting on your answer right now.'
                : 'No unanswered callouts are sitting on you.',
            },
            {
              icon: TimerReset,
              title: 'Sent',
              value: loading ? '...' : String(outboundChallenges.length),
              copy: outboundChallenges.length
                ? 'Live requests you can still cancel before they expire.'
                : 'You do not have any outbound challenges pending.',
            },
            {
              icon: ShieldCheck,
              title: 'Live',
              value: loading ? '...' : String(totalChallenges),
              copy: totalChallenges
                ? 'Everything active is visible here.'
                : 'Search the player list below to start one.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.copy}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="player-search" className="mt-5 card p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Find Players</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)] sm:text-[1.55rem]">
              Search and challenge from this page.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Pick one of your ranked games, search by username or location, then send the callout
              directly. These players are sorted by rank, then match volume.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {selectedGame ? (
              <span className="brand-chip-coral px-2.5 py-1 text-[11px]">
                <Swords size={11} />
                <span>{GAMES[selectedGame].label}</span>
              </span>
            ) : null}
            <span className="brand-chip px-3 py-1">
              {directoryLoading ? '...' : `${filteredPlayers.length} shown`}
            </span>
          </div>
        </div>

        {availableGames.length ? (
          <>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible">
              {availableGames.map((game) => {
                const isSelected = selectedGame === game;

                return (
                  <button
                    key={game}
                    type="button"
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

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={
                    selectedGame
                      ? `Search ${GAMES[selectedGame].label} players by username, location, or rank`
                      : 'Search players'
                  }
                  className="min-h-12 w-full rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-11 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-soft)] focus:border-[rgba(50,224,196,0.34)] focus:bg-[var(--surface)]"
                  aria-label="Search players"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-soft)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </label>

              <p className="text-xs leading-5 text-[var(--text-soft)]">
                Search by username, town, level, or rank lane without leaving Challenges.
              </p>
            </div>

            {directoryError ? (
              <div className="mt-4 rounded-[1rem] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>{directoryError}</p>
                  {selectedGame ? (
                    <button
                      type="button"
                      onClick={() => void loadPlayerDirectory(selectedGame)}
                      className="btn-outline border-red-400/30 text-red-50 hover:bg-red-500/10"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {directoryLoading ? (
                <>
                  <div className="h-44 shimmer" />
                  <div className="h-44 shimmer" />
                  <div className="h-44 shimmer" />
                </>
              ) : filteredPlayers.length === 0 ? (
                <div className="rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-sm text-[var(--text-secondary)]">
                  {searchQuery.trim()
                    ? `No players matched "${searchQuery.trim()}".`
                    : selectedGame
                      ? `No players are ranked in ${GAMES[selectedGame].label} yet.`
                      : 'No ranked players available right now.'}
                </div>
              ) : (
                filteredPlayers.map((entry) => {
                  const matches = entry.matchesPlayed ?? entry.wins + entry.losses;
                  const winRate = matches
                    ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100)
                    : 0;
                  const isMe = entry.id === user?.id;
                  const division = getRankDivision(entry.rating);
                  const challengePlatform = selectedGame
                    ? getConfiguredPlatformForGame(selectedGame, entry.game_ids, entry.platforms)
                    : null;
                  const locationCopy = [
                    challengePlatform ? PLATFORMS[challengePlatform].label : null,
                    entry.region ?? 'Location not set',
                  ]
                    .filter(Boolean)
                    .join(' / ');

                  return (
                    <article
                      key={entry.id}
                      className={`rounded-[1.35rem] border p-4 sm:p-5 ${
                        isMe
                          ? 'surface-live border-[rgba(50,224,196,0.24)]'
                          : 'border-[var(--border-color)] bg-[var(--surface-elevated)]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-4">
                          <div
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.2rem] border text-lg font-black"
                            style={{
                              color: division.color,
                              backgroundColor: withAlpha(division.color, '14'),
                              borderColor: withAlpha(division.color, '30'),
                            }}
                          >
                            {entry.username[0]?.toUpperCase() ?? '?'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-lg font-black text-[var(--text-primary)]">
                                {entry.username}
                              </p>
                              {isMe ? (
                                <span className="brand-chip px-2.5 py-1 text-[10px]">You</span>
                              ) : null}
                              <span
                                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                                style={{
                                  color: division.color,
                                  borderColor: withAlpha(division.color, '30'),
                                  backgroundColor: withAlpha(division.color, '14'),
                                }}
                              >
                                {entry.division}
                              </span>
                              <span className="brand-chip px-2.5 py-1 text-[10px]">
                                Lv {entry.level}
                              </span>
                            </div>

                            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                              <MapPin size={13} className="text-[var(--text-soft)]" />
                              {locationCopy}
                            </p>

                            {selectedGame ? (
                              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                                #{entry.rank} on {GAMES[selectedGame].label}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 xl:justify-end">
                          {!isMe && selectedGame && challengePlatform ? (
                            <ChallengePlayerButton
                              opponentId={entry.id}
                              opponentUsername={entry.username}
                              game={selectedGame}
                              platform={challengePlatform}
                              label="Challenge"
                              className="btn-primary min-h-11 px-5"
                            />
                          ) : null}

                          <Link
                            href={isMe ? '/profile' : `/s/${encodeURIComponent(entry.username)}`}
                            className="btn-ghost min-h-11 px-5"
                          >
                            {isMe ? 'Open profile' : 'View profile'}
                          </Link>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                            Rating
                          </p>
                          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                            {entry.rating}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                            Current {entry.division} ladder score
                          </p>
                        </div>

                        <div className="rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                            Matches
                          </p>
                          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                            {matches}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                            {matches ? `${entry.wins}W / ${entry.losses}L recorded` : 'No matches yet'}
                          </p>
                        </div>

                        <div className="rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                            Win Rate
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <TierMedal rating={entry.rating} size="sm" />
                            <p className="text-2xl font-black text-[var(--text-primary)]">
                              {matches ? `${winRate}%` : '--'}
                            </p>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                            {matches ? 'Based on ranked results' : 'Waiting on first result'}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        ) : profileLoading ? (
          <div className="mt-5 space-y-3">
            <div className="h-11 shimmer" />
            <div className="h-44 shimmer" />
          </div>
        ) : (
          <div className="mt-5 rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No ranked games on your profile yet
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Save at least one 1v1 game in your profile and the player search will show up here.
            </p>
            <Link href="/profile/settings" className="btn-outline mt-4">
              Update profile
            </Link>
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="space-y-5">
          {loadError ? (
            <div className="rounded-[1.2rem] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => void loadChallenges()}
                  className="btn-outline border-red-400/30 text-red-50 hover:bg-red-500/10"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          <ChallengesPanel
            inboundChallenges={inboundChallenges}
            outboundChallenges={outboundChallenges}
            loading={loading}
            actionId={actionId}
            onAction={handleChallengeAction}
            emptyCopy="No pending direct challenges yet. Search the player list above or use a public profile to call someone out."
          />
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <p className="section-title">How It Works</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Fast decisions, less inbox noise.
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Accepting a challenge creates the match immediately and moves you straight into score
                reporting.
              </p>
              <p>
                Declining clears the request cleanly, and cancelling your own request stops the other
                player from waiting on a dead invite.
              </p>
              <p>
                Expiring requests disappear automatically, so this list only holds decisions that still
                matter.
              </p>
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title">Next Move</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Keep discovery on this page.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Use the player search above when you want a direct opponent fast, then open your share
              page if you want to bring the callout outside Mechi.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <a href="#player-search" className="btn-primary">
                Search players
                <ArrowRight size={14} />
              </a>
              <Link href="/share" className="btn-ghost">
                Open share page
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
