'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Copy, ExternalLink, Loader2, RefreshCw, ShieldCheck, WalletCards, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import type { ChezaCreditRedemption } from '@/types/rewards';

type Package = { rp: number; creditKes: number; label: string };
type Voucher = { status?: string; redeem_url?: string | null; display_code?: string | null; expires_at?: string | null };
type CreditData = {
  enabled: boolean;
  packages: Package[];
  rules: { rate_rp_per_kes: number; period_limit_kes: number; daily_limit: number; wallet_coverage_percent: number };
  redemptions: ChezaCreditRedemption[];
};

function statusTone(status: ChezaCreditRedemption['status']) {
  if (status === 'completed' || status === 'redeemed') return 'text-[var(--brand-teal)]';
  if (status === 'restored' || status === 'expired' || status === 'voided') return 'text-[var(--text-soft)]';
  if (status === 'review' || status === 'reconciliation_required') return 'text-amber-300';
  return 'text-blue-300';
}

export function ChezaCreditPanel({ availableRp, onBalanceChange }: { availableRp: number; onBalanceChange: () => void }) {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [voucherByExport, setVoucherByExport] = useState<Record<string, Voucher>>({});

  const load = useCallback(async () => {
    try {
      const response = await authFetch('/api/rewards/cheza-credit');
      const payload = (await response.json()) as CreditData & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Could not load Cheza Credit rewards');
      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load Cheza Credit rewards');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const reserve = async (rewardPackage: Package) => {
    setBusy(`package:${rewardPackage.rp}`);
    try {
      const response = await authFetch('/api/rewards/cheza-credit/reserve', {
        method: 'POST',
        body: JSON.stringify({ rp_amount: rewardPackage.rp, idempotency_key: crypto.randomUUID() }),
      });
      const payload = (await response.json()) as { error?: string; export?: ChezaCreditRedemption; voucher?: Voucher; message?: string };
      if (!response.ok || !payload.export) throw new Error(payload.error || 'Could not reserve Cheza Credit');
      if (payload.voucher) setVoucherByExport((current) => ({ ...current, [payload.export!.id]: payload.voucher! }));
      toast.success(payload.voucher ? 'ChezaHub reward ready.' : payload.message || 'Your RP is reserved.');
      await load();
      onBalanceChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reserve Cheza Credit');
    } finally {
      setBusy(null);
    }
  };

  const refreshVoucher = async (exportId: string) => {
    setBusy(`status:${exportId}`);
    try {
      const response = await authFetch(`/api/rewards/cheza-credit/${exportId}`);
      const payload = (await response.json()) as { error?: string; voucher?: Voucher | null };
      if (!response.ok) throw new Error(payload.error || 'Could not refresh voucher');
      if (payload.voucher) setVoucherByExport((current) => ({ ...current, [exportId]: payload.voucher! }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not refresh voucher');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (exportId: string) => {
    setBusy(`cancel:${exportId}`);
    try {
      const response = await authFetch(`/api/rewards/cheza-credit/${exportId}/cancel`, { method: 'POST' });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Could not cancel redemption');
      toast.success('Voucher cancelled and RP restored.');
      await load();
      onBalanceChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel redemption');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="mb-8 h-48 rounded-3xl shimmer" />;
  if (!data) return null;

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-red-500/20 bg-[var(--surface-card)]">
      <div className="bg-gradient-to-br from-red-500/20 via-transparent to-amber-400/10 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><span className="brand-chip inline-flex items-center gap-1.5 px-2.5 py-1"><WalletCards size={12} /> Cheza Credit</span><h2 className="mt-3 text-xl font-black text-[var(--text-primary)]">Play. Earn RP. Shop on ChezaHub.</h2><p className="mt-1 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">Convert verified Mechi RP into non-withdrawable Cheza Credit for eligible ChezaHub purchases.</p></div>
          <ShieldCheck className="h-7 w-7 shrink-0 text-[var(--brand-teal)]" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-soft)]"><span>{data.rules.rate_rp_per_kes} RP = KSh 1</span><span>?</span><span>Up to KSh {data.rules.period_limit_kes}/30 days</span><span>?</span><span>{data.rules.daily_limit} redemptions/24 hours</span><span>?</span><span>Up to {data.rules.wallet_coverage_percent}% of eligible checkout</span></div>
      </div>

      {!data.enabled ? <div className="border-t border-[var(--border-subtle)] px-5 py-4 text-sm text-amber-300">Cheza Credit conversion is being prepared. Your RP remains available.</div> : (
        <div className="grid gap-3 border-t border-[var(--border-subtle)] p-5 sm:grid-cols-2">
          {data.packages.map((rewardPackage) => {
            const processing = busy === `package:${rewardPackage.rp}`;
            const affordable = availableRp >= rewardPackage.rp;
            return <button key={rewardPackage.rp} type="button" disabled={!affordable || Boolean(busy)} onClick={() => void reserve(rewardPackage)} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 text-left transition hover:border-red-500/40 disabled:cursor-not-allowed disabled:opacity-45"><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-[var(--text-primary)]">{rewardPackage.label}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{rewardPackage.rp.toLocaleString()} RP</p></div><span className="rounded-xl bg-red-500/15 px-3 py-2 font-black text-red-300">KSh {rewardPackage.creditKes}</span></div>{processing ? <span className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--text-soft)]"><Loader2 size={12} className="animate-spin" /> Reserving?</span> : null}</button>;
          })}
        </div>
      )}

      {data.redemptions.length > 0 ? <div className="border-t border-[var(--border-subtle)] p-5"><h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Cheza Credit activity</h3><div className="mt-3 divide-y divide-[var(--border-subtle)]">{data.redemptions.map((item) => { const voucher = voucherByExport[item.id]; const pending = ['reserved', 'issued'].includes(item.status); return <div key={item.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-[var(--text-primary)]">KSh {Number(item.credit_kes).toLocaleString()} Cheza Credit</p><p className={`mt-1 text-xs font-bold uppercase ${statusTone(item.status)}`}>{item.status.replace(/_/g, ' ')}</p></div><div className="flex flex-wrap gap-2">{voucher?.redeem_url ? <a href={voucher.redeem_url} target="_blank" rel="noreferrer" className="icon-button h-9 gap-2 px-3 text-xs"><ExternalLink size={13} /> Redeem</a> : null}{pending ? <button type="button" className="icon-button h-9 gap-2 px-3 text-xs" disabled={Boolean(busy)} onClick={() => void refreshVoucher(item.id)}>{busy === `status:${item.id}` ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Get voucher</button> : null}{pending ? <button type="button" className="icon-button h-9 gap-1 px-3 text-xs text-red-300" disabled={Boolean(busy)} onClick={() => void cancel(item.id)}><X size={13} /> Cancel</button> : null}</div></div>{voucher?.display_code ? <div className="mt-3 flex items-center justify-between rounded-xl bg-black/15 px-3 py-2 font-mono text-sm text-[var(--text-primary)]"><span>{voucher.display_code}</span><button type="button" aria-label="Copy voucher code" onClick={() => void navigator.clipboard.writeText(voucher.display_code || '').then(() => toast.success('Code copied.'))}><Copy size={14} /></button></div> : null}{item.expires_at && pending ? <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-soft)]"><Clock3 size={12} /> Expires {new Date(item.expires_at).toLocaleString()}</p> : null}{item.status === 'completed' ? <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--brand-teal)]"><CheckCircle2 size={12} /> Added to your Cheza Wallet</p> : null}</div>; })}</div></div> : null}

      <div className="border-t border-[var(--border-subtle)] px-5 py-3 text-xs leading-5 text-[var(--text-soft)]">Cheza Credit is not cash. It cannot be withdrawn, transferred, sold, or converted back into RP.</div>
    </section>
  );
}
