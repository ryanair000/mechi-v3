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
            <p className="section-title">Rewards</p>
            <h1 className="mt-3 text-[1.5rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Keep RP, ChezaHub linking, and redemptions on one dedicated page.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              This page owns your reward balances, referral progress, active codes, and redemption flow.
              Your profile sharing and invite tools stay on the separate share page.
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
            <Link href="/share" className="btn-ghost">
              Open share
            </Link>
            <button
              type="button"
              onClick={() => void handleStartChezaHubLink()}
              disabled={linkingAccount || linkedToChezaHub}
              className={linkedToChezaHub ? 'btn-ghost' : 'btn-primary'}
            >
              {linkingAccount ? 'Opening ChezaHub...' : linkedToChezaHub ? 'ChezaHub linked' : 'Link ChezaHub'}
            </button>
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
              icon: Coins,
              title: 'Available RP',
              value: rewardBalances.available.toLocaleString(),
              copy: 'Ready to redeem right now.',
            },
            {
              icon: Clock3,
              title: 'Pending RP',
              value: rewardBalances.pending.toLocaleString(),
              copy: 'Waiting for order confirmation or vesting.',
            },
            {
              icon: Gift,
              title: 'Lifetime RP',
              value: rewardBalances.lifetime.toLocaleString(),
              copy: 'Total reward points earned so far.',
            },
            {
              icon: ShieldCheck,
              title: 'Qualified referrals',
              value: (rewardSummary?.referrals.qualified ?? 0).toLocaleString(),
              copy: `${(rewardSummary?.referrals.completed ?? 0).toLocaleString()} completed conversions.`,
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
                    Completed referrals
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {(rewardSummary?.referrals.completed ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    {(rewardSummary?.referrals.flagged ?? 0).toLocaleString()} flagged
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
                  href={CHEZAHUB_REWARD_CLAIM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  Open redeem portal
                  <ArrowUpRight size={14} />
                </a>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Reward codes are redeemable as codes, not wallet balance. Discount rewards are single-use,
                short-expiry, and capped at 25% of checkout coverage.
              </p>
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

          <div className="card p-5">
            <p className="section-title">Next Page</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Sharing lives separately now
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Your public profile card and invite distribution tools are still active on the dedicated share
              page. Use it when the goal is reach and matchmaking, and stay here for RP tracking.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/share" className="btn-primary">
                Open share
              </Link>
              <Link href="/profile/settings" className="btn-ghost">
                Improve profile
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Active Codes</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Use or claim the rewards you have already unlocked
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
                        : 'Claim this code from redeem.chezahub.co.ke to create your reward order. Physical rewards require dispatch or pickup details.'}
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
              <a href={CHEZAHUB_REWARD_CLAIM_URL} target="_blank" rel="noreferrer" className="btn-ghost">
                Redeem portal
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
                          href={reward.reward_type === 'reward_claim' ? CHEZAHUB_REWARD_CLAIM_URL : CHEZAHUB_BASE_URL}
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
                  No reward activity yet. Link ChezaHub, finish your first match of the day, or share from the
                  share page to start.
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
        </div>
      </section>
    </div>
  );
}
