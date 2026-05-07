'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { AdminRewardReviewItem, RewardReviewStatus } from '@/types';

type ReviewCounts = Record<RewardReviewStatus, number>;

const STATUS_OPTIONS: Array<{ value: RewardReviewStatus | 'all'; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All status' },
];

const REASON_LABELS: Record<string, { label: string; tone: string; helper: string }> = {
  matching_contact_details: {
    label: 'Matching contact details',
    tone: 'bg-red-500/14 text-red-400',
    helper: 'Invitee checkout details match the inviter and likely indicate self-referral.',
  },
  chezahub_abuse_review: {
    label: 'ChezaHub abuse review',
    tone: 'bg-amber-500/14 text-amber-300',
    helper: 'ChezaHub flagged the linked order for manual abuse review before payout or fulfillment.',
  },
  repeat_reward_reversals: {
    label: 'Repeat reward reversals',
    tone: 'bg-orange-500/14 text-orange-300',
    helper: 'This account has multiple reward reversals in the active monitoring window.',
  },
  chezahub_link_conflict: {
    label: 'ChezaHub link conflict',
    tone: 'bg-blue-500/14 text-blue-300',
    helper: 'A different ChezaHub account tried to link to a profile that was already bound.',
  },
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
}

function formatReasonLabel(reason: string) {
  return REASON_LABELS[reason]?.label ?? reason.replace(/_/g, ' ');
}

function getReasonTone(reason: string) {
  return REASON_LABELS[reason]?.tone ?? 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
}

function getStatusTone(status: RewardReviewStatus) {
  switch (status) {
    case 'open':
      return 'bg-red-500/14 text-red-400';
    case 'reviewing':
      return 'bg-blue-500/14 text-blue-300';
    case 'resolved':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]';
    case 'dismissed':
    default:
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
  }
}

