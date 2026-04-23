'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Link2,
  MessageCircle,
  Search,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { getRankDivision } from '@/lib/gamification';
import {
  canNativeShare,
  copyLink,
  getInviteUrl,
  getProfileShareUrl,
  inviteShareText,
  nativeShare,
  shareToWhatsApp,
} from '@/lib/share';
import type { RewardSummary } from '@/types/rewards';

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

type RewardSummaryResponse = {
  error?: string;
  summary?: RewardSummary;
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

function MetricCell({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="bg-[var(--surface-elevated)] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{note}</p>
    </div>
  );
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
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<PublicProfileLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const inviteCode = user?.invite_code ?? '';
  const inviteUrl = inviteCode ? getInviteUrl(inviteCode) : '';
  const profileUrl = user?.username ? getProfileShareUrl(user.username) : '';
  const shareText = inviteShareText(user?.username ?? 'A Mechi player');
  const shareReward =
    summary?.ways_to_earn.find((item) => item.id === 'share_page_action')?.rp_amount ?? 25;
  const affiliateReward = summary?.affiliate.rp_per_signup ?? 300;
  const nativeShareAvailable = canNativeShare();

  useEffect(() => {
    setSearchValue(submittedUsername);
  }, [submittedUsername]);

  const loadSummary = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setSummaryLoading(true);
      }
      setSummaryError(null);

      try {
        const response = await authFetch('/api/rewards/summary');
        const data = (await response.json().catch(() => ({}))) as RewardSummaryResponse;

        if (!response.ok || !data.summary) {
          setSummaryError(data.error ?? 'Could not load share stats.');
          return;
        }

        setSummary(data.summary);
      } catch {
        setSummaryError('Could not load share stats.');
      } finally {
        if (!silent) {
          setSummaryLoading(false);
        }
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

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

  const recordShareAction = useCallback(
    async (action: string) => {
      try {
        const response = await authFetch('/api/rewards/share-action', {
          method: 'POST',
          body: JSON.stringify({ action }),
        });
        const data = (await response.json().catch(() => ({}))) as { awarded?: boolean };

        if (response.ok && data.awarded) {
          void loadSummary({ silent: true });
          toast.success(`+${shareReward} RP added`);
        }
      } catch {
        // Keep share actions resilient even if reward tracking fails.
      }
    },
    [authFetch, loadSummary, shareReward]
  );

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

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) {
      toast.error('Invite link is not ready yet.');
      return;
    }

    const copied = await copyLink(inviteUrl);
    if (!copied) {
      toast.error('Could not copy the invite link.');
      return;
    }

    toast.success('Invite link copied');
    await recordShareAction('invite_copy');
  };

  const handleCopyInviteCode = async () => {
    if (!inviteCode) {
      toast.error('Invite code is not ready yet.');
      return;
    }

    const copied = await copyLink(inviteCode);
    if (!copied) {
      toast.error('Could not copy the invite code.');
      return;
    }

    toast.success('Invite code copied');
    await recordShareAction('invite_code_copy');
  };

  const handleInviteWhatsApp = () => {
    if (!inviteUrl) {
      toast.error('Invite link is not ready yet.');
      return;
    }

    shareToWhatsApp(shareText, inviteUrl);
    void recordShareAction('invite_whatsapp');
  };

  const handleInviteNativeShare = async () => {
    if (!inviteUrl) {
      toast.error('Invite link is not ready yet.');
      return;
    }

    const shared = await nativeShare({
      title: `${user?.username ?? 'Mechi'} invite`,
      text: shareText,
      url: inviteUrl,
    });

    if (shared) {
      await recordShareAction('invite_native');
    }
  };

  const handleCopyProfileLink = async () => {
    if (!profileUrl) {
      toast.error('Profile link is not ready yet.');
      return;
    }

    const copied = await copyLink(profileUrl);
    if (!copied) {
      toast.error('Could not copy the profile link.');
      return;
    }

    toast.success('Profile link copied');
    await recordShareAction('profile_copy');
  };

  const lookupRank = lookup ? getRankDivision(lookup.bestRating) : null;
  const lookupMatches = lookup ? lookup.totalWins + lookup.totalLosses : 0;

  return (
    <div className="page-container max-w-[58rem] space-y-7">
      <div className="space-y-3">
        <p className="section-title">Share</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[1.8rem] font-black leading-[1.02] text-[var(--text-primary)] sm:text-[2.55rem]">
              Your link, your affiliate code, one clean place to share.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Invite new players, earn RP the moment your code gets used, and keep player lookup in
              reach when you want to verify someone&apos;s public card fast.
            </p>
          </div>

          {summary ? (
            <span className="brand-chip w-fit px-3 py-1.5">
              {summary.balances.available.toLocaleString()} RP available
            </span>
          ) : null}
        </div>
      </div>

      <section className="card overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="brand-chip px-3 py-1">Affiliate</span>
            <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              Invite code <span className="ml-1 font-black text-[var(--text-primary)]">{inviteCode || '--'}</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              Earn +{affiliateReward} RP per signup
            </span>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-[1.45rem] font-black leading-tight text-[var(--text-primary)] sm:text-[1.75rem]">
              When someone finishes signup with your code, the affiliate RP lands immediately.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Share your invite link when you want a brand-new player to join Mechi. Share your
              public profile when someone already has an account and just needs your card.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Invite link
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Best for new players. Their signup counts against your affiliate total.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleCopyInviteLink()} className="btn-primary">
                    <Copy size={14} />
                    Copy link
                  </button>
                  <button type="button" onClick={handleInviteWhatsApp} className="btn-ghost">
                    <MessageCircle size={14} />
                    WhatsApp
                  </button>
                  {nativeShareAvailable ? (
                    <button type="button" onClick={() => void handleInviteNativeShare()} className="btn-ghost">
                      <Share2 size={14} />
                      Share
                    </button>
                  ) : null}
                  <button type="button" onClick={() => void handleCopyInviteCode()} className="btn-ghost">
                    <Link2 size={14} />
                    Copy code
                  </button>
                </div>
              </div>
              <p className="break-all text-sm font-medium text-[var(--text-primary)]">
                {inviteUrl || 'Your invite link is syncing.'}
              </p>
            </div>

            <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Public profile
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Best for players who already know you and just need your Mechi card.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleCopyProfileLink()} className="btn-ghost">
                    <Copy size={14} />
                    Copy profile
                  </button>
                  {profileUrl ? (
                    <Link href={profileUrl} target="_blank" className="btn-ghost">
                      <ExternalLink size={14} />
                      Open card
                    </Link>
                  ) : null}
                </div>
              </div>
              <p className="break-all text-sm font-medium text-[var(--text-primary)]">
                {profileUrl || 'Your public profile link is syncing.'}
              </p>
            </div>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[1.65rem] border border-[var(--border-color)] bg-[var(--border-color)] sm:grid-cols-4">
            <MetricCell
              label="Affiliate signups"
              value={
                summaryLoading
                  ? '...'
                  : String(summary?.affiliate.signups ?? 0)
              }
              note="Invite-code signups credited to you"
            />
            <MetricCell
              label="Affiliate RP"
              value={
                summaryLoading
                  ? '...'
                  : `${(summary?.affiliate.rp_earned ?? 0).toLocaleString()}`
              }
              note="Total RP from invite-code use"
            />
            <MetricCell
              label="Qualified orders"
              value={
                summaryLoading
                  ? '...'
                  : String(summary?.affiliate.qualified ?? 0)
              }
              note="Invitees who later hit partner thresholds"
            />
            <MetricCell
              label="Completed orders"
              value={
                summaryLoading
                  ? '...'
                  : String(summary?.affiliate.completed ?? 0)
              }
              note="Qualified referrals fully completed"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-soft)]">
            <span>Verified share actions can still grant +{shareReward} RP once per day.</span>
            {summaryError ? (
              <span className="text-[var(--brand-coral)]">{summaryError}</span>
            ) : null}
          </div>
        </div>
      </section>

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
              <p className="text-sm font-black text-[var(--text-primary)]">Keep lookup secondary</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                The main job here is sharing your own links. Player lookup stays lighter so you can
                still jump to someone&apos;s public card without turning this page into a directory.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
