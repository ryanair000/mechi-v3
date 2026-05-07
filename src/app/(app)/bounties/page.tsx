'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Trophy, Wallet, Zap } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { BOUNTY_TRIGGER_META, type EnrichedBounty } from '@/lib/bounties';

function formatKes(value: number) {
  return `KES ${value.toLocaleString('en-KE')}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getCategoryTone(triggerType: EnrichedBounty['trigger_type']) {
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

export default function BountiesPage() {
  const authFetch = useAuthFetch();
  const [bounties, setBounties] = useState<EnrichedBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showClaimed, setShowClaimed] = useState(false);

  const loadBounties = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await authFetch('/api/bounties');
        const data = (await response.json().catch(() => null)) as
          | { error?: string; bounties?: EnrichedBounty[] }
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
    void loadBounties();
  }, [loadBounties]);

  const activeBounties = useMemo(
    () => bounties.filter((bounty) => bounty.status === 'active'),
    [bounties]
  );
  const claimedBounties = useMemo(
    () => bounties.filter((bounty) => bounty.status === 'claimed').slice(0, 10),
    [bounties]
  );

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Bounties</p>
          </div>

          <button
            type="button"
            onClick={() => void loadBounties({ silent: true })}
            className="btn-ghost whitespace-nowrap"
            disabled={refreshing}
          >
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Live now',
              value: activeBounties.length,
              icon: Zap,
              tone: 'rgba(50,224,196,0.16)',
            },
            {
              label: 'Recently claimed',
              value: claimedBounties.length,
              icon: Trophy,
              tone: 'rgba(255,107,107,0.16)',
            },
            {
              label: 'Fast payout',
              value: '24h',
              icon: Wallet,
              tone: 'rgba(246,196,83,0.16)',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: item.tone }}
                >
                  <item.icon size={18} className="text-[var(--text-primary)]" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{item.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-title">Active bounties</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Live challenges</h2>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-64 shimmer rounded-[1.8rem]" />
            <div className="h-64 shimmer rounded-[1.8rem]" />
          </div>
        ) : activeBounties.length === 0 ? (
          <div className="card p-5 text-sm leading-7 text-[var(--text-secondary)]">
            No live bounties right now. Check back after the next challenge goes live.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {activeBounties.map((bounty) => (
              <article
                key={bounty.id}
                className="card overflow-hidden border-[rgba(50,224,196,0.12)] bg-[linear-gradient(180deg,rgba(50,224,196,0.05),rgba(11,17,29,0.94))] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Prize
                    </p>
                    <p className="mt-2 text-3xl font-black text-[var(--brand-teal)]">
                      {formatKes(bounty.prize_kes)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                    Live
                  </span>
                </div>

                <div className="mt-5">
                  <h3 className="text-xl font-black text-[var(--text-primary)]">{bounty.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {bounty.description}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getCategoryTone(
                      bounty.trigger_type
                    )}`}
                  >
                    {BOUNTY_TRIGGER_META[bounty.trigger_type].category}
                  </span>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {BOUNTY_TRIGGER_META[bounty.trigger_type].label}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setShowClaimed((current) => !current)}
        >
          <div>
            <p className="section-title">Claimed bounties</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Last 10 winners</h2>
          </div>
          <span className="btn-ghost">
            {showClaimed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showClaimed ? 'Hide' : 'Show'}
          </span>
        </button>

        {showClaimed ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {claimedBounties.length === 0 ? (
              <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-sm text-[var(--text-secondary)] md:col-span-2">
                No claimed bounties yet.
              </div>
            ) : (
              claimedBounties.map((bounty) => (
                <article
                  key={bounty.id}
                  className={`rounded-[1.8rem] border p-5 ${
                    bounty.claimed_by_me
                      ? 'border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)]'
                      : 'border-[var(--border-color)] bg-[rgba(255,255,255,0.02)] opacity-85'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                        Prize
                      </p>
                      <p className="mt-2 text-3xl font-black text-[var(--brand-teal)]">
                        {formatKes(bounty.prize_kes)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      Claimed
                    </span>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-xl font-black text-[var(--text-primary)]">{bounty.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      {bounty.description}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getCategoryTone(
                        bounty.trigger_type
                      )}`}
                    >
                      {BOUNTY_TRIGGER_META[bounty.trigger_type].category}
                    </span>
                    <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      {formatDateTime(bounty.claimed_at)}
                    </span>
                  </div>

                  {bounty.claimed_by_me ? (
                    <div className="mt-5 rounded-2xl border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                      You won this — payout within 24hrs
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      Claimed by @{bounty.winner?.username ?? 'unknown'}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
