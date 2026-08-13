'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, DatabaseZap, RefreshCw, Send, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';

type Gate = { enabled: boolean; configured: boolean; rollout_percent: number; reason: string | null };
type Health = {
  storage_ready: boolean;
  generated_at?: string;
  errors?: string[];
  rollout: { connections: Gate; developer_api: Gate; partner_api: Gate; webhook_delivery: Gate; rollout_percent: number; beta_user_count: number };
  metrics?: { connections: Record<string, number>; recent_syncs: Record<string, number>; subscriptions: Record<string, number>; deliveries: Record<string, number>; active_tokens: number; pending_partner_reviews: number; stale_deliveries: number; due_deliveries: number };
  subscriptions?: Array<{ id: string; endpoint_url: string; status: string; failure_count: number; paused_reason: string | null; last_success_at: string | null }>;
  operation_runs?: Array<{ id: string; operation_type: string; trigger_source: string; status: string; claimed_count: number; succeeded_count: number; retried_count: number; failed_count: number; started_at: string; finished_at: string | null }>;
};

const GATE_LABELS: Array<[keyof Health['rollout'], string]> = [
  ['connections', 'Platform connections'], ['developer_api', 'Developer API'], ['partner_api', 'Partner API'], ['webhook_delivery', 'Webhook delivery'],
];

function total(values?: Record<string, number>) { return Object.values(values ?? {}).reduce((sum, value) => sum + value, 0); }
function shortEndpoint(value: string) { try { return new URL(value).host; } catch { return 'Invalid endpoint'; } }

