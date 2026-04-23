'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  XCircle,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { AdminRewardRedemptionItem, RewardRedemptionStatus } from '@/types';

type QueueCounts = Record<RewardRedemptionStatus, number>;
type QueueAction = 'start_processing' | 'complete' | 'reject';

const STATUS_OPTIONS: Array<{ value: RewardRedemptionStatus | 'all'; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All status' },
];

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString();
}

function formatKes(value: number) {
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatStatus(status: RewardRedemptionStatus) {
  switch (status) {
    case 'processing':
      return 'Processing';
    case 'completed':
      return 'Completed';
    case 'rejected':
      return 'Rejected';
    case 'pending':
    default:
      return 'Pending';
  }
}

function statusTone(status: RewardRedemptionStatus) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/12 text-emerald-300';
    case 'rejected':
      return 'bg-red-500/12 text-red-300';
    case 'processing':
      return 'bg-blue-500/12 text-blue-300';
    case 'pending':
    default:
      return 'bg-amber-500/12 text-amber-300';
  }
}

function gameLabel(game: AdminRewardRedemptionItem['game']) {
  switch (game) {
    case 'codm':
      return 'CODM';
    case 'pubgm':
      return 'PUBG UC';
    case 'efootball':
    default:
      return 'eFootball Coins';
  }
}