function formatMetadataValue(value: unknown) {
  if (value === null || typeof value === 'undefined') return 'Not set';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function extractMetadataFacts(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return [];

  const preferredOrder = [
    'order_id',
    'reward_code',
    'reward_issuance_id',
    'customer_email',
    'customer_phone',
    'existing_chezahub_user_id',
    'attempted_chezahub_user_id',
    'inviter_user_id',
    'recent_reversal_count',
    'window_days',
    'order_total_kes',
  ];

  const preferredFacts = preferredOrder
    .filter((key) => Object.prototype.hasOwnProperty.call(metadata, key))
    .map((key) => ({
      key,
      value: metadata[key],
    }));

  const extraFacts = Object.entries(metadata)
    .filter(([key]) => !preferredOrder.includes(key))
    .map(([key, value]) => ({ key, value }));

  return [...preferredFacts, ...extraFacts].filter((item) => item.value !== null && typeof item.value !== 'undefined');
}

export default function AdminRewardsPage() {
  const authFetch = useAuthFetch();
  const [items, setItems] = useState<AdminRewardReviewItem[]>([]);
  const [counts, setCounts] = useState<ReviewCounts>({
    open: 0,
    reviewing: 0,
    resolved: 0,
    dismissed: 0,
  });
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]['value']>('open');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (deferredQuery.trim()) params.set('q', deferredQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (reasonFilter !== 'all') params.set('reason', reasonFilter);

      const res = await authFetch(`/api/admin/rewards?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load reward reviews');
        setItems([]);
        return;
      }

        const nextItems = (data.items ?? []) as AdminRewardReviewItem[];
        setItems(nextItems);
        setCounts({
          open: Number(data.counts?.open ?? 0),
          reviewing: Number(data.counts?.reviewing ?? 0),
          resolved: Number(data.counts?.resolved ?? 0),
          dismissed: Number(data.counts?.dismissed ?? 0),
        });
        setTotal(Number(data.total ?? 0));
        setSelectedItemId((current) => {
          if (current && nextItems.some((item) => item.id === current)) {
            return current;
          }

          return nextItems[0]?.id ?? null;
        });
      } catch {
        toast.error('Network error while loading reward reviews');
        setItems([]);
      } finally {
        setLoading(false);
    }
  }, [authFetch, deferredQuery, reasonFilter, statusFilter]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleAction = useCallback(
    async (item: AdminRewardReviewItem, action: 'start_review' | 'resolve' | 'dismiss' | 'reopen') => {
      setActingOn(item.id);
      try {
        const res = await authFetch(`/api/admin/rewards/${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            action,
            note: notes[item.id] ?? item.resolution_note ?? '',
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? 'Failed to update review item');
          return;
        }

        toast.success(
          action === 'start_review'
            ? 'Marked as reviewing'
            : action === 'resolve'
              ? 'Review resolved'
              : action === 'dismiss'
                ? 'Review dismissed'
                : 'Review reopened'
        );
        await fetchItems();
      } catch {
        toast.error('Network error');
      } finally {
        setActingOn(null);
      }
    },
    [authFetch, fetchItems, notes]
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Open', value: counts.open, icon: ShieldAlert, accent: 'var(--brand-coral)' },
      { label: 'Reviewing', value: counts.reviewing, icon: Eye, accent: '#60A5FA' },
      { label: 'Resolved', value: counts.resolved, icon: CheckCircle2, accent: 'var(--brand-teal)' },
      { label: 'Dismissed', value: counts.dismissed, icon: XCircle, accent: 'var(--text-soft)' },
    ],
    [counts]
  );
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? items[0] ?? null,
    [items, selectedItemId]
  );

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Reward review queue</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Investigate suspicious reward activity before it becomes a loss.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
              This lane brings together referral self-match signals, ChezaHub abuse-review callbacks,
              repeated reversals, and account-link conflicts so moderators can intervene early.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
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
      </div>

      <div className="card p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              placeholder="Search username, phone, email, order id, reward code, or reason"
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

          <select
            value={reasonFilter}
            onChange={(event) => setReasonFilter(event.target.value)}
            className="input"
          >
            <option value="all">All reasons</option>
            {Object.entries(REASON_LABELS).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
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
          <span className="brand-chip px-2.5 py-1">{total.toLocaleString()} matching review items</span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1">
            {counts.open.toLocaleString()} still need first-touch review
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-40 shimmer rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <Shield size={22} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No reward reviews match this filter.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            The queue is clear for the current search and status combination.
          </p>
        </div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.78fr)]">
          <div className="card p-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div>
                <p className="section-title">Suspicious items</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Triage the queue first, then open one review item into a focused evidence panel.
                </p>
              </div>
              <span className="brand-chip">{items.length} loaded</span>
            </div>

            <div className="mt-4 space-y-2">
              {items.map((item) => {
                const facts = extractMetadataFacts(item.metadata).slice(0, 3);
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
                        {item.user?.username ?? 'Unlinked review item'}
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getReasonTone(item.reason)}`}>
                        {formatReasonLabel(item.reason)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusTone(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {REASON_LABELS[item.reason]?.helper ??
                        'This item needs a moderator to review the reward or referral signal.'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {facts.length > 0 ? (
                        facts.map((fact) => (
                          <span
                            key={`${item.id}-${fact.key}`}
                            className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
                          >
                            {fact.key.replace(/_/g, ' ')}: {formatMetadataValue(fact.value)}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                          No metadata facts attached
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-[var(--text-soft)]">
                      Created {formatDateTime(item.created_at)}
                      {item.reviewer?.username ? ` | Last touched by ${item.reviewer.username}` : ' | Unclaimed'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card self-start p-5 xl:sticky xl:top-6">
            {selectedItem ? (
              (() => {
                const facts = extractMetadataFacts(selectedItem.metadata);
                const noteValue = notes[selectedItem.id] ?? selectedItem.resolution_note ?? '';
                const reasonMeta = REASON_LABELS[selectedItem.reason];

                return (
                  <div className="space-y-5">
                    <div className="border-b border-[var(--border-color)] pb-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                          {selectedItem.user?.username ?? 'Unlinked review item'}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getReasonTone(selectedItem.reason)}`}
                        >
                          {formatReasonLabel(selectedItem.reason)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusTone(selectedItem.status)}`}
                        >
                          {selectedItem.status}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                        {reasonMeta?.helper ??
                          'This item needs a moderator to review the reward or referral signal.'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="section-title">Profile</p>
                        <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                          {selectedItem.user?.email ?? 'No email'}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {selectedItem.user?.phone ?? 'No phone'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="section-title">Reward points</p>
                        <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                          {(selectedItem.user?.reward_points_available ?? 0).toLocaleString()} available
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {(selectedItem.user?.reward_points_pending ?? 0).toLocaleString()} pending | {(selectedItem.user?.reward_points_lifetime ?? 0).toLocaleString()} lifetime
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="section-title">ChezaHub link</p>
                        <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                          {selectedItem.user?.chezahub_user_id ? 'Linked' : 'Not linked'}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                          {selectedItem.user?.chezahub_user_id ?? selectedItem.dedupe_key ?? 'No binding id'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="section-title">Review trail</p>
                        <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                          Created {formatDateTime(selectedItem.created_at)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {selectedItem.reviewer?.username
                            ? `Last touched by ${selectedItem.reviewer.username} on ${formatDateTime(selectedItem.reviewed_at)}`
                            : 'No moderator has claimed this item yet'}
                        </p>
                      </div>
                    </div>

                    {facts.length > 0 ? (
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                        <p className="section-title">Evidence snapshot</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {facts.map((fact) => (
                            <div
                              key={`${selectedItem.id}-${fact.key}`}
                              className="rounded-xl border border-[var(--border-color)] px-3 py-2"
                            >
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                                {fact.key.replace(/_/g, ' ')}
                              </p>
                              <p className="mt-1 break-all text-sm text-[var(--text-primary)]">
                                {formatMetadataValue(fact.value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                      <p className="section-title">Moderator note</p>
                      <textarea
                        value={noteValue}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [selectedItem.id]: event.target.value,
                          }))
                        }
                        className="input mt-3 min-h-32 resize-y"
                        placeholder="Add a short note before resolving or dismissing this item"
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedItem.status === 'open' ? (
                          <button
                            type="button"
                            onClick={() => void handleAction(selectedItem, 'start_review')}
                            disabled={actingOn === selectedItem.id}
                            className="btn-ghost"
                          >
                            {actingOn === selectedItem.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                            Start review
                          </button>
                        ) : null}

                        {(selectedItem.status === 'open' || selectedItem.status === 'reviewing') ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleAction(selectedItem, 'resolve')}
                              disabled={actingOn === selectedItem.id}
                              className="btn-primary"
                            >
                              {actingOn === selectedItem.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                              Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleAction(selectedItem, 'dismiss')}
                              disabled={actingOn === selectedItem.id}
                              className="btn-ghost"
                            >
                              {actingOn === selectedItem.id ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                              Dismiss
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleAction(selectedItem, 'reopen')}
                            disabled={actingOn === selectedItem.id}
                            className="btn-ghost"
                          >
                            {actingOn === selectedItem.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Reopen
                          </button>
                        )}
                      </div>

                      {selectedItem.resolved_at ? (
                        <p className="mt-3 text-xs text-[var(--text-secondary)]">
                          Resolution recorded on {formatDateTime(selectedItem.resolved_at)}.
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
