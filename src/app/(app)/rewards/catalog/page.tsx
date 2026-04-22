'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock3, Copy, RefreshCw } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { RewardCatalogItem, RewardSummary } from '@/types/rewards';

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="text-xs font-semibold text-[var(--text-soft)]">{label}</span>
      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-soft)]">{count}</span>
    </div>
  );
}

function AccountStatus({ linked, available, onLink, linking }: {
  linked: boolean; available: number; onLink: () => void; linking: boolean;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-3">
      <div className="flex items-center gap-3">
        {linked
          ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400"><CheckCircle2 size={12} />ChezaHub linked</span>
          : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300"><Clock3 size={12} />ChezaHub not linked</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-black text-[var(--text-primary)]">{available.toLocaleString()} RP</span>
        {!linked && (
          <button type="button" onClick={onLink} disabled={linking} className="btn-primary text-xs">
            {linking ? 'Opening…' : 'Link'}
          </button>
        )}
      </div>
    </div>
  );
}

function ActiveCodes({ codes, onCopy }: { codes: RewardSummary['active_codes']; onCopy: (code: string) => void }) {
  if (codes.length === 0) return null;
  return (
    <div className="mb-8">
      <SectionLabel label="Active codes" count={codes.length} />
      <div className="border-t border-[var(--border-color)]">
        {codes.map((code) => (
          <div key={code.id} className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{code.title}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
                Expires {code.expires_at
                  ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(code.expires_at))
                  : 'No expiry'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {code.code && (
                <code className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-sm font-black text-[var(--text-primary)]">{code.code}</code>
              )}
              {code.code && (
                <button type="button" onClick={() => onCopy(code.code!)} className="icon-button h-8 w-8" aria-label="Copy code">
                  <Copy size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CatalogRow({ item, canAfford, linked, redeeming, onRedeem }: {
  item: RewardCatalogItem;
  canAfford: boolean;
  linked: boolean;
  redeeming: boolean;
  onRedeem: () => void;
}) {
  const needsLink = item.source !== 'mechi_native' && !linked;
  const disabled = redeeming || needsLink || !canAfford;
  const CHEZAHUB_BASE = process.env.NEXT_PUBLIC_CHEZAHUB_BASE_URL || 'https://chezahub.co.ke';
  const CHEZAHUB_REDEEM = process.env.NEXT_PUBLIC_CHEZAHUB_REDEEM_URL || 'https://redeem.chezahub.co.ke';

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
          <span className="brand-chip px-2 py-0.5 text-[10px]">{item.points_cost.toLocaleString()} RP</span>
          {item.reward_type === 'mechi_perk' && <span className="brand-chip-coral px-2 py-0.5 text-[10px]">Mechi perk</span>}
        </div>
        <p className="mt-1 text-xs text-[var(--text-soft)]">{item.description}</p>
        {typeof item.discount_amount_kes === 'number' && (
          <p className="mt-1 text-[11px] text-[var(--text-soft)]">
            KES {item.discount_amount_kes.toLocaleString()} off
            {typeof item.max_order_coverage_percent === 'number' ? ` · max ${item.max_order_coverage_percent}% of basket` : ''}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onRedeem} disabled={disabled}
          className={canAfford && !needsLink ? 'btn-primary min-h-8 px-3 py-1.5 text-xs' : 'btn-ghost min-h-8 px-3 py-1.5 text-xs'}>
          {redeeming ? 'Redeeming…' : needsLink ? 'Link first' : !canAfford ? 'Not enough RP' : 'Redeem'}
        </button>
        {item.source !== 'mechi_native' && (
          <a href={item.reward_type === 'reward_claim' ? CHEZAHUB_REDEEM : CHEZAHUB_BASE}
            target="_blank" rel="noreferrer" className="icon-button h-8 w-8" aria-label="Open ChezaHub">
            <ArrowUpRight size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="h-14 w-full rounded-2xl shimmer" />
      <div className="h-4 w-32 rounded shimmer" />
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3 border-b border-[var(--border-color)] py-3 last:border-0">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-44 rounded shimmer" />
            <div className="h-3 w-28 rounded shimmer" />
          </div>
          <div className="h-8 w-20 rounded shimmer" />
        </div>
      ))}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function RewardCatalogPage() {
  const authFetch = useAuthFetch();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [linkingAccount, setLinkingAccount] = useState(false);

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    silent ? setRefreshing(true) : setLoading(true);
    setLoadError(null);
    setCatalogError(null);
    const [summaryResult, catalogResult] = await Promise.allSettled([
      authFetch('/api/rewards/summary').then(async (r) => {
        const d = (await r.json()) as { error?: string; summary?: RewardSummary };
        if (!r.ok || !d.summary) throw new Error(d.error ?? 'Could not load rewards.');
        return d.summary;
      }),
      authFetch('/api/rewards/catalog').then(async (r) => {
        const d = (await r.json()) as { error?: string; items?: RewardCatalogItem[] };
        if (!r.ok) throw new Error(d.error ?? 'Could not load catalog.');
        return d.items ?? [];
      }),
    ]);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    else setLoadError(summaryResult.reason instanceof Error ? summaryResult.reason.message : 'Could not load rewards.');
    if (catalogResult.status === 'fulfilled') setCatalog(catalogResult.value);
    else setCatalogError(catalogResult.reason instanceof Error ? catalogResult.reason.message : 'Could not load catalog.');
    silent ? setRefreshing(false) : setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleLink = useCallback(async () => {
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

  const handleCopy = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied.');
    } catch {
      toast.error('Failed to copy.');
    }
  }, []);

  const handleRedeem = useCallback(
    async (rewardId: string) => {
      setRedeemingId(rewardId);
      try {
        const res = await authFetch('/api/rewards/redeem', {
          method: 'POST',
          body: JSON.stringify({ reward_id: rewardId }),
        });
        const data = (await res.json()) as {
          error?: string;
          redemption?: { code?: string | null; title: string };
        };
        if (!res.ok || !data.redemption) {
          toast.error(data.error ?? 'Could not redeem this reward.');
          return;
        }
        if (data.redemption.code) {
          await navigator.clipboard.writeText(data.redemption.code).catch(() => null);
          toast.success(`${data.redemption.title} — code copied.`);
        } else {
          toast.success(`${data.redemption.title} applied.`);
        }
        void load({ silent: true });
      } catch {
        toast.error('Network error.');
      } finally {
        setRedeemingId(null);
      }
    },
    [authFetch, load]
  );

  const available = summary?.balances.available ?? 0;
  const linked = summary?.linked ?? false;
  const activeCodes = summary?.active_codes ?? [];

  const chezahubItems = catalog.filter((i) => i.source !== 'mechi_native');
  const mechiItems = catalog.filter((i) => i.source === 'mechi_native');

  return (
    <div className="page-container max-w-[52rem]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/rewards" className="icon-button h-9 w-9" aria-label="Back to rewards"><ArrowLeft size={14} /></Link>
          <h1 className="text-xl font-black text-[var(--text-primary)]">Redeem RP</h1>
        </div>
        <button type="button" onClick={() => void load({ silent: true })} disabled={loading || refreshing} className="icon-button h-9 w-9" aria-label="Refresh">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
        </button>
      </div>

      {/* Summary error banner */}
      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span>{loadError}</span>
          <button type="button" onClick={() => void load()} className="shrink-0 text-xs font-semibold underline underline-offset-2">Retry</button>
        </div>
      )}

      {/* Catalog error banner — non-fatal */}
      {catalogError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <span>{catalogError}</span>
          <button type="button" onClick={() => void load()} className="shrink-0 text-xs font-semibold underline underline-offset-2">Retry</button>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <Skeleton />
      ) : (
        <>
          {/* Account status row */}
          {summary && (
            <AccountStatus
              linked={linked}
              available={available}
              onLink={() => void handleLink()}
              linking={linkingAccount}
            />
          )}

          {/* Active codes — only when present */}
          <ActiveCodes codes={activeCodes} onCopy={(code) => void handleCopy(code)} />

          {/* Catalog sections */}
          <div className="space-y-8">
            {chezahubItems.length > 0 && (
              <div>
                <SectionLabel label="ChezaHub rewards" count={chezahubItems.length} />
                <div className="border-t border-[var(--border-color)]">
                  {chezahubItems.map((item) => (
                    <CatalogRow
                      key={item.id}
                      item={item}
                      canAfford={available >= item.points_cost}
                      linked={linked}
                      redeeming={redeemingId === item.id}
                      onRedeem={() => void handleRedeem(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {mechiItems.length > 0 && (
              <div>
                <SectionLabel label="Mechi perks" count={mechiItems.length} />
                <div className="border-t border-[var(--border-color)]">
                  {mechiItems.map((item) => (
                    <CatalogRow
                      key={item.id}
                      item={item}
                      canAfford={available >= item.points_cost}
                      linked={linked}
                      redeeming={redeemingId === item.id}
                      onRedeem={() => void handleRedeem(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {catalog.length === 0 && !loading && (
              <div className="py-14 text-center">
                <p className="text-sm text-[var(--text-soft)]">No rewards available right now.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
