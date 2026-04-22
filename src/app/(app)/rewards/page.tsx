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
  Ticket,
  Wallet,
  Zap,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { RewardCatalogItem, RewardSummary, RewardWayToEarn } from '@/types/rewards';

const CHEZAHUB_REDEEM_URL =
  process.env.NEXT_PUBLIC_CHEZAHUB_REDEEM_URL || 'https://redeem.chezahub.co.ke';
const CHEZAHUB_BASE_URL =
  process.env.NEXT_PUBLIC_CHEZAHUB_BASE_URL || 'https://chezahub.co.ke';

function formatVoucherCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

function formatRewardDate(value: string | null | undefined) {
  if (!value) return 'No expiry';
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
  return value === 0 ? '0' : value > 0 ? `+${value}` : `${value}`;
}

function hoursUntil(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${mins}m left`;
  return `${hours}h ${mins}m left`;
}

export default function RedeemPage() {
  const authFetch = useAuthFetch();
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);
  const [rewardCatalog, setRewardCatalog] = useState<RewardCatalogItem[]>([]);
  const [waysToEarn, setWaysToEarn] = useState<RewardWayToEarn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPageData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);

      try {
        const [summaryRes, catalogRes] = await Promise.allSettled([
          authFetch('/api/rewards/summary').then(async (r) => {
            const d = (await r.json().catch(() => null)) as
              | { error?: string; summary?: RewardSummary; ways_to_earn?: RewardWayToEarn[] }
              | null;
            if (!r.ok || !d?.summary) throw new Error(d?.error ?? 'Could not load your rewards.');
            return { summary: d.summary, waysToEarn: d.ways_to_earn ?? [] };
          }),
          authFetch('/api/rewards/catalog').then(async (r) => {
            const d = (await r.json().catch(() => null)) as
              | { error?: string; items?: RewardCatalogItem[] }
              | null;
            if (!r.ok) throw new Error(d?.error ?? 'Could not load voucher catalog.');
            return d?.items ?? [];
          }),
        ]);

        if (summaryRes.status === 'rejected') {
          setLoadError(
            summaryRes.reason instanceof Error ? summaryRes.reason.message : 'Could not load rewards.'
          );
          setRewardSummary(null);
          setWaysToEarn([]);
        } else {
          setRewardSummary(summaryRes.value.summary);
          setWaysToEarn(summaryRes.value.waysToEarn);
        }

        if (catalogRes.status === 'fulfilled') {
          setRewardCatalog(catalogRes.value);
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

  const handleCopy = useCallback(async (value: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(msg);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const handleRedeem = useCallback(
    async (rewardId: string) => {
      setRedeemingRewardId(rewardId);
      try {
        const response = await authFetch('/api/rewards/redeem', {
          method: 'POST',
          body: JSON.stringify({ reward_id: rewardId }),
        });
        const data = (await response.json().catch(() => null)) as
          | { error?: string; redemption?: { code?: string | null; title: string } }
          | null;

        if (!response.ok || !data?.redemption) {
          toast.error(data?.error ?? 'Could not redeem right now.');
          return;
        }

        if (data.redemption.code) {
          await navigator.clipboard.writeText(data.redemption.code).catch(() => null);
          toast.success('Voucher generated and copied to clipboard.');
        } else {
          toast.success(`${data.redemption.title} redeemed.`);
        }
        void loadPageData({ silent: true });
      } catch {
        toast.error('Could not redeem right now.');
      } finally {
        setRedeemingRewardId(null);
      }
    },
    [authFetch, loadPageData]
  );

  const balances = rewardSummary?.balances ?? { available: 0, pending: 0, lifetime: 0 };
  const activeCodes = rewardSummary?.active_codes ?? [];

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-5">
          <div className="h-52 shimmer rounded-[1.6rem]" />
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="h-80 shimmer rounded-[1.6rem]" />
            <div className="space-y-5">
              <div className="h-52 shimmer rounded-[1.6rem]" />
              <div className="h-44 shimmer rounded-[1.6rem]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* ── Hero ── */}
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Redeem</p>
            <h1 className="mt-3 text-[1.5rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Turn your RP into ChezaHub wallet credit
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              100 RP = KES 10. Pick a tier, get a 12-character voucher, and redeem it at{' '}
              <a
                href={CHEZAHUB_REDEEM_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-secondary-text)] hover:underline"
              >
                redeem.chezahub.co.ke
              </a>{' '}
              to load credit onto your ChezaHub wallet. Vouchers expire in 48 hours.
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
              Share &amp; earn
            </Link>
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

        {/* Balance row */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]">
                <Coins size={16} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Available RP
                </p>
                <p className="mt-1.5 text-2xl font-black text-[var(--text-primary)]">
                  {balances.available.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Ready to redeem</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.12)] text-[var(--brand-coral)]">
                <Clock3 size={16} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Pending RP
                </p>
                <p className="mt-1.5 text-2xl font-black text-[var(--text-primary)]">
                  {balances.pending.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Waiting for confirmation</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(168,85,247,0.12)] text-purple-400">
                <Gift size={16} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Lifetime RP
                </p>
                <p className="mt-1.5 text-2xl font-black text-[var(--text-primary)]">
                  {balances.lifetime.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Total earned</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* Voucher tiers */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Get a Voucher</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Choose how much credit to redeem
                </h2>
              </div>
              <span className="brand-chip-coral px-3 py-1">100 RP = KES 10</span>
            </div>

            <div className="mt-4 space-y-3">
              {rewardCatalog.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                  Voucher tiers unavailable right now.
                </div>
              ) : (
                rewardCatalog.map((tier) => {
                  const canAfford = balances.available >= tier.points_cost;
                  const isRedeeming = redeemingRewardId === tier.id;

                  return (
                    <div
                      key={tier.id}
                      className="rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)]">
                            <Wallet size={18} className="text-[var(--accent-secondary-text)]" />
                          </div>
                          <div>
                            <p className="text-base font-black text-[var(--text-primary)]">
                              KES {(tier.value_kes ?? 0).toLocaleString()}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                              {tier.points_cost.toLocaleString()} RP · 48 hr validity
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleRedeem(tier.id)}
                          disabled={!canAfford || isRedeeming}
                          className={canAfford ? 'btn-primary shrink-0' : 'btn-ghost shrink-0'}
                        >
                          {isRedeeming
                            ? 'Generating...'
                            : !canAfford
                              ? 'Not enough RP'
                              : 'Redeem'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* How to use */}
          <div className="card p-5">
            <p className="section-title">How to Use</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              From RP to ChezaHub wallet in 3 steps
            </h2>

            <div className="mt-4 space-y-3">
              {[
                {
                  icon: Ticket,
                  step: '1',
                  title: 'Redeem for a voucher',
                  body: 'Pick a tier above. A 12-character code is generated instantly and deducted from your RP.',
                },
                {
                  icon: Wallet,
                  step: '2',
                  title: 'Get a ChezaHub wallet',
                  body: (
                    <>
                      Create or log in to your wallet at{' '}
                      <a
                        href={CHEZAHUB_BASE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent-secondary-text)] hover:underline"
                      >
                        chezahub.co.ke
                      </a>
                      {' '}if you haven't already.
                    </>
                  ),
                },
                {
                  icon: CheckCircle2,
                  step: '3',
                  title: 'Redeem at ChezaHub',
                  body: (
                    <>
                      Enter your code at{' '}
                      <a
                        href={CHEZAHUB_REDEEM_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent-secondary-text)] hover:underline"
                      >
                        redeem.chezahub.co.ke
                      </a>
                      . Credits are added to your wallet immediately.
                    </>
                  ),
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-4 rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]">
                    <item.icon size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <a
                href={CHEZAHUB_REDEEM_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                Open redeem portal
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">

          {/* Active vouchers */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Your Vouchers</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Active codes ready to redeem
                </h2>
              </div>
              <a href={CHEZAHUB_REDEEM_URL} target="_blank" rel="noreferrer" className="btn-ghost">
                Redeem portal
                <ArrowUpRight size={14} />
              </a>
            </div>

            <div className="mt-4 space-y-3">
              {activeCodes.length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-center text-sm text-[var(--text-secondary)]">
                  <Gift size={24} className="mx-auto mb-3 text-[var(--text-soft)]" />
                  No active vouchers. Redeem a tier on the left to generate one.
                </div>
              ) : (
                activeCodes.map((code) => {
                  const displayCode = code.code
                    ? code.code.length === 12
                      ? formatVoucherCode(code.code)
                      : code.code
                    : null;
                  const timeLeft = hoursUntil(code.expires_at);
                  const isExpiringSoon =
                    code.expires_at
                      ? new Date(code.expires_at).getTime() - Date.now() < 2 * 60 * 60 * 1000
                      : false;

                  return (
                    <div
                      key={code.id}
                      className="rounded-[1.15rem] border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.04)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[var(--text-primary)]">
                            {code.title}
                          </p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
                            ChezaHub Wallet Credit
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isExpiringSoon
                              ? 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                              : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          <Clock3 size={11} />
                          {timeLeft}
                        </span>
                      </div>

                      {displayCode ? (
                        <div className="mt-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-2.5 text-center font-mono text-lg font-black tracking-[0.18em] text-[var(--accent-secondary-text)]">
                              {displayCode}
                            </code>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopy(code.code ?? '', 'Voucher code copied')
                              }
                              className="btn-ghost shrink-0"
                            >
                              <Copy size={14} />
                              Copy
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-3">
                        <a
                          href={CHEZAHUB_REDEEM_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary"
                        >
                          Redeem at ChezaHub
                          <ArrowUpRight size={14} />
                        </a>
                        <p className="self-center text-xs text-[var(--text-soft)]">
                          Expires: {formatRewardDate(code.expires_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ways to earn */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Earn RP</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  How to earn more reward points
                </h2>
              </div>
              <span className="brand-chip-coral px-3 py-1">Free to earn</span>
            </div>

            <div className="mt-4 grid gap-2.5 md:grid-cols-2">
              {waysToEarn.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5"
                >
                  <Zap size={14} className="mt-0.5 shrink-0 text-[var(--accent-secondary-text)]" />
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Recent Activity</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Reward point ledger
                </h2>
              </div>
              <span className="brand-chip-coral px-3 py-1">Immutable</span>
            </div>

            <div className="mt-4 space-y-2.5">
              {(rewardSummary?.recent_activity ?? []).length === 0 ? (
                <div className="rounded-[1.15rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
                  No activity yet. Play your first match or share from the share page to start earning.
                </div>
              ) : (
                rewardSummary?.recent_activity.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-3 rounded-[1.15rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-[var(--text-primary)]">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                        {formatRewardDate(event.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-black ${
                          event.available_delta > 0
                            ? 'text-emerald-400'
                            : event.available_delta < 0
                              ? 'text-red-400'
                              : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {formatSignedDelta(event.available_delta)} RP
                      </p>
                      {event.pending_delta !== 0 ? (
                        <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
                          {formatSignedDelta(event.pending_delta)} pending
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
