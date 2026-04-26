'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { ArrowUpRight, RefreshCw, Search } from 'lucide-react';
import { InviteMenu } from '@/components/InviteMenu';
import { ShareMenu } from '@/components/ShareMenu';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, getGameRatingKey, normalizeSelectedGameKeys } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import {
  getMatchOgImageUrl,
  getMatchShareUrl,
  getProfileOgImageUrl,
  getProfileShareUrl,
  matchResultShareText,
  profileShareText,
} from '@/lib/share';
import type { GameKey } from '@/types';

type MatchResult = 'win' | 'loss' | 'draw' | 'cancelled';

type PublicProfileLookup = {
  username: string;
  location: string | null;
  platforms: string[] | null;
  selectedGames: string[] | null;
  bestRating: number;
  totalWins: number;
  totalLosses: number;
  gamesCount: number;
};

type PublicProfileLookupResponse = {
  error?: string;
  profile?: PublicProfileLookup;
};

type ShareProfile = Record<string, unknown> & {
  id: string;
  invite_code?: string | null;
  level?: number | null;
  selected_games?: GameKey[] | null;
  username: string;
};

type MatchHistoryEntry = {
  id: string;
  game: GameKey;
  opponent_username: string;
  result?: MatchResult;
  is_win: boolean;
  rating_change: number;
  completed_at: string;
  status: string;
};

function normalizeUsername(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '');
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getResolvedResult(match: MatchHistoryEntry): MatchResult {
  if (match.result) {
    return match.result;
  }

  if (match.status === 'cancelled') {
    return 'cancelled';
  }

  return match.is_win ? 'win' : 'loss';
}

function getResultLabel(result: MatchResult) {
  if (result === 'win') return 'Win';
  if (result === 'loss') return 'Loss';
  if (result === 'draw') return 'Draw';
  return 'Closed';
}

function getResultClass(result: MatchResult) {
  if (result === 'win') {
    return 'text-[var(--accent-secondary-text)]';
  }

  if (result === 'loss') {
    return 'text-[var(--brand-coral)]';
  }

  return 'text-[var(--text-secondary)]';
}

function getBestRating(profile: ShareProfile | null) {
  if (!profile) {
    return 1000;
  }

  const rankedGames = normalizeSelectedGameKeys((profile.selected_games as GameKey[]) ?? []);

  if (rankedGames.length === 0) {
    return 1000;
  }

  return rankedGames.reduce((best, game) => {
    const rating = (profile[getGameRatingKey(game)] as number) ?? 1000;
    return rating > best ? rating : best;
  }, 1000);
}

async function loadShareContext(
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
) {
  const [profileRes, matchHistoryRes] = await Promise.all([
    authFetch('/api/users/profile'),
    authFetch('/api/matches/history?limit=8'),
  ]);

  const profileData = profileRes.ok
    ? ((await profileRes.json()) as { profile?: ShareProfile })
    : null;
  const matchHistoryData = matchHistoryRes.ok
    ? ((await matchHistoryRes.json()) as { matches?: MatchHistoryEntry[] })
    : null;

  return {
    profile: profileData?.profile ?? null,
    matches: (matchHistoryData?.matches ?? []).filter((match) => match.status === 'completed'),
  };
}

