'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { ArrowUpRight, Search, Sparkles, Users } from 'lucide-react';
import { getRankDivision } from '@/lib/gamification';

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

function normalizeUsername(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '');
}

export function SharePageClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRouting, startTransition] = useTransition();

  const submittedUsername = normalizeUsername(searchParams.get('username'));
  const [searchValue, setSearchValue] = useState(submittedUsername);
  const [lookup, setLookup] = useState<PublicProfileLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    setSearchValue(submittedUsername);
  }, [submittedUsername]);

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

  const lookupRank = lookup ? getRankDivision(lookup.bestRating) : null;
  const lookupMatches = lookup ? lookup.totalWins + lookup.totalLosses : 0;

  return (
    <div className="page-container max-w-[58rem] space-y-7">
      <div className="space-y-3">
        <p className="section-title">Friends</p>
        <div className="max-w-3xl">
          <h1 className="text-[1.8rem] font-black leading-[1.02] text-[var(--text-primary)] sm:text-[2.55rem]">
            Search friends and open public cards fast.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Use an exact username to verify a profile before you queue, challenge, or share it.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="max-w-2xl">
          <p className="section-title">Find a player</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Use the exact username when you want to sanity-check a public card before you challenge,
            queue, or share it.
          </p>
        </div>

        <form onSubmit={handleLookupSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
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
            <div className="rounded-[1.65rem] border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-5">
              <p className="text-sm text-[var(--text-secondary)]">Loading {submittedUsername}&apos;s card...</p>
            </div>
          ) : lookup && lookupRank ? (
            <div className="rounded-[1.65rem] border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-5 sm:px-5">
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
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-soft)]">
                    <span>{lookup.bestRating} best rating</span>
                    <span>&bull;</span>
                    <span>
                      {lookupMatches > 0 ? `${lookupMatches} tracked matches` : 'No tracked matches yet'}
                    </span>
                    <span>&bull;</span>
                    <span>{(lookup.platforms ?? []).length} platforms listed</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/s/${encodeURIComponent(lookup.username)}`} className="btn-primary">
                    Open profile
                    <ArrowUpRight size={14} />
                  </Link>
                  <Link href="/leaderboard" className="btn-ghost">
                    Browse leaderboard
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.65rem] border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--text-primary)]">
                    No player found for &ldquo;{submittedUsername}&rdquo;
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Double-check the spelling or open the leaderboard if you only know part of the
                    username.
                  </p>
                  {lookupError ? (
                    <p className="mt-2 text-xs font-semibold text-[var(--brand-coral)]">
                      {lookupError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-start gap-3 rounded-[1.65rem] border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]">
              <Users size={16} />
            </div>
            <div>
              <p className="text-sm font-black text-[var(--text-primary)]">Search for a friend</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Enter an exact username to jump straight to a public card, or open the leaderboard
                if you want to browse first.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