export default function AdminRewardsPage() {
  const authFetch = useAuthFetch();
  const [items, setItems] = useState<AdminRewardRedemptionItem[]>([]);
  const [counts, setCounts] = useState<QueueCounts>({
    pending: 0,
    processing: 0,
    completed: 0,
    rejected: 0,
  });
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]['value']>('pending');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (deferredQuery.trim()) params.set('q', deferredQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await authFetch(`/api/admin/rewards?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? 'Failed to load reward queue');
        setItems([]);
        return;
      }

      const nextItems = (data.items ?? []) as AdminRewardRedemptionItem[];
      setItems(nextItems);
      setCounts({
        pending: Number(data.counts?.pending ?? 0),
        processing: Number(data.counts?.processing ?? 0),
        completed: Number(data.counts?.completed ?? 0),
        rejected: Number(data.counts?.rejected ?? 0),
      });
      setTotal(Number(data.total ?? 0));
      setSelectedItemId((current) => {
        if (current && nextItems.some((item) => item.id === current)) {
          return current;
        }

        return nextItems[0]?.id ?? null;
      });
    } catch {
      toast.error('Network error while loading reward queue');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, deferredQuery, statusFilter]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? items[0] ?? null,
    [items, selectedItemId]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Pending', value: counts.pending, icon: Clock3, accent: '#FBBF24' },
      { label: 'Processing', value: counts.processing, icon: Shield, accent: '#60A5FA' },
      { label: 'Completed', value: counts.completed, icon: CheckCircle2, accent: '#6EE7B7' },
      { label: 'Rejected', value: counts.rejected, icon: XCircle, accent: '#FCA5A5' },
    ],
    [counts]
  );

  const handleAction = useCallback(
    async (item: AdminRewardRedemptionItem, action: QueueAction) => {
      setActingOn(item.id);
      try {
        const response = await authFetch(`/api/admin/rewards/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            action,
            note: notes[item.id] ?? item.admin_note ?? '',
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          toast.error(data.error ?? 'Failed to update reward request');
          return;
        }

        toast.success(
          action === 'start_processing'
            ? 'Request moved to processing'
            : action === 'complete'
              ? 'Request marked completed'
              : 'Request rejected and points restored'
        );

        await fetchItems();
      } catch {
        toast.error('Network error while updating reward request');
      } finally {
        setActingOn(null);
      }
    },
    [authFetch, fetchItems, notes]
  );

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Reward fulfillment queue</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Process Mechi wallet redemptions from one queue.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              Players now redeem inside Mechi. This queue is where moderators move requests into
              processing, mark them complete, or reject them and automatically return the points.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="card bg-[var(--surface-elevated)] px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-[var(--text-soft)]">
                    <Icon size={14} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]">{item.label}</p>
                  </div>
                  <p className="mt-2 text-2xl font-black" style={{ color: item.accent }}>
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="card p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              placeholder="Search username, email, phone, M-Pesa number, or game"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="input"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => void fetchItems()} className="btn-ghost whitespace-nowrap">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="brand-chip px-2.5 py-1">{total.toLocaleString()} matching requests</span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1">
            {counts.pending.toLocaleString()} waiting for first touch
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-40 rounded-3xl shimmer" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <Shield size={22} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No reward requests match this filter.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            The current queue is clear for the selected search and status combination.
          </p>
        </div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)]">
          <div className="card p-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div>
                <p className="section-title">Queued requests</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Open a request to see the player, the target redeemable, and the M-Pesa number on file.
                </p>
              </div>
              <span className="brand-chip">{items.length} loaded</span>
            </div>

            <div className="mt-4 space-y-2">
              {items.map((item) => {
                const isSelected = item.id === selectedItem?.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className={`w-full rounded-3xl border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.08)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-[var(--text-primary)]">
                        {item.user?.username ?? 'Unknown player'}
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(item.status)}`}>
                        {formatStatus(item.status)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {gameLabel(item.game)} • {item.reward_amount_label}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-1">
                        KSh {formatKes(item.cost_kes)}
                      </span>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-1">
                        {item.cost_points.toLocaleString()} points
                      </span>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-1">
                        {item.mpesa_number}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-[var(--text-soft)]">
                      Submitted {formatDateTime(item.submitted_at)}
                      {item.processor?.username ? ` • Last handled by ${item.processor.username}` : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card self-start p-5 xl:sticky xl:top-6">
            {selectedItem ? (
              <div className="space-y-5">
                <div className="border-b border-[var(--border-color)] pb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                      {selectedItem.user?.username ?? 'Unknown player'}
                    </h2>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(selectedItem.status)}`}>
                      {formatStatus(selectedItem.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {gameLabel(selectedItem.game)} • {selectedItem.reward_amount_label} • KSh {formatKes(selectedItem.cost_kes)} • {selectedItem.cost_points.toLocaleString()} points
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                    <p className="section-title">Player</p>
                    <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                      {selectedItem.user?.email ?? 'No email'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {selectedItem.user?.phone ?? 'No phone'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                    <p className="section-title">M-Pesa number</p>
                    <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                      {selectedItem.mpesa_number}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Used only for this redemption request.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                    <p className="section-title">Reward points</p>
                    <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                      {(selectedItem.user?.reward_points_available ?? 0).toLocaleString()} available
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {(selectedItem.user?.reward_points_pending ?? 0).toLocaleString()} pending • {(selectedItem.user?.reward_points_lifetime ?? 0).toLocaleString()} lifetime
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                    <p className="section-title">Queue trail</p>
                    <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                      Submitted {formatDateTime(selectedItem.submitted_at)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Processing {formatDateTime(selectedItem.processing_at)} • Completed {formatDateTime(selectedItem.completed_at)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Rejected {formatDateTime(selectedItem.rejected_at)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <p className="section-title">Moderator note</p>
                  <textarea
                    value={notes[selectedItem.id] ?? selectedItem.admin_note ?? ''}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [selectedItem.id]: event.target.value,
                      }))
                    }
                    className="input mt-3 min-h-32 resize-y"
                    placeholder="Leave a short note for the player or the rest of the ops team"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedItem.status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => void handleAction(selectedItem, 'start_processing')}
                        disabled={actingOn === selectedItem.id}
                        className="btn-ghost"
                      >
                        {actingOn === selectedItem.id ? <Loader2 size={14} className="animate-spin" /> : <Clock3 size={14} />}
                        Start processing
                      </button>
                    ) : null}

                    {(selectedItem.status === 'pending' || selectedItem.status === 'processing') ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleAction(selectedItem, 'complete')}
                          disabled={actingOn === selectedItem.id}
                          className="btn-primary"
                        >
                          {actingOn === selectedItem.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAction(selectedItem, 'reject')}
                          disabled={actingOn === selectedItem.id}
                          className="btn-ghost"
                        >
                          {actingOn === selectedItem.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
