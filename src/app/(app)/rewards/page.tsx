'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { RewardSummary, RewardWayToEarn } from '@/types/rewards';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatKes(value: number) {
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function WalletOverview({ summary }: { summary: RewardSummary }) {
  return (
    <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div className="card border-[var(--accent-secondary)]/20 bg-[var(--accent-secondary)]/8 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          Mechi wallet
        </p>
        <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">
          KSh {formatKes(summary.wallet.available_kes)}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{summary.wallet.rate_label}</p>
      </div>

      {[
        {
          label: 'Available points',
          value: summary.balances.points_available.toLocaleString(),
          note: 'Ready to redeem',
        },
        {
          label: 'Pending points',
          value: summary.balances.pending.toLocaleString(),
          note: 'Waiting to clear',
        },
        {
          label: 'Lifetime points',
          value: summary.balances.lifetime.toLocaleString(),
          note: 'Total earned',
        },
      ].map((item) => (
        <div key={item.label} className="card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            {item.label}
          </p>
          <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">{item.value}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.note}</p>
        </div>
      ))}
    </div>
  );
}

function WaysToEarn({
  items,
  expanded,
  onToggle,
}: {
  items: RewardWayToEarn[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="space-y-5">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3">
        <div>
          <p className="text-lg font-black text-[var(--text-primary)]">Ways to earn</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Keep stacking points from matches, referrals, and daily activity.
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[var(--text-soft)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                </div>
                <span className="brand-chip shrink-0 px-2.5 py-1 text-[10px]">
                  +{item.rp_amount} RP
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ActivityLog({ items }: { items: RewardSummary['recent_activity'] }) {
  return (
    <section className="card p-5">
      <div>
        <p className="text-lg font-black text-[var(--text-primary)]">Recent activity</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Point gains and reversals land here as they happen.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--text-secondary)]">
          No wallet activity yet.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">{formatDateTime(item.created_at)}</p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-black ${
                    item.available_delta > 0
                      ? 'text-emerald-300'
                      : item.available_delta < 0
                        ? 'text-red-300'
                        : 'text-[var(--text-primary)]'
                  }`}
                >
                  {item.available_delta > 0 ? '+' : ''}
                  {item.available_delta.toLocaleString()}
                </p>
                {item.pending_delta !== 0 ? (
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    {item.pending_delta > 0 ? '+' : ''}
                    {item.pending_delta.toLocaleString()} pending
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="h-36 w-full rounded-3xl shimmer" />
      <div className="h-48 w-full rounded-3xl shimmer" />
      <div className="h-72 w-full rounded-3xl shimmer" />
    </div>
  );
}

export default function RewardsPage() {
  const authFetch = useAuthFetch();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waysExpanded, setWaysExpanded] = useState(true);

  const loadSummary = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await authFetch('/api/rewards/summary');
        const data = (await response.json()) as { error?: string; summary?: RewardSummary };

        if (!response.ok || !data.summary) {
          setError(data.error ?? 'Could not load rewards.');
          return;
        }

        setSummary(data.summary);
      } catch {
        setError('Could not load rewards.');
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
    void loadSummary();
  }, [loadSummary]);

  return (
    <div className="page-container max-w-[58rem] space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="brand-kicker">Rewards wallet</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Points in, wallet value out.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            Earn reward points across Mechi, then spend them on CODM, PUBG UC, and eFootball Coins
            redeemables without leaving the app.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadSummary({ silent: true })}
            disabled={loading || refreshing}
            className="icon-button h-10 w-10"
            aria-label="Refresh rewards"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : undefined} />
          </button>
          <Link href="/rewards/redeem" className="btn-primary text-sm">
            Open redeemables <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Skeleton />
      ) : summary ? (
        <>
          <WalletOverview summary={summary} />
          <WaysToEarn
            items={summary.ways_to_earn}
            expanded={waysExpanded}
            onToggle={() => setWaysExpanded((value) => !value)}
          />
          <ActivityLog items={summary.recent_activity} />
        </>
      ) : null}
    </div>
  );
}
