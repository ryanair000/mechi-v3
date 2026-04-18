'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Coins,
  Copy,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { InviteMenu } from '@/components/InviteMenu';
import { ShareMenu } from '@/components/ShareMenu';
import { getRankDivision } from '@/lib/gamification';
import {
  copyLink,
  getInvitePath,
  getInviteUrl,
  getProfileOgImageUrl,
  getProfileSharePath,
  getProfileShareStats,
  getProfileShareUrl,
  profileShareText,
} from '@/lib/share';

type ShareProfile = Record<string, unknown> & {
  invite_code?: string | null;
  level?: number;
  selected_games?: string[];
};

type RewardSummary = {
  linked: boolean;
  chezahub_user_id: string | null;
  chezahub_linked_at: string | null;
  balances: {
    available: number;
    pending: number;
    lifetime: number;
  };
  referrals: {
    invited: number;
    qualified: number;
    completed: number;
    flagged: number;
  };
  recent_activity: Array<{
    id: string;
    event_type: string;
    title: string;
    available_delta: number;
    pending_delta: number;
    created_at: string;
  }>;
  active_codes: Array<{
    id: string;
    reward_id: string;
    reward_type: 'discount_code' | 'reward_claim';
    title: string;
    code: string | null;
    points_cost: number;
    expires_at: string | null;
    status: 'issued' | 'claimed' | 'void' | 'reversed' | 'expired';
  }>;
};

type RewardCatalogItem = {
  id: string;
  title: string;
  description: string;
  reward_type: 'discount_code' | 'reward_claim';
  points_cost: number;
  phase: string;
  active: boolean;
  expires_in_hours?: number | null;
  discount_amount_kes?: number | null;
  max_order_coverage_percent?: number | null;
  sku_name?: string | null;
  margin_class?: string | null;
};

type WayToEarn = {
  id: string;
  title: string;
  description: string;
};

const CHEZAHUB_BASE_URL =
  process.env.NEXT_PUBLIC_CHEZAHUB_BASE_URL || 'https://chezahub.co.ke';
const CHEZAHUB_REWARDS_URL = `${CHEZAHUB_BASE_URL.replace(/\/$/, '')}/profile`;
const DAILY_SHARE_REWARD_POINTS = 25;