export function SharePageClient() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRouting, startTransition] = useTransition();

  const submittedUsername = normalizeUsername(searchParams.get('username'));
  const [searchValue, setSearchValue] = useState(submittedUsername);
  const [lookup, setLookup] = useState<PublicProfileLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ShareProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setSearchValue(submittedUsername);
  }, [submittedUsername]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const next = await loadShareContext(authFetch);

      if (cancelled) {
        return;
      }

      setProfile(next.profile);
      setRecentMatches(next.matches);
      setLoading(false);
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    let cancelled = false;

    if (!submittedUsername) {
      setLookup(null);
      setLookupError(null);
      setLookupLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLookupLoading(true);
    setLookupError(null);

    void fetch(`/api/share/profile/${encodeURIComponent(submittedUsername)}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as PublicProfileLookupResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !data.profile) {
          setLookup(null);
          setLookupError(data.error ?? `No player found for "${submittedUsername}".`);
          return;
        }

        setLookup(data.profile);
      })
      .catch(() => {
        if (!cancelled) {
          setLookup(null);
          setLookupError('Could not load that player right now.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLookupLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [submittedUsername]);

  const handleLookupSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextUsername = normalizeUsername(searchValue);
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextUsername) {
      nextParams.set('username', nextUsername);
    } else {
      nextParams.delete('username');
    }

    startTransition(() => {
      const nextHref = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
      router.replace(nextHref, { scroll: false });
    });
  };

  const handleClearSearch = () => {
    setSearchValue('');
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const next = await loadShareContext(authFetch);
      setProfile(next.profile);
      setRecentMatches(next.matches);
    } finally {
      setRefreshing(false);
    }
  };

  const lookupRank = lookup ? getRankDivision(lookup.bestRating) : null;
  const lookupMatches = lookup ? lookup.totalWins + lookup.totalLosses : 0;
  const profileUsername = profile?.username ?? user?.username ?? '';
  const profileLevel = typeof profile?.level === 'number' ? profile.level : 1;
  const profileGames = normalizeSelectedGameKeys((profile?.selected_games as GameKey[]) ?? []);
  const profileBestRating = getBestRating(profile);
  const profileRank = getRankDivision(profileBestRating);
  const hasRankedProfile = profileGames.length > 0;

  return (
    <div className="page-container max-w-[70rem] space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="section-title">Share center</p>
          <h1 className="mt-2 text-[1.9rem] font-black leading-[1.02] text-[var(--text-primary)] sm:text-[2.8rem]">
            Public links that are ready to send.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Open your public player card, send a referral, or publish a completed match page from
            one clean surface.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={loading || refreshing}
          className="icon-button h-9 w-9 shrink-0"
          aria-label="Refresh share center"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
        <section className="card p-5">
          {loading ? (
            <div className="space-y-4">
              <div className="h-6 w-40 rounded shimmer" />
              <div className="h-4 w-56 rounded shimmer" />
              <div className="h-10 w-full rounded shimmer" />
              <div className="h-28 w-full rounded shimmer" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="section-title">Your public card</p>
                  <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    @{profileUsername}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {hasRankedProfile
                      ? `${profileRank.label} / Lv. ${profileLevel}. Open the public card or share it directly.`
                      : `Level ${profileLevel}. Your public card is ready even before ranked history builds up.`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="brand-chip px-2.5 py-1">
                      {hasRankedProfile ? profileRank.label : 'Public profile'}
                    </span>
                    <span className="brand-chip-coral px-2.5 py-1">
                      {profileGames.length === 1 ? '1 active title' : `${profileGames.length} active titles`}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/s/${encodeURIComponent(profileUsername)}`} className="btn-ghost">
                    Open card
                    <ArrowUpRight size={14} />
                  </Link>
                  <ShareMenu
                    title="My Mechi Profile"
                    text={profileShareText(
                      profileUsername,
                      hasRankedProfile ? profileRank.label : 'Player',
                      profileLevel
                    )}
                    url={getProfileShareUrl(profileUsername)}
                    imageUrl={getProfileOgImageUrl(profileUsername)}
                    imageFilename={`mechi-profile-${profileUsername}.png`}
                    variant="primary"
                  />
                  {profile?.invite_code ? (
                    <InviteMenu
                      inviteCode={profile.invite_code}
                      username={profileUsername}
                      variant="ghost"
                    />
                  ) : null}
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--border-color)] pt-5">
                <p className="section-title">Player lookup</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Sanity-check a public profile before you copy or send the link.
                </p>

                <form onSubmit={handleLookupSubmit} className="mt-4 flex flex-col gap-3">
                  <label className="block">
                    <span className="label">Username</span>
                    <div className="relative">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                      />
                      <input
                        type="text"
                        name="username"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="@playername"
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        enterKeyHint="search"
                        className="input pl-11"
                      />
                    </div>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-primary" disabled={isRouting}>
                      <Search size={14} />
                      {isRouting ? 'Searching...' : 'Search'}
                    </button>
                    {submittedUsername ? (
                      <button type="button" onClick={handleClearSearch} className="btn-ghost">
                        Clear
                      </button>
                    ) : (
                      <Link href="/leaderboard" className="btn-ghost">
                        Leaderboard
                      </Link>
                    )}
                  </div>
                </form>

                {submittedUsername ? (
                  lookupLoading ? (
                    <p className="mt-4 text-sm text-[var(--text-secondary)]">
                      Loading {submittedUsername}&apos;s public card...
                    </p>
                  ) : lookup && lookupRank ? (
                    <div className="mt-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black text-[var(--text-primary)]">
                              @{lookup.username}
                            </span>
                            <span
                              className="rounded-full px-2.5 py-1 text-xs font-black"
                              style={{
                                background: `${lookupRank.color}18`,
                                color: lookupRank.color,
                              }}
                            >
                              {lookupRank.label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                            {lookup.location || 'Location not set'} with {lookup.gamesCount}{' '}
                            {lookup.gamesCount === 1 ? 'active title' : 'active titles'} and a{' '}
                            {lookup.totalWins}-{lookup.totalLosses} tracked record.
                          </p>
                          <p className="mt-2 text-xs text-[var(--text-soft)]">
                            {lookup.bestRating} best rating ·{' '}
                            {lookupMatches > 0 ? `${lookupMatches} tracked matches` : 'No tracked matches yet'}
                          </p>
                        </div>

                        <Link href={`/s/${encodeURIComponent(lookup.username)}`} className="btn-ghost">
                          Open card
                          <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        No player found for &ldquo;{submittedUsername}&rdquo;
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        Double-check the spelling or open the leaderboard if you only know part of
                        the username.
                      </p>
                      {lookupError ? (
                        <p className="mt-2 text-xs font-semibold text-[var(--brand-coral)]">
                          {lookupError}
                        </p>
                      ) : null}
                    </div>
                  )
                ) : null}
              </div>
            </>
          )}
        </section>

        <section className="card overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
            <div>
              <p className="section-title">Match shares</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Completed matches that already have public pages.
              </p>
            </div>
            <span className="brand-chip px-2.5 py-1">{recentMatches.length}</span>
          </div>

          {loading ? (
            <div className="space-y-0 p-5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-20 rounded shimmer" />
              ))}
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="px-5 py-8">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No completed match links yet.
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Finish a match and the public share page will appear here automatically.
              </p>
            </div>
          ) : (
            <div>
              {recentMatches.map((match) => {
                const result = getResolvedResult(match);
                const gameLabel = GAMES[match.game]?.label ?? match.game;
                const winnerName =
                  result === 'loss' ? match.opponent_username : profileUsername;
                const loserName =
                  result === 'loss' ? profileUsername : match.opponent_username;
                const shareText =
                  result === 'draw'
                    ? `${profileUsername} and ${match.opponent_username} drew on ${gameLabel} on Mechi. Result confirmed.`
                    : matchResultShareText(winnerName, loserName, gameLabel);

                return (
                  <div
                    key={match.id}
                    className="flex flex-col gap-4 border-b border-[var(--border-color)] px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          {match.opponent_username}
                        </p>
                        <span className="brand-chip px-2 py-0.5 text-[10px]">{gameLabel}</span>
                        <span className={`text-xs font-semibold ${getResultClass(result)}`}>
                          {getResultLabel(result)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        Public result page for {getResultLabel(result).toLowerCase()} against{' '}
                        {match.opponent_username}.
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        {formatDate(match.completed_at)}
                        {match.rating_change !== 0
                          ? ` · ${match.rating_change > 0 ? '+' : ''}${match.rating_change} rating`
                          : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/s/match/${encodeURIComponent(match.id)}`} className="btn-ghost">
                        Open page
                        <ArrowUpRight size={14} />
                      </Link>
                      <ShareMenu
                        title={`${gameLabel} result on Mechi`}
                        text={shareText}
                        url={getMatchShareUrl(match.id)}
                        imageUrl={getMatchOgImageUrl(match.id)}
                        imageFilename={`mechi-match-${match.id}.png`}
                        variant="primary"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
