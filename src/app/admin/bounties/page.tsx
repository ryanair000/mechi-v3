'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, RefreshCw, Wallet, Zap } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  BOUNTY_TRIGGER_META,
  BOUNTY_TRIGGER_TYPES,
  getWeekLabel,
  type AdminBounty,
  type BountyPrizeKes,
  type BountyStatus,
  type BountyTriggerType,
} from '@/lib/bounties';

type FormState = {
  title: string;
  description: string;
  triggerType: BountyTriggerType;
  prizeKes: BountyPrizeKes;
  weekLabel: string;
};

const INITIAL_FORM_STATE = (): FormState => ({
  title: '',
  description: '',
  triggerType: BOUNTY_TRIGGER_TYPES[0],
  prizeKes: 50,
  weekLabel: getWeekLabel(),
});

function formatKes(value: number) {
  return `KES ${value.toLocaleString('en-KE')}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getStatusTone(status: BountyStatus) {
  switch (status) {
    case 'active':
      return 'border-emerald-400/30 bg-emerald-500/12 text-emerald-300';
    case 'claimed':
      return 'border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-[var(--brand-teal)]';
    case 'cancelled':
      return 'border-red-400/25 bg-red-500/12 text-red-300';
    case 'draft':
    default:
      return 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-soft)]';
  }
}

function getCategoryTone(triggerType: BountyTriggerType) {
  const category = BOUNTY_TRIGGER_META[triggerType].category;

  switch (category) {
    case 'Match':
      return 'bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]';
    case 'Tournament':
      return 'bg-[rgba(255,107,107,0.12)] text-[var(--brand-coral)]';
    case 'Profile':
    case 'Social':
      return 'bg-blue-500/12 text-blue-300';
    case 'Referral':
    case 'Rewards':
      return 'bg-amber-500/12 text-amber-300';
    case 'Redeem':
      return 'bg-fuchsia-500/12 text-fuchsia-300';
    case 'Leaderboard':
      return 'bg-violet-500/12 text-violet-300';
    case 'Stream':
      return 'bg-emerald-500/12 text-emerald-300';
    case 'Feed':
      return 'bg-orange-500/12 text-orange-300';
    case 'Share':
    default:
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
  }
}

export default function AdminBountiesPage() {
  const authFetch = useAuthFetch();
  const [bounties, setBounties] = useState<AdminBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);

  const loadBounties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/admin/bounties');
      const data = (await response.json().catch(() => null)) as
        | { error?: string; bounties?: AdminBounty[] }
        | null;

      if (!response.ok) {
        toast.error(data?.error ?? 'Failed to load bounties');
        setBounties([]);
        return;
      }

      setBounties(data?.bounties ?? []);
    } catch {
      toast.error('Network error while loading bounties');
      setBounties([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadBounties();
  }, [loadBounties]);

  const handleCreate = useCallback(async () => {
    setSubmitting(true);
    try {
      const response = await authFetch('/api/admin/bounties', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          trigger_type: form.triggerType,
          prize_kes: form.prizeKes,
          week_label: form.weekLabel,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; bounty?: AdminBounty }
        | null;

      if (!response.ok || !data?.bounty) {
        toast.error(data?.error ?? 'Failed to create bounty');
        return;
      }

      toast.success('Bounty created as draft');
      setForm(INITIAL_FORM_STATE());
      await loadBounties();
    } catch {
      toast.error('Network error while creating bounty');
    } finally {
      setSubmitting(false);
    }
  }, [authFetch, form, loadBounties]);

  const handleAction = useCallback(
    async (bounty: AdminBounty, action: 'activate' | 'cancel' | 'mark_paid') => {
      if (
        action === 'activate' &&
        !window.confirm('This bounty will immediately be claimable by all players. Go live?')
      ) {
        return;
      }

      setActingId(`${bounty.id}:${action}`);
      try {
        const response = await authFetch(`/api/admin/bounties/${bounty.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action }),
        });
        const data = (await response.json().catch(() => null)) as
          | { error?: string; bounty?: AdminBounty }
          | null;

        if (!response.ok || !data?.bounty) {
          toast.error(data?.error ?? 'Failed to update bounty');
          return;
        }

        toast.success(
          action === 'activate'
            ? 'Bounty is live'
            : action === 'cancel'
              ? 'Bounty cancelled'
              : 'Bounty marked paid'
        );
        await loadBounties();
      } catch {
        toast.error('Network error while updating bounty');
      } finally {
        setActingId(null);
      }
    },
    [authFetch, loadBounties]
  );

  const stats = useMemo(() => {
    const counts = {
      draft: 0,
      active: 0,
      claimed: 0,
      cancelled: 0,
    } satisfies Record<BountyStatus, number>;

    bounties.forEach((bounty) => {
      counts[bounty.status] += 1;
    });

    return counts;
  }, [bounties]);

  return (
    <div className="space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Bounties Ops</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Launch cash challenges, monitor winners, and clear payouts fast.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Draft them here, send them live when you are ready, and keep payout handling tight once
              a player claims the prize.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Draft', value: stats.draft, tone: 'var(--text-soft)' },
              { label: 'Active', value: stats.active, tone: '#86EFAC' },
              { label: 'Claimed', value: stats.claimed, tone: 'var(--brand-teal)' },
              { label: 'Cancelled', value: stats.cancelled, tone: 'var(--brand-coral)' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{item.value}</p>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--surface)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(item.value * 18, 100)}%`,
                      backgroundColor: item.tone,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-title">Active & Recent Bounties</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Control room</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadBounties()}
            className="btn-ghost whitespace-nowrap"
            disabled={loading}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <>
              <div className="h-28 shimmer rounded-3xl" />
              <div className="h-28 shimmer rounded-3xl" />
              <div className="h-28 shimmer rounded-3xl" />
            </>
          ) : bounties.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-sm text-[var(--text-secondary)]">
              No bounties yet. Create your first draft below.
            </div>
          ) : (
            bounties.map((bounty) => {
              const statusActionKey = actingId;
              const isActing = (action: string) => statusActionKey === `${bounty.id}:${action}`;
              const triggerMeta = BOUNTY_TRIGGER_META[bounty.trigger_type];

              return (
                <div
                  key={bounty.id}
                  className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getStatusTone(
                            bounty.status
                          )}`}
                        >
                          {bounty.status === 'active' ? (
                            <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                          ) : null}
                          {bounty.status}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getCategoryTone(
                            bounty.trigger_type
                          )}`}
                        >
                          {triggerMeta.category}
                        </span>
                        <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                          {bounty.week_label}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-[var(--text-primary)]">{bounty.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          {bounty.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--text-primary)]">
                          <Zap size={15} className="text-[var(--brand-teal)]" />
                          {triggerMeta.label}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--text-primary)]">
                          <Wallet size={15} className="text-[var(--brand-coral)]" />
                          {formatKes(bounty.prize_kes)}
                        </span>
                      </div>

                      {bounty.status === 'claimed' && bounty.winner ? (
                        <div className="rounded-2xl border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] px-4 py-3 text-sm text-[var(--text-primary)]">
                          <p className="font-semibold">
                            Winner: @{bounty.winner.username}
                            {bounty.winner.phone ? ` • ${bounty.winner.phone}` : ''}
                          </p>
                          <p className="mt-1 text-[var(--text-secondary)]">
                            Claimed {formatDateTime(bounty.claimed_at)}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex min-w-[220px] flex-col gap-3 xl:items-end">
                      {bounty.status === 'draft' ? (
                        <button
                          type="button"
                          className="btn-primary justify-center"
                          onClick={() => void handleAction(bounty, 'activate')}
                          disabled={isActing('activate')}
                        >
                          {isActing('activate') ? <Loader2 size={15} className="animate-spin" /> : null}
                          Go Live
                        </button>
                      ) : null}

                      {bounty.status === 'active' ? (
                        <button
                          type="button"
                          className="btn-ghost justify-center text-[var(--brand-coral)]"
                          onClick={() => void handleAction(bounty, 'cancel')}
                          disabled={isActing('cancel')}
                        >
                          {isActing('cancel') ? <Loader2 size={15} className="animate-spin" /> : null}
                          Cancel
                        </button>
                      ) : null}

                      {bounty.status === 'claimed' && !bounty.paid_at ? (
                        <button
                          type="button"
                          className="btn-primary justify-center"
                          onClick={() => void handleAction(bounty, 'mark_paid')}
                          disabled={isActing('mark_paid')}
                        >
                          {isActing('mark_paid') ? <Loader2 size={15} className="animate-spin" /> : null}
                          Mark Paid
                        </button>
                      ) : null}

                      {bounty.status === 'claimed' && bounty.paid_at ? (
                        <div className="rounded-2xl border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] px-4 py-3 text-sm text-[var(--text-primary)]">
                          <div className="flex items-center gap-2 font-semibold">
                            <CheckCircle2 size={16} className="text-[var(--brand-teal)]" />
                            Paid
                          </div>
                          <p className="mt-1 text-[var(--text-secondary)]">{formatDateTime(bounty.paid_at)}</p>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        Created {formatDateTime(bounty.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="card p-5">
        <div>
          <p className="section-title">Create Bounty</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Spin up a draft</h2>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              Title
            </span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[rgba(50,224,196,0.32)]"
              placeholder="Top 3 this week wins KES 200"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              Trigger type
            </span>
            <select
              value={form.triggerType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  triggerType: event.target.value as BountyTriggerType,
                }))
              }
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[rgba(50,224,196,0.32)]"
            >
              {BOUNTY_TRIGGER_TYPES.map((triggerType) => (
                <option key={triggerType} value={triggerType}>
                  {BOUNTY_TRIGGER_META[triggerType].label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 xl:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="min-h-[132px] w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[rgba(50,224,196,0.32)]"
              placeholder="First player to complete the action wins. Be explicit about what they need to do."
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              Prize
            </span>
            <select
              value={form.prizeKes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  prizeKes: Number(event.target.value) as BountyPrizeKes,
                }))
              }
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[rgba(50,224,196,0.32)]"
            >
              {[50, 100, 200].map((value) => (
                <option key={value} value={value}>
                  {formatKes(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              Week label
            </span>
            <input
              value={form.weekLabel}
              onChange={(event) =>
                setForm((current) => ({ ...current, weekLabel: event.target.value }))
              }
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[rgba(50,224,196,0.32)]"
              placeholder="2026-W17"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleCreate()}
            disabled={submitting}
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            Create Draft
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setForm(INITIAL_FORM_STATE())}
            disabled={submitting}
          >
            Reset
          </button>
        </div>
      </section>
    </div>
  );
}
