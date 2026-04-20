'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Coins,
  Copy,
  Gift,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { RewardCatalogItem, RewardSummary, RewardWayToEarn } from '@/types/rewards';

const CHEZAHUB_BASE_URL =
  process.env.NEXT_PUBLIC_CHEZAHUB_BASE_URL || 'https://chezahub.co.ke';
const CHEZAHUB_REDEEM_URL =
  process.env.NEXT_PUBLIC_CHEZAHUB_REDEEM_URL || 'https://redeem.chezahub.co.ke';
const CHEZAHUB_REWARD_CLAIM_URL = CHEZAHUB_REDEEM_URL.replace(/\/$/, '');

const WAY_TO_EARN_POINTS: Record<string, number> = {
  referral_main: 3000,
  invitee_starter: 500,
  account_link: 200,
  profile_completion: 200,
  streak_five: 150,
  streak_three: 75,
  first_match_of_day: 30,
  share_page_action: 25,
};

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

export default function RewardsPage() {
  const authFetch = useAuthFetch();
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);
  const [rewardCatalog, setRewardCatalog] = useState<RewardCatalogItem[]>([]);
  const [waysToEarn, setWaysToEarn] = useState<RewardWayToEarn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [showAllWaysToEarn, setShowAllWaysToEarn] = useState(false);

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
        const rewardSummaryPromise = authFetch('/api/rewards/summary').then(async (response) => {
          const data = (await response.json().catch(() => null)) as
            | { error?: string; summary?: RewardSummary; ways_to_earn?: RewardWayToEarn[] }
            | null;

          if (!response.ok || !data?.summary) {
            throw new Error(data?.error ?? 'Could not load your rewards right now.');
          }

          return {
            summary: data.summary,
            waysToEarn: data.ways_to_earn ?? [],
          };
        });

        const rewardCatalogPromise = authFetch('/api/rewards/catalog').then(async (response) => {
          const data = (await response.json().catch(() => null)) as
            | { error?: string; items?: RewardCatalogItem[] }
            | null;

          if (!response.ok) {
            throw new Error(data?.error ?? 'Could not load the reward catalog right now.');
          }

          return data?.items ?? [];
        });

        const [rewardSummaryResult, rewardCatalogResult] = await Promise.allSettled([
          rewardSummaryPromise,
          rewardCatalogPromise,
        ]);

        if (rewardSummaryResult.status === 'rejected') {
          setLoadError(
            rewardSummaryResult.reason instanceof Error
              ? rewardSummaryResult.reason.message
              : 'Could not load your rewards right now.'
          );
          setRewardSummary(null);
          setWaysToEarn([]);
        } else {
          setRewardSummary(rewardSummaryResult.value.summary);
          setWaysToEarn(rewardSummaryResult.value.waysToEarn);
        }

        if (rewardCatalogResult.status === 'fulfilled') {
          setRewardCatalog(rewardCatalogResult.value);
        } else {
          setRewardCatalog([]);
          setRewardError(
            rewardCatalogResult.reason instanceof Error
              ? rewardCatalogResult.reason.message
              : 'Could not load the reward catalog right now.'
          );
        }
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

  const handleCopy = useCallback(async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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

  const rewardBalances = rewardSummary?.balances ?? {
    available: 0,
    pending: 0,
    lifetime: 0,
  };
  const linkedToChezaHub = rewardSummary?.linked ?? false;
  const activeCodes = rewardSummary?.active_codes ?? [];
  const recentActivity = rewardSummary?.recent_activity ?? [];
  const sortedWaysToEarn = [...waysToEarn].sort(
    (left, right) => (WAY_TO_EARN_POINTS[right.id] ?? 0) - (WAY_TO_EARN_POINTS[left.id] ?? 0)
  );
  const visibleWaysToEarn = showAllWaysToEarn ? sortedWaysToEarn : sortedWaysToEarn.slice(0, 3);
  const hasMoreWaysToEarn = sortedWaysToEarn.length > 3;
  const redeemTargetId = activeCodes.length > 0 ? 'reward-active-codes' : 'reward-catalog';

  const heroStats = [
    {
      icon: Coins,
      label: 'Available RP',
      value: rewardBalances.available.toLocaleString(),
      copy: 'Ready to use now',
    },
    {
      icon: Clock3,
      label: 'Pending RP',
      value: rewardBalances.pending.toLocaleString(),
      copy: 'Still processing',
    },
    {
      icon: Gift,
      label: 'Active codes',
      value: activeCodes.length.toLocaleString(),
      copy: activeCodes.length > 0 ? 'Already unlocked' : 'Nothing live yet',
    },
    {
      icon: ShieldCheck,
      label: 'ChezaHub',
      value: linkedToChezaHub ? 'Connected' : 'Link needed',
      copy:
        linkedToChezaHub && rewardSummary?.chezahub_linked_at
          ? `Since ${formatRewardDate(rewardSummary.chezahub_linked_at)}`
          : linkedToChezaHub
            ? 'Redeem is live'
            : 'Link once to redeem',
    },
  ];

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-5">
          <div className="h-64 shimmer rounded-[1.6rem]" />
          <div className="h-72 shimmer rounded-[1.6rem]" />
          <div className="h-80 shimmer rounded-[1.6rem]" />
          <div className="h-64 shimmer rounded-[1.6rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="section-title hidden sm:block">Rewards</p>
          <button
            type="button"
            onClick={() => void loadPageData({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : undefined} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>

        <div className="mt-3 max-w-2xl">
          <h1 className="text-[1.35rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
            Track RP and redeem fast.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            See your balance, your active codes, and the next reward to cash out without digging
            through extra sections.
          </p>
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

        <div className="mt-6 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {heroStats.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
                    <item.icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm sm:leading-6">
                      {item.copy}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {linkedToChezaHub ? (
              <button
                type="button"
                onClick={() => scrollToSection(redeemTargetId)}
                className="btn-primary justify-center"
              >
                Redeem rewards
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleStartChezaHubLink()}
                disabled={linkingAccount}
                className="btn-primary justify-center"
              >
                {linkingAccount ? 'Opening ChezaHub...' : 'Link ChezaHub'}
              </button>
            )}

            <a
              href={CHEZAHUB_REWARD_CLAIM_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-outline justify-center"
            >
              Open redeem portal
              <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-soft)]">
            <span className="inline-flex items-center gap-2">
              {linkedToChezaHub ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
              {linkedToChezaHub
                ? 'ChezaHub is linked and ready.'
                : 'Link ChezaHub once to unlock redemptions.'}
            </span>
            <Link
              href="/share"
              className="font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              Need invite tools? Open Share
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-5 space-y-5">
        <section id="reward-active-codes" className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-title">Active Codes</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Use what you already unlocked
              </h2>
            </div>
            <a
              href={CHEZAHUB_REWARD_CLAIM_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              Redeem portal
              <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="mt-4 space-y-3">
            {activeCodes.length === 0 ? (
              <div className="rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                No active codes yet. Redeem a reward below and it will show up here.
              </div>
            ) : (
              activeCodes.map((code) => (
                <div
                  key={code.id}
                  className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[var(--text-primary)]">{code.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        {code.reward_type === 'discount_code' ? 'Discount code' : 'Reward claim code'}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      {code.points_cost.toLocaleString()} RP
                    </span>
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

                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    {code.reward_type === 'discount_code'
                      ? 'Use this in the ChezaHub cart promo field.'
                      : 'Use this in the redeem portal to create the reward order.'}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-soft)]">
                    Expires {formatRewardDate(code.expires_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section id="reward-catalog" className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-title">Reward Catalog</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Pick the next reward
              </h2>
            </div>
            <a href={CHEZAHUB_REWARD_CLAIM_URL} target="_blank" rel="noreferrer" className="btn-ghost">
              Open redeem portal
              <ArrowUpRight size={14} />
            </a>
          </div>

          {rewardError ? (
            <div className="mt-4 rounded-[1rem] border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
              {rewardError}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {rewardCatalog.length === 0 ? (
              <div className="rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                {rewardError
                  ? 'Try again later or use the redeem portal for live reward info.'
                  : 'No rewards are live right now.'}
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
                          {reward.reward_type === 'discount_code' &&
                          typeof reward.max_order_coverage_percent === 'number' ? (
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
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          RP
                        </p>
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
                        href={
                          reward.reward_type === 'reward_claim'
                            ? CHEZAHUB_REWARD_CLAIM_URL
                            : CHEZAHUB_BASE_URL
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost"
                      >
                        {reward.reward_type === 'reward_claim' ? 'Open redeem portal' : 'Open store'}
                        <ArrowUpRight size={14} />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-title">Recent Activity</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Latest reward moves
              </h2>
            </div>
            <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              Live log
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {recentActivity.length === 0 ? (
              <div className="rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                No reward activity yet. Link ChezaHub, finish matches, or share from the Share page
                to start.
              </div>
            ) : (
              recentActivity.map((event) => (
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
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-title">How To Earn RP</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Start with the biggest wins
              </h2>
            </div>
            {hasMoreWaysToEarn ? (
              <button
                type="button"
                onClick={() => setShowAllWaysToEarn((current) => !current)}
                className="btn-ghost"
              >
                {showAllWaysToEarn ? (
                  <>
                    Show less
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    Show all
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {visibleWaysToEarn.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                  <span className="rounded-full border border-[var(--border-color)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    +{(WAY_TO_EARN_POINTS[item.id] ?? 0).toLocaleString()} RP
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {sortedWaysToEarn.length === 0 ? (
            <div className="mt-4 rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
              Ways to earn will show up here when rewards data is available.
            </div>
          ) : !showAllWaysToEarn && hasMoreWaysToEarn ? (
            <p className="mt-4 text-xs text-[var(--text-soft)]">
              Showing the top 3 fastest RP wins first.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
