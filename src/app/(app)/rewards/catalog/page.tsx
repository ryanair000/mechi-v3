'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, ChevronDown, Copy, RefreshCw } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { RewardActiveCode, RewardCatalogItem, RewardSummary } from '@/types/rewards';

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="text-xs font-semibold text-[var(--text-soft)]">{label}</span>
      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-soft)]">
        {count}
      </span>
    </div>
  );
}

function sanitizeRewardLabel(value: string) {
  return value.replace(/chezahub/gi, '').replace(/\s{2,}/g, ' ').trim();
}

function getRedeemableGroup(item: RewardCatalogItem) {
  const value = `${item.id} ${item.title} ${item.sku_name ?? ''}`.toLowerCase();

  if (value.includes('codm') || value.includes('_cp_') || value.includes(' cp')) {
    return 'codm';
  }

  if (value.includes('pubg') || value.includes('pubgm') || value.includes('_uc_') || value.includes(' uc')) {
    return 'pubg';
  }

  if (value.includes('efootball') || value.includes('_coins_') || value.includes(' coins')) {
    return 'efootball';
  }

  return 'other';
}

function CatalogSection({
  label,
  count,
  defaultOpen,
  children,
}: {
  label: string;
  count: number;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mb-1 flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-soft)]">{label}</span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-soft)]">
            {count}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--text-soft)] transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>

      {open && <div className="border-t border-[var(--border-color)]">{children}</div>}
    </div>
  );
}

function WalletStatus({ ready, available }: { ready: boolean; available: number }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {ready ? 'Redeemables ready on Mechi' : 'Redeemables activate on first redeem'}
        </p>
        <p className="text-[11px] text-[var(--text-soft)]">
          Redeemables are claimed and tracked on Mechi, and fulfillment updates stay in your rewards activity.
        </p>
      </div>
      <span className="text-sm font-black text-[var(--text-primary)]">
        {available.toLocaleString()} RP
      </span>
    </div>
  );
}

function formatStatus(redemption: RewardActiveCode) {
  if (redemption.source === 'mechi_native') {
    return 'Applied in Mechi';
  }

  if (redemption.partner_status) {
    return sanitizeRewardLabel(redemption.partner_status.replace(/_/g, ' '));
  }

  if (redemption.status === 'claimed') {
    return 'Redeemed';
  }

  return 'Processing';
}