export default function PassportOperationsConsole() {
  const authFetch = useAuthFetch();
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await authFetch('/api/admin/passport/operations');
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.error ?? 'Could not load Passport operations');
    setHealth(payload);
  }, [authFetch]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function run(action: 'deliver_webhooks' | 'cleanup_retention') {
    if (action === 'deliver_webhooks' && !window.confirm('Run one webhook delivery batch now? This can send signed events to active external endpoints.')) return;
    setBusy(action);
    try {
      const response = await authFetch('/api/admin/passport/operations', { method: 'POST', body: JSON.stringify({ action }) });
      const payload = await response.json();
      if (!response.ok) return toast.error(payload.error ?? 'Passport operation failed');
      toast.success(action === 'deliver_webhooks' ? `Claimed ${payload.claimed ?? 0}; delivered ${payload.delivered ?? 0}` : 'Retention cleanup completed');
      await load();
    } finally { setBusy(null); }
  }

  if (!health) return <main className="py-10 text-sm text-[var(--text-soft)]">Loading Passport operations…</main>;
  return <main className="space-y-6"><header className="admin-hero-card p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="brand-kicker">Mechi V5 · Phase 8</p><h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">Passport launch control</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Observe rollout gates, external delivery pressure, sync health, partner reviews, and background operations before widening access.</p></div><button type="button" onClick={() => void load()} className="btn-outline inline-flex items-center gap-2"><RefreshCw size={15}/>Refresh</button></div></header>
    {!health.storage_ready ? <section className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5"><p className="flex items-center gap-2 font-black text-rose-400"><ShieldAlert size={18}/>Phase 8 migration required</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{health.errors?.[0] ?? 'Operations storage is unavailable.'} External delivery must stay disabled.</p></section> : null}
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{GATE_LABELS.map(([key, label]) => { const gate = health.rollout[key] as Gate; return <article key={String(key)} className="admin-kpi-card p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-[var(--text-soft)]">{label}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${gate.enabled ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'}`}>{gate.enabled ? 'enabled' : 'gated'}</span></div><p className="mt-3 text-2xl font-black text-[var(--text-primary)]">{gate.rollout_percent}%</p><p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">{gate.enabled ? 'Operator gate is open.' : gate.reason}</p></article>; })}</section>
    {health.metrics ? <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className="card p-5"><p className="text-xs font-bold text-[var(--text-soft)]">Connections</p><p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{total(health.metrics.connections)}</p><p className="mt-2 text-xs text-[var(--text-soft)]">{health.metrics.recent_syncs.error ?? 0} recent sync errors</p></article><article className="card p-5"><p className="text-xs font-bold text-[var(--text-soft)]">Webhook queue</p><p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{health.metrics.due_deliveries}</p><p className="mt-2 text-xs text-[var(--text-soft)]">{health.metrics.stale_deliveries} stale claims</p></article><article className="card p-5"><p className="text-xs font-bold text-[var(--text-soft)]">Developer access</p><p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{health.metrics.active_tokens}</p><p className="mt-2 text-xs text-[var(--text-soft)]">active scoped tokens</p></article><article className="card p-5"><p className="text-xs font-bold text-[var(--text-soft)]">Partner review</p><p className="mt-2 text-3xl font-black text-[var(--text-primary)]">{health.metrics.pending_partner_reviews}</p><p className="mt-2 text-xs text-[var(--text-soft)]">claims awaiting a human</p></article></section> : null}
    <section className="card p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="brand-kicker">Controlled actions</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Operator jobs</h2><p className="mt-2 text-xs text-[var(--text-soft)]">Every manual run is authenticated and written to the admin audit log.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!health.storage_ready || !health.rollout.webhook_delivery.enabled || Boolean(busy)} onClick={() => void run('deliver_webhooks')} className="btn-primary inline-flex items-center gap-2"><Send size={15}/>{busy === 'deliver_webhooks' ? 'Delivering…' : 'Run delivery batch'}</button><button type="button" disabled={!health.storage_ready || Boolean(busy)} onClick={() => void run('cleanup_retention')} className="btn-outline inline-flex items-center gap-2"><DatabaseZap size={15}/>{busy === 'cleanup_retention' ? 'Cleaning…' : 'Run retention'}</button></div></div></section>
    <section className="grid gap-6 xl:grid-cols-2"><article className="card p-5"><div className="flex items-center gap-2"><Activity size={17} className="text-[var(--brand-teal)]"/><h2 className="font-black text-[var(--text-primary)]">Recent operation runs</h2></div><div className="mt-4 space-y-2">{health.operation_runs?.slice(0, 12).map((run) => <div key={run.id} className="rounded-xl border border-[var(--border-color)] p-3"><div className="flex items-center justify-between gap-3"><p className="font-bold text-[var(--text-primary)]">{run.operation_type.replaceAll('_', ' ')}</p><span className="text-xs font-bold text-[var(--text-soft)]">{run.status}</span></div><p className="mt-2 text-xs text-[var(--text-soft)]">{run.trigger_source} · {run.claimed_count} claimed · {run.succeeded_count} succeeded · {run.retried_count} retry · {run.failed_count} failed</p></div>)}{!health.operation_runs?.length ? <p className="text-sm text-[var(--text-soft)]">No Phase 8 operations have run.</p> : null}</div></article><article className="card p-5"><h2 className="font-black text-[var(--text-primary)]">Webhook subscriptions</h2><div className="mt-4 space-y-2">{health.subscriptions?.slice(0, 12).map((subscription) => <div key={subscription.id} className="rounded-xl border border-[var(--border-color)] p-3"><div className="flex items-center justify-between gap-3"><p className="truncate font-bold text-[var(--text-primary)]">{shortEndpoint(subscription.endpoint_url)}</p><span className="text-xs font-bold text-[var(--text-soft)]">{subscription.status}</span></div><p className="mt-2 text-xs text-[var(--text-soft)]">{subscription.failure_count} consecutive failures{subscription.paused_reason ? ` · ${subscription.paused_reason}` : ''}</p></div>)}{!health.subscriptions?.length ? <p className="text-sm text-[var(--text-soft)]">No webhook subscriptions.</p> : null}</div></article></section>
  </main>;
}
