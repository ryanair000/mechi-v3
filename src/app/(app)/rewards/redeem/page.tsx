'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { RewardCatalogItem, RewardRedemptionRequest, RewardSummary } from '@/types/rewards';

type CatalogResponse = {
  error?: string;
  items?: RewardCatalogItem[];
  profile_phone?: string | null;
};

function formatKes(value: number) {
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatStatus(status: RewardRedemptionRequest['status']) {
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

function statusTone(status: RewardRedemptionRequest['status']) {
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

function gameLabel(game: RewardCatalogItem['game']) {
  switch (game) {
    case 'codm':
      return 'CODM Rewards';
    case 'pubgm':
      return 'PUBG UC Rewards';
    case 'efootball':
    default:
      return 'eFootball Coins Rewards';
  }
}

function RecentRequests({ items }: { items: RewardSummary['recent_redemptions'] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-6 text-sm text-[var(--text-secondary)]">
        No reward requests yet. Select a package below, enter an M-Pesa number, and we will queue it for fulfillment.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 4).map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold uppercase tracking-[0.05em] text-[var(--text-primary)]">
                  {item.game}
                </p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(item.status)}`}>
                  {formatStatus(item.status)}
                </span>
              </div>
              <p className="mt-2 text-lg font-black text-[var(--text-primary)]">{item.reward_amount_label}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                KSh {formatKes(item.cost_kes)} • {item.cost_points.toLocaleString()} points
              </p>
            </div>
            <p className="text-xs text-[var(--text-soft)]">{formatDateTime(item.submitted_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RewardRow({
  item,
  availablePoints,
  selectedId,
  onSelect,
}: {
  item: RewardCatalogItem;
  availablePoints: number;
  selectedId: string | null;
  onSelect: (item: RewardCatalogItem) => void;
}) {
  const canAfford = availablePoints >= item.cost_points;
  const selected = selectedId === item.id;

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        selected
          ? 'border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.08)]'
          : 'border-[var(--border-color)] bg-[var(--surface-soft)]'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-black text-[var(--text-primary)]">{item.reward_amount_label}</p>
            {selected ? (
              <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                Selected
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            KSh {formatKes(item.cost_kes)} • {item.cost_points.toLocaleString()} points
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSelect(item)}
          className={canAfford ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
        >
          {canAfford ? (selected ? 'Ready to confirm' : 'Redeem') : 'Not enough points'}
        </button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="h-24 w-full rounded-3xl shimmer" />
      <div className="h-72 w-full rounded-3xl shimmer" />
      <div className="h-64 w-full rounded-3xl shimmer" />
    </div>
  );
}

export default function RewardsRedeemPage() {
  const authFetch = useAuthFetch();
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>([]);
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<RewardCatalogItem | null>(null);
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [summaryResponse, catalogResponse] = await Promise.all([
          authFetch('/api/rewards/summary'),
          authFetch('/api/rewards/catalog'),
        ]);

        const summaryData = (await summaryResponse.json()) as { error?: string; summary?: RewardSummary };
        const catalogData = (await catalogResponse.json()) as CatalogResponse;

        if (!summaryResponse.ok || !summaryData.summary) {
          throw new Error(summaryData.error ?? 'Could not load wallet summary.');
        }

        if (!catalogResponse.ok) {
          throw new Error(catalogData.error ?? 'Could not load rewards catalog.');
        }

        setSummary(summaryData.summary);
        setCatalog(catalogData.items ?? []);

        const nextPhone = catalogData.profile_phone ?? '';
        setProfilePhone(nextPhone);
        setMpesaNumber((current) => current || nextPhone);
        setSelectedItem((current) =>
          current ? (catalogData.items ?? []).find((item) => item.id === current.id) ?? null : null
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load redeem page.');
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
    void load();
  }, [load]);

  const availablePoints = summary?.balances.points_available ?? 0;
  const groupedCatalog = useMemo(() => {
    return {
      codm: catalog.filter((item) => item.game === 'codm'),
      pubgm: catalog.filter((item) => item.game === 'pubgm'),
      efootball: catalog.filter((item) => item.game === 'efootball'),
    };
  }, [catalog]);

  const handleSelect = useCallback(
    (item: RewardCatalogItem) => {
      setSelectedItem(item);
      setMpesaNumber((current) => current || profilePhone);
    },
    [profilePhone]
  );

  const handleRedeem = useCallback(async () => {
    if (!selectedItem) {
      toast.error('Choose a reward first.');
      return;
    }

    setRedeeming(true);

    try {
      const response = await authFetch('/api/rewards/redeem', {
        method: 'POST',
        body: JSON.stringify({
          reward_id: selectedItem.id,
          mpesa_number: mpesaNumber,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        request?: RewardRedemptionRequest;
      };

      if (!response.ok || !data.request) {
        toast.error(data.error ?? 'Could not submit this redemption.');
        return;
      }

      toast.success(`${selectedItem.reward_amount_label} queued for fulfillment.`);
      setSelectedItem(null);
      setMpesaNumber(profilePhone);
      await load({ silent: true });
    } catch {
      toast.error('Network error while redeeming.');
    } finally {
      setRedeeming(false);
    }
  }, [authFetch, load, mpesaNumber, profilePhone, selectedItem]);

  return (
    <div className="page-container max-w-[62rem] space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/rewards" className="icon-button mt-1 h-10 w-10" aria-label="Back to rewards">
            <ArrowLeft size={15} />
          </Link>
          <div>
            <p className="brand-kicker">Redeem rewards</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Spend points on game rewards.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Select a package, confirm the M-Pesa number, and Mechi will queue the request for manual fulfillment.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void load({ silent: true })}
          disabled={loading || refreshing}
          className="icon-button h-10 w-10"
          aria-label="Refresh redeem page"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : undefined} />
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_1fr]">
            <div className="rounded-3xl border border-[var(--accent-secondary)]/20 bg-[var(--accent-secondary)]/8 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Available wallet value
              </p>
              <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                KSh {formatKes(summary?.wallet.available_kes ?? 0)}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{summary?.wallet.rate_label}</p>
            </div>
            <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Available points
              </p>
              <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                {availablePoints.toLocaleString()}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Profile phone
              </p>
              <p className="mt-3 text-xl font-black text-[var(--text-primary)]">
                {profilePhone || 'Add on redeem'}
              </p>
            </div>
          </div>

          <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
            <div>
              <p className="text-lg font-black text-[var(--text-primary)]">Recent requests</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Your last few redemptions stay visible here while we fulfill them.
              </p>
            </div>
            <div className="mt-5">
              <RecentRequests items={summary?.recent_redemptions ?? []} />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              {(['codm', 'pubgm', 'efootball'] as const).map((game) => (
                <div
                  key={game}
                  className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-5"
                >
                  <div>
                    <p className="text-lg font-black text-[var(--text-primary)]">{gameLabel(game)}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Fixed Mechi reward packages priced directly from your points wallet.
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {groupedCatalog[game].map((item) => (
                      <RewardRow
                        key={item.id}
                        item={item}
                        availablePoints={availablePoints}
                        selectedId={selectedItem?.id ?? null}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-soft)] p-5 xl:sticky xl:top-6">
              <div>
                <p className="text-lg font-black text-[var(--text-primary)]">Confirm redemption</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Enter the M-Pesa number to use for this reward request.
                </p>
              </div>

              {selectedItem ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 size={14} />
                      <p className="text-sm font-bold">{selectedItem.title}</p>
                    </div>
                    <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">
                      {selectedItem.reward_amount_label}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      KSh {formatKes(selectedItem.cost_kes)} • {selectedItem.cost_points.toLocaleString()} points
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      M-Pesa number
                    </span>
                    <input
                      value={mpesaNumber}
                      onChange={(event) => setMpesaNumber(event.target.value)}
                      className="input"
                      placeholder="0700 000 000"
                      inputMode="tel"
                    />
                  </label>

                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                    We deduct points immediately and show the request on your rewards history while the team processes it.
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRedeem()}
                    disabled={redeeming}
                    className="btn-primary w-full justify-center"
                  >
                    {redeeming ? 'Submitting request...' : `Redeem ${selectedItem.reward_amount_label}`}
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                  Select a reward package from the list to continue.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
