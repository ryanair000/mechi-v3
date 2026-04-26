'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { RewardSummary, RewardWayToEarn } from '@/types/rewards';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function BalanceRow({
  balances,
}: {
  balances: { available: number; pending: number; lifetime: number };
}) {
  return (
    <div className="mb-6 flex divide-x divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)]">
      {[
        { label: 'Available', value: balances.available, note: 'Ready to redeem' },
        { label: 'Pending', value: balances.pending, note: 'Awaiting vesting' },
        { label: 'Lifetime', value: balances.lifetime, note: 'Total earned' },
      ].map((item) => (
        <div key={item.label} className="flex-1 px-4 py-4 text-center">
          <p className="text-2xl font-black text-[var(--text-primary)]">
            {item.value.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            {item.label}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-soft)]">{item.note}</p>
        </div>
      ))}
    </div>
  );
}

function WaysToEarn({ items }: { items: RewardWayToEarn[] }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-[var(--text-soft)]">Ways to earn RP</span>
        <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-soft)]">
          {items.length}
        </span>
      </div>
      <div className="mt-1 border-t border-[var(--border-color)]">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start justify-between gap-4 py-3 ${
              index < items.length - 1 ? 'border-b border-[var(--border-color)]' : ''
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
              <p className="mt-0.5 text-xs text-[var(--text-soft)]">{item.description}</p>
            </div>
            <span className="brand-chip shrink-0 px-2 py-0.5 text-[10px]">
              +{item.rp_amount} RP
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityLog({
  events,
  expanded,
  onToggle,
}: {
  events: RewardSummary['recent_activity'];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 py-2 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-soft)]">Recent activity</span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-soft)]">
            {events.length}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--text-soft)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded ? (
        events.length === 0 ? (
          <div className="border-t border-[var(--border-color)] py-10 text-center">
            <p className="text-sm text-[var(--text-soft)]">No reward activity yet.</p>
            <Link
              href="/rewards/catalog"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-secondary-text)] hover:text-[var(--text-primary)]"
            >
              Browse the catalog <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="border-t border-[var(--border-color)]">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">{formatTime(event.created_at)}</p>
                </div>
                <div className="text-right">
                  {event.available_delta !== 0 && (
                    <p
                      className={`text-sm font-black ${
                        event.available_delta > 0 ? 'text-[var(--accent-secondary-text)]' : 'text-red-400'
                      }`}
                    >
                      {event.available_delta > 0 ? '+' : ''}
                      {event.available_delta.toLocaleString()}
                    </p>
                  )}
                  {event.pending_delta !== 0 && (
                    <p className="text-[11px] text-[var(--text-soft)]">
                      {event.pending_delta > 0 ? '+' : ''}
                      {event.pending_delta.toLocaleString()} pending
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="h-24 w-full rounded-2xl shimmer" />
      <div className="h-4 w-32 rounded shimmer" />
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3 border-b border-[var(--border-color)] py-3 last:border-0">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-44 rounded shimmer" />
            <div className="h-3 w-24 rounded shimmer" />
          </div>
          <div className="h-4 w-12 rounded shimmer" />
        </div>
      ))}
    </div>
  );
}

export default function RewardsPage() {
  const authFetch = useAuthFetch();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [waysToEarn, setWaysToEarn] = useState<RewardWayToEarn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activityExpanded, setActivityExpanded] = useState(false);

  const loadPageData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);

      try {
        const response = await authFetch('/api/rewards/summary');
        const data = (await response.json()) as {
          error?: string;
          summary?: RewardSummary;
          ways_to_earn?: RewardWayToEarn[];
        };

        if (!response.ok || !data.summary) {
          setLoadError(data.error ?? 'Could not load rewards.');
          return;
        }

        const merged: RewardSummary = {
          ...data.summary,
          ways_to_earn: data.ways_to_earn ?? data.summary.ways_to_earn ?? [],
        };

        setSummary(merged);
        setWaysToEarn((data.ways_to_earn ?? data.summary.ways_to_earn ?? []) as RewardWayToEarn[]);
      } catch {
        setLoadError('Could not load rewards.');
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

  return (
    <div className="page-container max-w-[52rem]">
      <div className="flex items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-[var(--text-primary)]">Rewards</h1>
          {!loading && (summary?.balances.available ?? 0) > 0 && (
            <span className="brand-chip px-2.5 py-1">
              {summary!.balances.available.toLocaleString()} RP
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadPageData({ silent: true })}
            disabled={loading || refreshing}
            className="icon-button h-9 w-9"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
          </button>
          <Link href="/rewards/catalog" className="btn-ghost text-sm">
            Open redeemables <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadPageData()}
            className="shrink-0 text-xs font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : summary ? (
        <>
          <BalanceRow balances={summary.balances} />

          {waysToEarn.length > 0 && <WaysToEarn items={waysToEarn} />}

          <ActivityLog
            events={summary.recent_activity}
            expanded={activityExpanded}
            onToggle={() => setActivityExpanded((value) => !value)}
          />
        </>
      ) : null}
    </div>
  );
}