function formatRewardDate(value: string | null | undefined) {
  if (!value) {
    return 'No expiry';
  }

  try {
    return new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatSignedDelta(value: number) {
  if (value === 0) {
    return '0';
  }

  return value > 0 ? `+${value}` : `${value}`;
}

export default function SharePage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<ShareProfile | null>(null);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);
  const [rewardCatalog, setRewardCatalog] = useState<RewardCatalogItem[]>([]);
  const [waysToEarn, setWaysToEarn] = useState<WayToEarn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);

  const loadPageData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError(null);
      setRewardError(null);

      try {
        const profilePromise = authFetch('/api/users/profile').then(async (res) => {
          const data = (await res.json().catch(() => null)) as
            | { error?: string; profile?: ShareProfile }
            | null;

          if (!res.ok || !data?.profile) {
            throw new Error(data?.error ?? 'Could not load your share details right now.');
          }

          return data.profile;
        });

        const rewardSummaryPromise = authFetch('/api/rewards/summary').then(async (res) => {
          const data = (await res.json().catch(() => null)) as
            | { error?: string; summary?: RewardSummary; ways_to_earn?: WayToEarn[] }
            | null;

          if (!res.ok || !data?.summary) {
            throw new Error(data?.error ?? 'Could not load your rewards right now.');
          }

          return {
            summary: data.summary,
            waysToEarn: data.ways_to_earn ?? [],
          };
        });

        const rewardCatalogPromise = authFetch('/api/rewards/catalog').then(async (res) => {
          const data = (await res.json().catch(() => null)) as
            | { error?: string; items?: RewardCatalogItem[] }
            | null;

          if (!res.ok) {
            throw new Error(data?.error ?? 'Could not load the reward catalog right now.');
          }

          return data?.items ?? [];
        });

        const [profileResult, rewardSummaryResult, rewardCatalogResult] = await Promise.allSettled([
          profilePromise,
          rewardSummaryPromise,
          rewardCatalogPromise,
        ]);

        if (profileResult.status === 'rejected') {
          setLoadError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Could not load your share details right now.');
          return;
        }

        setProfile(profileResult.value);

        if (rewardSummaryResult.status === 'fulfilled') {
          setRewardSummary(rewardSummaryResult.value.summary);
          setWaysToEarn(rewardSummaryResult.value.waysToEarn);
        } else {
          setRewardSummary(null);
          setWaysToEarn([]);
          setRewardError(
            rewardSummaryResult.reason instanceof Error
              ? rewardSummaryResult.reason.message
              : 'Could not load your rewards right now.'
          );
        }

        if (rewardCatalogResult.status === 'fulfilled') {
          setRewardCatalog(rewardCatalogResult.value);
        } else {
          setRewardCatalog([]);
          setRewardError((current) =>
            current ??
            (rewardCatalogResult.reason instanceof Error
              ? rewardCatalogResult.reason.message
              : 'Could not load the reward catalog right now.')
          );
        }
      } catch {
        setLoadError('Could not load your share details right now.');
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

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const linkStatus = url.searchParams.get('chezahub_link');

    if (linkStatus === 'success') {
      toast.success('ChezaHub linked. Your affiliate rewards are now active.');
      url.searchParams.delete('chezahub_link');
      window.history.replaceState({}, '', url.toString());
      void loadPageData({ silent: true });
    }
  }, [loadPageData]);

  const recordShareAction = useCallback(
    async (action: string) => {
      try {
        const response = await authFetch('/api/rewards/share-action', {
          method: 'POST',
          body: JSON.stringify({ action }),
        });
        const data = (await response.json().catch(() => null)) as
          | { awarded?: boolean; error?: string }
          | null;

        if (!response.ok) {
          return;
        }

        if (data?.awarded) {
          toast.success(`Share recorded. +${DAILY_SHARE_REWARD_POINTS} RP added.`);
          void loadPageData({ silent: true });
        }
      } catch {
        // Best effort only.
      }
    },
    [authFetch, loadPageData]
  );

  const handleCopy = useCallback(
    async (value: string, successMessage: string, rewardAction?: string) => {
      const copied = await copyLink(value);

      if (copied) {
        toast.success(successMessage);
        if (rewardAction) {
          void recordShareAction(rewardAction);
        }
      } else {
        toast.error('Failed to copy');
      }
    },
    [recordShareAction]
  );

  const handleStartChezaHubLink = useCallback(async () => {
    setLinkingAccount(true);

    try {
      const response = await authFetch('/api/rewards/link/start', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; link_url?: string }
        | null;

      if (!response.ok || !data?.link_url) {
        toast.error(data?.error ?? 'Could not start the ChezaHub link right now.');
        return;
      }

      window.location.assign(data.link_url);
    } catch {
      toast.error('Could not start the ChezaHub link right now.');
    } finally {
      setLinkingAccount(false);
    }
  }, [authFetch]);

  const handleRedeemReward = useCallback(
    async (rewardId: string) => {
      setRedeemingRewardId(rewardId);

      try {
        const response = await authFetch('/api/rewards/redeem', {
          method: 'POST',
          body: JSON.stringify({ reward_id: rewardId }),
        });
        const data = (await response.json().catch(() => null)) as
          | {
              error?: string;
              redemption?: {
                code?: string | null;
                title: string;
              };
            }
          | null;

        if (!response.ok || !data?.redemption) {
          toast.error(data?.error ?? 'Could not redeem this reward right now.');
          return;
        }

        if (data.redemption.code) {
          await navigator.clipboard.writeText(data.redemption.code).catch(() => null);
          toast.success(`${data.redemption.title} is ready. The code has been copied.`);
        } else {
          toast.success(`${data.redemption.title} redeemed successfully.`);
        }

        void loadPageData({ silent: true });
      } catch {
        toast.error('Could not redeem this reward right now.');
      } finally {
        setRedeemingRewardId(null);
      }
    },
    [authFetch, loadPageData]
  );

  const username = user?.username ?? '';
  const shareSource =
    profile ?? ((user as unknown as ShareProfile | undefined) ?? ({} as ShareProfile));
  const shareStats = getProfileShareStats(shareSource);
  const strongestRank = getRankDivision(shareStats.bestRating);
  const totalMatches = shareStats.totalWins + shareStats.totalLosses;
  const level =
    typeof profile?.level === 'number'
      ? profile.level
      : typeof user?.level === 'number'
        ? user.level
        : 1;
  const inviteCode =
    typeof profile?.invite_code === 'string'
      ? profile.invite_code
      : user?.invite_code ?? null;
  const profileUrl = username ? getProfileShareUrl(username) : '';
  const profilePath = username ? getProfileSharePath(username) : '';
  const profileShareCopy = username
    ? profileShareText(username, strongestRank.label, level)
    : 'Show off your Mechi profile and bring the next match to you.';
  const inviteUrl = inviteCode ? getInviteUrl(inviteCode) : '';
  const invitePath = inviteCode ? getInvitePath(inviteCode) : '';
  const rewardBalances = rewardSummary?.balances ?? {
    available: 0,
    pending: 0,
    lifetime: 0,
  };
  const linkedToChezaHub = rewardSummary?.linked ?? false;

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-5">
          <div className="h-56 shimmer rounded-[1.6rem]" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
            <div className="h-80 shimmer rounded-[1.6rem]" />
            <div className="space-y-5">
              <div className="h-56 shimmer rounded-[1.6rem]" />
              <div className="h-48 shimmer rounded-[1.6rem]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Share + Rewards</p>
            <h1 className="mt-3 text-[1.5rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Make your profile discoverable, your invite useful, and your Mechi credit redeemable.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              This is now your affiliate hub. Share your public card, invite new players, link
              ChezaHub once, and turn Mechi reward points into real checkout codes for{' '}
              <a
                href={CHEZAHUB_BASE_URL}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[var(--text-primary)] underline decoration-[var(--brand-coral)] decoration-2 underline-offset-4"
              >
                chezahub.co.ke
              </a>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadPageData({ silent: true })}
              disabled={refreshing}
              className="btn-ghost"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link href="/profile" className="btn-ghost">
              Edit profile
            </Link>
            <button
              type="button"
              onClick={() => void handleStartChezaHubLink()}
              disabled={linkingAccount || linkedToChezaHub}
              className={linkedToChezaHub ? 'btn-ghost' : 'btn-primary'}
            >
              {linkingAccount ? 'Opening ChezaHub...' : linkedToChezaHub ? 'ChezaHub linked' : 'Link ChezaHub'}
            </button>
            {username ? (
              <ShareMenu
                text={profileShareCopy}
                url={profileUrl}
                title="My Mechi Profile"
                imageUrl={getProfileOgImageUrl(username)}
                imageFilename={`mechi-profile-${username}.png`}
                variant="primary"
                onShared={recordShareAction}
              />
            ) : null}
          </div>
        </div>

        {loadError ? (
          <div className="mt-5 rounded-[1.15rem] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => void loadPageData()}
                className="btn-outline border-red-400/30 text-red-50 hover:bg-red-500/10"
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        {rewardError ? (
          <div className="mt-5 rounded-[1.15rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p>{rewardError}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[
            {
              icon: Sparkles,
              title: 'Best rank',
              value: strongestRank.label,
              copy: `Best rating ${shareStats.bestRating}`,
            },
            {
              icon: Coins,
              title: 'Available RP',
              value: rewardBalances.available.toLocaleString(),
              copy: `${rewardBalances.pending.toLocaleString()} pending, ${rewardBalances.lifetime.toLocaleString()} lifetime.`,
            },
            {
              icon: ShieldCheck,
              title: 'ChezaHub link',
              value: linkedToChezaHub ? 'Linked' : 'Not linked',
              copy: linkedToChezaHub
                ? 'You can redeem reward codes on ChezaHub.'
                : 'Link once to unlock affiliate reward redemption.',
            },
            {
              icon: UserPlus,
              title: 'Invite mode',
              value: inviteCode ? 'Ready' : 'Missing',
              copy: inviteCode
                ? `${rewardSummary?.referrals.completed ?? 0} completed referral conversions so far.`
                : 'Invite code not found yet. Refresh after registration syncs.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
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

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Profile Share</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Your public challenge card
                </h2>
              </div>
              {username ? (
                <ShareMenu
                  text={profileShareCopy}
                  url={profileUrl}
                  title="My Mechi Profile"
                  imageUrl={getProfileOgImageUrl(username)}
                  imageFilename={`mechi-profile-${username}.png`}
                  variant="ghost"
                  onShared={recordShareAction}
                />
              ) : null}
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                What people will read
              </p>
              <p className="mt-3 text-lg font-black leading-8 text-[var(--text-primary)]">
                {profileShareCopy}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Strongest rank
                  </p>
                  <p className="mt-2 text-base font-black text-[var(--text-primary)]">
                    {strongestRank.label}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Level
                  </p>
                  <p className="mt-2 text-base font-black text-[var(--text-primary)]">Lv. {level}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Record
                  </p>
                  <p className="mt-2 text-base font-black text-[var(--text-primary)]">
                    {shareStats.totalWins}-{shareStats.totalLosses}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    {totalMatches > 0 ? `${totalMatches} tracked matches` : 'No tracked matches yet'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="text-sm font-black text-[var(--text-primary)]">Public profile</p>
                <p className="mt-2 break-all text-sm leading-6 text-[var(--text-secondary)]">
                  {profileUrl || 'Profile link unavailable right now.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopy(profileUrl, 'Profile link copied', 'profile_link_copy')}
                    disabled={!profileUrl}
                    className="btn-ghost"
                  >
                    <Copy size={14} />
                    Copy link
                  </button>
                  {profilePath ? (
                    <Link href={profilePath} className="btn-primary">
                      Open public page
                      <ArrowUpRight size={14} />
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">Invite link</p>
                    <p className="mt-2 break-all text-sm leading-6 text-[var(--text-secondary)]">
                      {inviteUrl || 'Invite link unavailable right now.'}
                    </p>
                  </div>
                  {inviteCode && username ? (
                    <InviteMenu inviteCode={inviteCode} username={username} onShared={recordShareAction} />
                  ) : (
                    <span className="brand-chip-coral px-3 py-1">Invite unavailable</span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCopy(inviteUrl, 'Invite link copied', 'invite_link_copy')}
                    disabled={!inviteUrl}
                    className="btn-ghost"
                  >
                    <Copy size={14} />
                    Copy invite
                  </button>
                  {invitePath ? (
                    <Link href={invitePath} className="btn-ghost">
                      Open invite page
                      <ArrowUpRight size={14} />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Ways To Earn</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Points come from milestones, not raw MP
                </h2>
              </div>
              <span className="brand-chip-coral px-3 py-1">Margin protected</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {waysToEarn.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">ChezaHub Link</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  One account link unlocks redemption
                </h2>
              </div>
              {linkedToChezaHub ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 size={14} />
                  Linked
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-200">
                  <Clock3 size={14} />
                  Pending link
                </span>
              )}
            </div>

            <div className="mt-4 rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Available
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {rewardBalances.available.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">Ready to redeem</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Pending
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {rewardBalances.pending.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">Waiting for order confirmation</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Qualified referrals
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {(rewardSummary?.referrals.qualified ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    {(rewardSummary?.referrals.completed ?? 0).toLocaleString()} completed
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleStartChezaHubLink()}
                  disabled={linkedToChezaHub || linkingAccount}
                  className={linkedToChezaHub ? 'btn-ghost' : 'btn-primary'}
                >
                  {linkingAccount ? 'Opening ChezaHub...' : linkedToChezaHub ? 'Already linked' : 'Link ChezaHub now'}
                </button>
                <a
                  href={CHEZAHUB_BASE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  Open ChezaHub
                  <ArrowUpRight size={14} />
                </a>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Reward codes are redeemable as codes, not wallet balance. Discount rewards are single-use,
                short-expiry, and capped at 25% of checkout coverage.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[var(--text-primary)]">Active codes</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Discount codes go in checkout. Reward claim codes go in ChezaHub Profile &gt; Rewards.
                    Physical rewards may ask for dispatch or pickup details.
                  </p>
                </div>
              </div>

              {(rewardSummary?.active_codes ?? []).length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                  No active codes yet. Redeem a reward below and it will appear here immediately.
                </div>
              ) : (
                rewardSummary?.active_codes.map((code) => (
                  <div
                    key={code.id}
                    className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)]">{code.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          {code.reward_type === 'discount_code' ? 'Discount reward code' : 'Reward claim code'}
                        </p>
                      </div>
                      <span className="brand-chip-coral px-3 py-1">{code.points_cost.toLocaleString()} RP</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <code className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm font-black text-[var(--text-primary)]">
                        {code.code ?? 'Issued'}
                      </code>
                      {code.code ? (
                        <button
                          type="button"
                          onClick={() => void handleCopy(code.code ?? '', 'Reward code copied')}
                          className="btn-ghost"
                        >
                          <Copy size={14} />
                          Copy code
                        </button>
                      ) : null}
                    </div>

                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      {code.reward_type === 'discount_code'
                        ? 'Apply this code in the ChezaHub cart promo field.'
                        : 'Claim this code from ChezaHub Profile > Rewards to create your reward order. Physical rewards require dispatch or pickup details.'}
                    </p>

                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Expires: {formatRewardDate(code.expires_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Reward Catalog</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Fixed-value rewards, not open-ended wallet credit
                </h2>
              </div>
              <a href={CHEZAHUB_BASE_URL} target="_blank" rel="noreferrer" className="btn-ghost">
                ChezaHub store
                <ArrowUpRight size={14} />
              </a>
            </div>

            <div className="mt-4 space-y-3">
              {rewardCatalog.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                  Reward catalog unavailable right now.
                </div>
              ) : (
                rewardCatalog.map((reward) => {
                  const canRedeem = linkedToChezaHub && rewardBalances.available >= reward.points_cost;

                  return (
                    <div
                      key={reward.id}
                      className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-[80%]">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-[var(--text-primary)]">{reward.title}</p>
                            <span className="rounded-full border border-[var(--border-color)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                              {reward.reward_type === 'discount_code' ? 'Code' : 'Claim'}
                            </span>
                            <span className="rounded-full border border-[var(--border-color)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                              {reward.phase}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                            {reward.description}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--text-soft)]">
                            {typeof reward.discount_amount_kes === 'number' ? (
                              <span className="rounded-full border border-[var(--border-color)] px-2 py-1">
                                KES {reward.discount_amount_kes.toLocaleString()} off
                              </span>
                            ) : null}
                            {reward.reward_type === 'discount_code' && typeof reward.max_order_coverage_percent === 'number' ? (
                              <span className="rounded-full border border-[var(--border-color)] px-2 py-1">
                                Max {reward.max_order_coverage_percent}% of basket
                              </span>
                            ) : null}
                            {reward.sku_name ? (
                              <span className="rounded-full border border-[var(--border-color)] px-2 py-1">
                                {reward.sku_name}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-black text-[var(--text-primary)]">
                            {reward.points_cost.toLocaleString()}
                          </p>
                          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">RP</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void handleRedeemReward(reward.id)}
                          disabled={!canRedeem || redeemingRewardId === reward.id}
                          className={canRedeem ? 'btn-primary' : 'btn-ghost'}
                        >
                          {redeemingRewardId === reward.id
                            ? 'Generating code...'
                            : !linkedToChezaHub
                              ? 'Link ChezaHub first'
                              : rewardBalances.available < reward.points_cost
                                ? 'Not enough RP'
                                : 'Redeem reward'}
                        </button>
                        <a
                          href={reward.reward_type === 'reward_claim' ? CHEZAHUB_REWARDS_URL : CHEZAHUB_BASE_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost"
                        >
                          {reward.reward_type === 'reward_claim' ? 'Open rewards' : 'Open store'}
                          <ArrowUpRight size={14} />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Recent Activity</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Recent reward ledger events
                </h2>
              </div>
              <span className="brand-chip-coral px-3 py-1">Immutable log</span>
            </div>

            <div className="mt-4 space-y-3">
              {(rewardSummary?.recent_activity ?? []).length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                  No reward activity yet. Link ChezaHub, finish your first match of the day, or share from this page to start.
                </div>
              ) : (
                rewardSummary?.recent_activity.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)]">{event.title}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {formatRewardDate(event.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          {formatSignedDelta(event.available_delta)} available
                        </p>
                        {event.pending_delta !== 0 ? (
                          <p className="mt-1 text-xs text-[var(--text-soft)]">
                            {formatSignedDelta(event.pending_delta)} pending
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title">Best Uses</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Share with intent
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Drop your public profile when you want someone to size up your rank, games, and recent
                record before challenging you.
              </p>
              <p>
                Use the invite link in WhatsApp groups when the goal is getting more players into Mechi
                and more qualified buyers into ChezaHub.
              </p>
              <p>
                Keep your profile complete first. Full profile setup, daily matches, streaks, and qualified
                referrals are what move your redeemable RP balance.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/profile#settings" className="btn-primary">
                Improve profile
              </Link>
              <Link href="/leaderboard" className="btn-ghost">
                Find opponents
              </Link>
              <a href={CHEZAHUB_BASE_URL} target="_blank" rel="noreferrer" className="btn-ghost">
                Open ChezaHub
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