function RecentRedemptions({
  redemptions,
  onCopy,
}: {
  redemptions: RewardSummary['active_codes'];
  onCopy: (code: string) => void;
}) {
  if (redemptions.length === 0) return null;

  return (
    <div className="mb-8">
      <SectionLabel label="Recent redemptions" count={redemptions.length} />
      <div className="border-t border-[var(--border-color)]">
        {redemptions.map((redemption) => (
          <div
            key={redemption.id}
            className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {sanitizeRewardLabel(redemption.title)}
                </p>
                <span className="brand-chip px-2 py-0.5 text-[10px] capitalize">
                  {formatStatus(redemption)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-soft)]">
                {redemption.source === 'mechi_native'
                  ? 'This perk is active on your Mechi account.'
                  : 'Fulfillment updates and any codes will appear here in Mechi.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {redemption.code ? (
                <>
                  <code className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-sm font-black text-[var(--text-primary)]">
                    {redemption.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => onCopy(redemption.code!)}
                    className="icon-button h-8 w-8"
                    aria-label="Copy code"
                  >
                    <Copy size={13} />
                  </button>
                </>
              ) : redemption.source !== 'mechi_native' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-soft)]">
                  <CheckCircle2 size={12} />
                  Tracked on Mechi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 size={12} />
                  Active
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CatalogRow({
  item,
  canAfford,
  redeeming,
  onRedeem,
}: {
  item: RewardCatalogItem;
  canAfford: boolean;
  redeeming: boolean;
  onRedeem: () => void;
}) {
  const disabled = redeeming || !canAfford;
  const partnerReward = item.source !== 'mechi_native';

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {sanitizeRewardLabel(item.title)}
          </p>
          <span className="brand-chip px-2 py-0.5 text-[10px]">
            {item.points_cost.toLocaleString()} RP
          </span>
          {typeof item.value_kes === 'number' && (
            <span className="brand-chip px-2 py-0.5 text-[10px]">
              ~KSh {item.value_kes.toLocaleString('en-KE')}
            </span>
          )}
          {partnerReward ? (
            <span className="brand-chip px-2 py-0.5 text-[10px]">Redeemable</span>
          ) : (
            <span className="brand-chip-coral px-2 py-0.5 text-[10px]">Mechi perk</span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--text-soft)]">{item.description}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRedeem}
          disabled={disabled}
          className={
            canAfford ? 'btn-primary min-h-8 px-3 py-1.5 text-xs' : 'btn-ghost min-h-8 px-3 py-1.5 text-xs'
          }
        >
          {redeeming ? 'Redeeming...' : !canAfford ? 'Not enough RP' : 'Redeem'}
        </button>
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
        <div
          key={n}
          className="flex items-center gap-3 border-b border-[var(--border-color)] py-3 last:border-0"
        >
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

export default function RewardCatalogPage() {
  const authFetch = useAuthFetch();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);
      setCatalogError(null);

      const [summaryResult, catalogResult] = await Promise.allSettled([
        authFetch('/api/rewards/summary').then(async (response) => {
          const data = (await response.json()) as { error?: string; summary?: RewardSummary };
          if (!response.ok || !data.summary) throw new Error(data.error ?? 'Could not load rewards.');
          return data.summary;
        }),
        authFetch('/api/rewards/catalog').then(async (response) => {
          const data = (await response.json()) as { error?: string; items?: RewardCatalogItem[] };
          if (!response.ok) throw new Error(data.error ?? 'Could not load catalog.');
          return data.items ?? [];
        }),
      ]);

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value);
      } else {
        setLoadError(
          summaryResult.reason instanceof Error
            ? summaryResult.reason.message
            : 'Could not load rewards.'
        );
      }

      if (catalogResult.status === 'fulfilled') {
        setCatalog(catalogResult.value);
      } else {
        setCatalogError(
          catalogResult.reason instanceof Error
            ? catalogResult.reason.message
            : 'Could not load catalog.'
        );
      }

      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void load();
  }, [load]);

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
        const response = await authFetch('/api/rewards/redeem', {
          method: 'POST',
          body: JSON.stringify({ reward_id: rewardId }),
        });
        const data = (await response.json()) as {
          error?: string;
          redemption?: {
            code?: string | null;
            title: string;
            partner_order_url?: string | null;
            access_hint?: string | null;
          };
        };

        if (!response.ok || !data.redemption) {
          toast.error(data.error ?? 'Could not redeem this reward.');
          return;
        }

        const rewardTitle = sanitizeRewardLabel(data.redemption.title);

        if (data.redemption.code) {
          await navigator.clipboard.writeText(data.redemption.code).catch(() => null);
          toast.success(`${rewardTitle} - code copied.`);
        } else if (data.redemption.access_hint) {
          toast.success(`${rewardTitle} redeemed. Track it in Mechi rewards.`);
        } else {
          toast.success(`${rewardTitle} applied.`);
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
  const partnerItems = catalog.filter((item) => item.source !== 'mechi_native');
  const mechiItems = catalog.filter((item) => item.source === 'mechi_native');
  const codmItems = partnerItems.filter((item) => getRedeemableGroup(item) === 'codm');
  const pubgItems = partnerItems.filter((item) => getRedeemableGroup(item) === 'pubg');
  const efootballItems = partnerItems.filter((item) => getRedeemableGroup(item) === 'efootball');
  const otherRedeemables = partnerItems.filter((item) => getRedeemableGroup(item) === 'other');

  return (
    <div className="page-container max-w-[52rem]">
      <div className="flex items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/rewards" className="icon-button h-9 w-9" aria-label="Back to rewards">
            <ArrowLeft size={14} />
          </Link>
          <h1 className="text-xl font-black text-[var(--text-primary)]">Redeemables</h1>
        </div>
        <button
          type="button"
          onClick={() => void load({ silent: true })}
          disabled={loading || refreshing}
          className="icon-button h-9 w-9"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
        </button>
      </div>

      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 text-xs font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {catalogError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <span>{catalogError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 text-xs font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <Skeleton />
      ) : (
        <>
          {summary && <WalletStatus ready={summary.linked} available={available} />}

          <RecentRedemptions
            redemptions={summary?.active_codes ?? []}
            onCopy={(code) => void handleCopy(code)}
          />

          <div className="space-y-8">
            <CatalogSection label="CODM redeemables" count={codmItems.length} defaultOpen>
              {codmItems.map((item) => (
                <CatalogRow
                  key={item.id}
                  item={item}
                  canAfford={available >= item.points_cost}
                  redeeming={redeemingId === item.id}
                  onRedeem={() => void handleRedeem(item.id)}
                />
              ))}
            </CatalogSection>

            <CatalogSection label="PUBG UC redeemables" count={pubgItems.length} defaultOpen>
              {pubgItems.map((item) => (
                <CatalogRow
                  key={item.id}
                  item={item}
                  canAfford={available >= item.points_cost}
                  redeeming={redeemingId === item.id}
                  onRedeem={() => void handleRedeem(item.id)}
                />
              ))}
            </CatalogSection>

            <CatalogSection label="eFootball coins redeemables" count={efootballItems.length} defaultOpen>
              {efootballItems.map((item) => (
                <CatalogRow
                  key={item.id}
                  item={item}
                  canAfford={available >= item.points_cost}
                  redeeming={redeemingId === item.id}
                  onRedeem={() => void handleRedeem(item.id)}
                />
              ))}
            </CatalogSection>

            <CatalogSection label="Other redeemables" count={otherRedeemables.length} defaultOpen>
              {otherRedeemables.map((item) => (
                <CatalogRow
                  key={item.id}
                  item={item}
                  canAfford={available >= item.points_cost}
                  redeeming={redeemingId === item.id}
                  onRedeem={() => void handleRedeem(item.id)}
                />
              ))}
            </CatalogSection>

            {mechiItems.length > 0 && (
              <CatalogSection label="Mechi perks" count={mechiItems.length} defaultOpen={false}>
                {mechiItems.map((item) => (
                  <CatalogRow
                    key={item.id}
                    item={item}
                    canAfford={available >= item.points_cost}
                    redeeming={redeemingId === item.id}
                    onRedeem={() => void handleRedeem(item.id)}
                  />
                ))}
              </CatalogSection>
            )}

            {catalog.length === 0 && !loading && (
              <div className="py-14 text-center">
                <p className="text-sm text-[var(--text-soft)]">No redeemables available right now.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
