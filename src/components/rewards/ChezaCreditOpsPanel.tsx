'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';

type ExportRow = {
  id: string;
  rp_amount: number;
  credit_kes: number;
  status: string;
  external_voucher_id: string | null;
  external_wallet_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  user?: { username?: string | null; email?: string | null } | null;
};

export function ChezaCreditOpsPanel() {
  const authFetch = useAuthFetch();
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/rewards/cheza-credit');
      const payload = (await response.json()) as { error?: string; exports?: ExportRow[] };
      if (!response.ok) throw new Error(payload.error || 'Could not load Cheza Credit operations');
      setRows(payload.exports ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load Cheza Credit operations');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const reconcile = async (exportId?: string) => {
    setActing(exportId ?? 'all');
    try {
      const response = await authFetch('/api/admin/rewards/cheza-credit', {
        method: 'POST',
        body: JSON.stringify({ action: exportId ? 'reconcile' : 'reconcile_all', export_id: exportId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Reconciliation failed');
      toast.success(exportId ? 'Redemption reconciled.' : 'Pending redemptions reconciled.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reconciliation failed');
    } finally {
      setActing(null);
    }
  };

  const totals = useMemo(() => ({
    count: rows.length,
    credit: rows.filter((row) => !['restored', 'rejected'].includes(row.status)).reduce((sum, row) => sum + Number(row.credit_kes), 0),
    attention: rows.filter((row) => ['review', 'reconciliation_required', 'reserved'].includes(row.status)).length,
    completed: rows.filter((row) => row.status === 'completed').length,
  }), [rows]);

  return (
    <section className="card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="brand-kicker">Cheza Credit bridge</p><h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Cross-ledger settlement</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Track reserved RP, ChezaHub vouchers, wallet settlement, and reconciliation.</p></div>
        <button type="button" onClick={() => void reconcile()} disabled={Boolean(acting)} className="btn-ghost whitespace-nowrap">{acting === 'all' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Reconcile pending</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-[var(--surface-elevated)] p-4"><WalletCards size={15} className="text-red-300" /><p className="mt-2 text-2xl font-black">{totals.count}</p><p className="text-xs text-[var(--text-soft)]">Recent exports</p></div>
        <div className="rounded-2xl bg-[var(--surface-elevated)] p-4"><p className="text-2xl font-black">KSh {totals.credit.toLocaleString()}</p><p className="text-xs text-[var(--text-soft)]">Tracked liability</p></div>
        <div className="rounded-2xl bg-[var(--surface-elevated)] p-4"><AlertTriangle size={15} className="text-amber-300" /><p className="mt-2 text-2xl font-black">{totals.attention}</p><p className="text-xs text-[var(--text-soft)]">Needs attention</p></div>
        <div className="rounded-2xl bg-[var(--surface-elevated)] p-4"><CheckCircle2 size={15} className="text-[var(--brand-teal)]" /><p className="mt-2 text-2xl font-black">{totals.completed}</p><p className="text-xs text-[var(--text-soft)]">Completed</p></div>
      </div>
      {loading ? <div className="mt-4 h-16 rounded-xl shimmer" /> : rows.length > 0 ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-[var(--text-soft)]"><tr><th className="py-2">Player</th><th>Value</th><th>Status</th><th>Voucher</th><th>Wallet tx</th><th className="text-right">Action</th></tr></thead><tbody className="divide-y divide-[var(--border-subtle)]">{rows.slice(0, 12).map((row) => <tr key={row.id}><td className="py-3"><p className="font-semibold text-[var(--text-primary)]">{row.user?.username || 'Player'}</p><p className="text-xs text-[var(--text-soft)]">{row.user?.email || row.id.slice(0, 8)}</p></td><td>{row.rp_amount.toLocaleString()} RP ? KSh {Number(row.credit_kes).toLocaleString()}</td><td className="font-semibold">{row.status.replace(/_/g, ' ')}</td><td className="font-mono text-xs">{row.external_voucher_id?.slice(0, 8) || '?'}</td><td className="font-mono text-xs">{row.external_wallet_transaction_id?.slice(0, 8) || '?'}</td><td className="text-right"><button type="button" className="btn-ghost px-3 py-1.5 text-xs" disabled={Boolean(acting)} onClick={() => void reconcile(row.id)}>{acting === row.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync</button></td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-[var(--text-soft)]">No Cheza Credit exports yet.</p>}
    </section>
  );
}
