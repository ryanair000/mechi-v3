'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS, getSelectableGameKeys } from '@/lib/config';
import { COUNTRY_OPTIONS, getRegionsForCountry, resolveProfileLocation } from '@/lib/location';
import { getPlan, resolvePlan } from '@/lib/plans';
import { getTournamentPrize } from '@/lib/tournament-metrics';
import {
  formatTournamentDateTime,
  getDefaultTournamentScheduleValue,
  getTournamentCheckInDate,
  toDateTimeLocalValue,
} from '@/lib/tournament-schedule';
import type { CountryKey, GameKey, Plan, PlatformKey, TournamentPrizePoolMode } from '@/types';

const TOURNAMENT_SIZES = [4, 8, 16] as const;

type TournamentHostAccess = {
  plan: Plan;
  can_host: boolean;
  platform_fee_percent: number;
  elite_fee_free_limit: number;
  elite_fee_free_used: number;
  elite_fee_free_remaining: number;
  fee_waived: boolean;
};

export default function CreateTournamentPage() {
  const { user, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();
  const tournamentGames = useMemo(
    () => getSelectableGameKeys().filter((game) => GAMES[game].mode === '1v1'),
    []
  );
  const userLocation = resolveProfileLocation({
    country: user?.country,
    region: user?.region,
  });
  const [form, setForm] = useState({
    title: '',
    game: tournamentGames[0] ?? 'fc26',
    platform: GAMES[tournamentGames[0] ?? 'fc26']?.platforms[0] ?? 'ps',
    country: '' as CountryKey | '',
    region: '',
    size: 4,
    scheduled_for: getDefaultTournamentScheduleValue(),
    entry_type: 'paid' as 'paid' | 'free',
    entry_fee: 0,
    prize_pool_mode: 'auto' as TournamentPrizePoolMode,
    prize_pool: 0,
    rules: '',
  });
  const [creating, setCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<ActionFeedbackState | null>(null);
  const [hostAccess, setHostAccess] = useState<TournamentHostAccess | null>(null);
  const [hostAccessLoading, setHostAccessLoading] = useState(false);

  const platforms = GAMES[form.game]?.platforms ?? [];
  const availableRegions = getRegionsForCountry(form.country || null);
  const currentPlan = getPlan(resolvePlan(user?.plan, user?.plan_expires_at));
  const canHostTournaments = hostAccess?.can_host ?? currentPlan.id !== 'free';
  const effectivePlatformFeePercent =
    hostAccess?.platform_fee_percent ?? currentPlan.tournamentFeePercent;
  const effectiveEntryFee = form.entry_type === 'free' ? 0 : form.entry_fee;
  const autoPrizeAtCapacity = useMemo(
    () => getTournamentPrize(effectiveEntryFee, form.size, effectivePlatformFeePercent),
    [effectiveEntryFee, effectivePlatformFeePercent, form.size]
  );
  const displayedPrizePool =
    form.prize_pool_mode === 'specified' ? form.prize_pool : autoPrizeAtCapacity.prizePool;

  useEffect(() => {
    if (!userLocation.country && !userLocation.region) {
      return;
    }

    setForm((current) => {
      if (current.country || current.region) {
        return current;
      }

      return {
        ...current,
        country: userLocation.country ?? '',
        region: userLocation.region,
      };
    });
  }, [userLocation.country, userLocation.region]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setHostAccess(null);
      setHostAccessLoading(false);
      return;
    }

    let cancelled = false;
    setHostAccessLoading(true);

    void authFetch('/api/tournaments/host-access')
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          access?: TournamentHostAccess;
        };

        if (cancelled) {
          return;
        }

        setHostAccess(response.ok ? (data.access ?? null) : null);
      })
      .catch(() => {
        if (!cancelled) {
          setHostAccess(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHostAccessLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, authLoading, user?.id, user?.plan, user?.plan_expires_at]);

  const handleCreate = async () => {
    if (!canHostTournaments) {
      setCreateFeedback({
        tone: 'error',
        title: 'Pro or Elite is required to host tournaments.',
        detail: 'Upgrade from Free to start hosting. Free players can still join tournaments.',
      });
      toast.error('Upgrade to Pro or Elite to host tournaments');
      return;
    }

    if (!form.title.trim()) {
      setCreateFeedback({
        tone: 'error',
        title: 'Give the bracket a name first.',
        detail: 'Players need a title they can recognize before you publish the tournament.',
      });
      toast.error('Name the bracket first');
      return;
    }

    if (!form.country || !form.region) {
      setCreateFeedback({
        tone: 'error',
        title: 'Set the tournament location first.',
        detail: 'Choose the country and region players should expect this bracket to run from.',
      });
      toast.error('Choose country and region');
      return;
    }

    if (!form.scheduled_for.trim()) {
      setCreateFeedback({
        tone: 'error',
        title: 'Set the tournament kickoff time first.',
        detail: 'Players need a clear date and time before they can register for this bracket.',
      });
      toast.error('Choose the tournament date and time');
      return;
    }

    const scheduledAt = new Date(form.scheduled_for);
    if (Number.isNaN(scheduledAt.getTime())) {
      setCreateFeedback({
        tone: 'error',
        title: 'Choose a valid kickoff time.',
        detail: 'The tournament date and time must be a real future moment.',
      });
      toast.error('Choose a valid tournament date and time');
      return;
    }

    if (scheduledAt.getTime() <= Date.now()) {
      setCreateFeedback({
        tone: 'error',
        title: 'Choose a future kickoff time.',
        detail: 'This bracket needs to be scheduled for later so players can check in on time.',
      });
      toast.error('Choose a future tournament date and time');
      return;
    }

    if (form.prize_pool_mode === 'specified' && form.prize_pool <= 0) {
      setCreateFeedback({
        tone: 'error',
        title: 'Add the specified prize pool amount.',
        detail: 'Enter the guaranteed prize amount, or switch the bracket back to auto.',
      });
      toast.error('Enter a specified prize pool');
      return;
    }

    setCreating(true);
    setCreateFeedback({
      tone: 'loading',
      title: 'Creating your tournament...',
      detail: "We're saving the bracket settings and locking your own organizer slot.",
    });

    try {
      const res = await authFetch('/api/tournaments', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          scheduled_for: scheduledAt.toISOString(),
          entry_fee: effectiveEntryFee,
          prize_pool: form.prize_pool_mode === 'specified' ? form.prize_pool : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateFeedback({
          tone: 'error',
          title: 'Tournament creation failed.',
          detail: data.error ?? 'Please adjust the bracket settings and try again.',
        });
        toast.error(data.error ?? 'Could not create tournament');
        return;
      }
      setCreateFeedback({
        tone: 'success',
        title: 'Tournament created.',
        detail: 'Opening the bracket page now so you can invite players and start it later.',
      });
      toast.success('Tournament created');
      router.push(`/t/${data.tournament.slug}`);
    } catch {
      setCreateFeedback({
        tone: 'error',
        title: 'Tournament creation failed.',
        detail: 'We could not reach the server. Please try again.',
      });
      toast.error('Could not create tournament');
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || (user?.id && hostAccessLoading)) {
    return (
      <div className="page-container">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="card circuit-panel p-6">
            <div className="h-6 w-28 shimmer rounded-full" />
            <div className="mt-4 h-10 shimmer rounded-2xl" />
            <div className="mt-3 h-16 shimmer rounded-2xl" />
          </div>
          <div className="card space-y-4 p-5 sm:p-6">
            <div className="h-12 shimmer rounded-2xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-12 shimmer rounded-2xl" />
              <div className="h-12 shimmer rounded-2xl" />
            </div>
            <div className="h-48 shimmer rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!canHostTournaments) {
    return (
      <div className="page-container">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.back()}
            className="brand-link mb-5 inline-flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="card circuit-panel p-6">
            <p className="brand-kicker">Tournament Hosting</p>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-[var(--text-primary)]">
              Pro and Elite members host tournaments
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Free players can still join brackets, but hosting now starts on Pro. Elite adds
              three fee-free tournaments each month plus streaming-ready tools when you want the
              full event lane.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="text-sm font-black text-[var(--text-primary)]">
                  Pro hosting
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  Create brackets, set the game rules, and choose auto or specified prize pools.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="text-sm font-black text-[var(--text-primary)]">
                  Elite allowance
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  Elite covers your first three tournaments each month without platform cost.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="text-sm font-black text-[var(--text-primary)]">Free plan</p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                  Stay in the mix by joining open brackets even before you start hosting.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/pricing" className="btn-primary justify-center">
                Upgrade to Pro
              </Link>
              <Link href="/tournaments" className="btn-ghost justify-center">
                Browse tournaments
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.back()}
          className="brand-link mb-5 inline-flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="card circuit-panel mb-5 p-6">
          <p className="brand-kicker">New Bracket</p>
          <h1 className="mt-3 text-3xl font-black tracking-normal text-[var(--text-primary)]">
            Create a tournament
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Lock the game, choose how the prize pool works, and let Mechi handle the bracket once
            results start landing.
          </p>
          {hostAccess?.plan === 'elite' ? (
            <div className="mt-4 inline-flex rounded-full border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] px-3 py-2 text-xs font-semibold text-[var(--accent-secondary-text)]">
              {hostAccess.elite_fee_free_remaining} of {hostAccess.elite_fee_free_limit} fee-free
              tournaments left this month
            </div>
          ) : null}
        </div>

        <div className="card space-y-5 p-5 sm:p-6">
          <div>
            <label className="label">Tournament name</label>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="input"
              maxLength={80}
              placeholder="e.g. Friday FC Climb"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Game</label>
              <select
                value={form.game}
                onChange={(event) => {
                  const game = event.target.value as GameKey;
                  setForm((current) => ({
                    ...current,
                    game,
                    platform: GAMES[game].platforms[0],
                  }));
                }}
                className="input"
              >
                {tournamentGames.map((game) => (
                  <option key={game} value={game}>
                    {GAMES[game].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Platform</label>
              <select
                value={form.platform}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    platform: event.target.value as PlatformKey,
                  }))
                }
                className="input"
              >
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {PLATFORMS[platform].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Country</label>
              <select
                value={form.country}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    country: event.target.value as CountryKey | '',
                    region: '',
                  }))
                }
                className="input"
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Region</label>
              <select
                value={form.region}
                onChange={(event) =>
                  setForm((current) => ({ ...current, region: event.target.value }))
                }
                className="input"
                disabled={!form.country}
              >
                <option value="">{form.country ? 'Select region' : 'Choose country first'}</option>
                {availableRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Slots</label>
              <select
                value={form.size}
                onChange={(event) =>
                  setForm((current) => ({ ...current, size: Number(event.target.value) }))
                }
                className="input"
              >
                {TOURNAMENT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} players
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Tournament date and time</label>
              <input
                type="datetime-local"
                value={form.scheduled_for}
                onChange={(event) =>
                  setForm((current) => ({ ...current, scheduled_for: event.target.value }))
                }
                className="input"
                min={toDateTimeLocalValue(new Date())}
              />
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Check-in opens
              </p>
              <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                {formatTournamentDateTime(
                  getTournamentCheckInDate(form.scheduled_for),
                  'Set the kickoff first'
                )}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                Players can check in 1 hour before the scheduled kickoff.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Entry type</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  key: 'paid' as const,
                  title: 'Paid entry',
                  copy: 'Players pay to join. Use auto prize mode to grow the pool from successful paid checkouts.',
                },
                {
                  key: 'free' as const,
                  title: 'Free entry',
                  copy: 'Open the bracket without charging players and use specified prize mode if you still want a cash payout.',
                },
              ].map((entryType) => {
                const isSelected = form.entry_type === entryType.key;
                return (
                  <button
                    key={entryType.key}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        entry_type: entryType.key,
                        entry_fee:
                          entryType.key === 'free' ? 0 : Math.max(0, current.entry_fee || 0),
                      }))
                    }
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-[rgba(255,107,107,0.28)] bg-[var(--accent-primary-soft)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:border-[rgba(50,224,196,0.22)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <p className="text-sm font-black text-[var(--text-primary)]">
                      {entryType.title}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                      {entryType.copy}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">Entry fee</label>
            {form.entry_type === 'paid' ? (
              <input
                type="number"
                min={0}
                value={form.entry_fee}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    entry_fee: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
                className="input"
                placeholder="Amount in KES"
              />
            ) : (
              <div className="input flex items-center text-[var(--text-soft)]">Free entry</div>
            )}
          </div>

          <div>
            <label className="label">Prize pool mode</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  key: 'auto' as const,
                  title: 'Auto prize pool',
                  copy:
                    form.entry_type === 'paid'
                      ? 'Calculate the pool from paid entries as players check out.'
                      : 'Free entry keeps auto mode at KES 0, so switch to specified if you want a guaranteed payout.',
                },
                {
                  key: 'specified' as const,
                  title: 'Specified prize pool',
                  copy:
                    'Set the cash amount yourself up front and keep it fixed on the bracket page.',
                },
              ].map((mode) => {
                const isSelected = form.prize_pool_mode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        prize_pool_mode: mode.key,
                      }))
                    }
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.1)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:border-[rgba(255,107,107,0.22)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <p className="text-sm font-black text-[var(--text-primary)]">{mode.title}</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                      {mode.copy}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                {form.prize_pool_mode === 'specified'
                  ? 'Specified prize pool'
                  : 'Auto prize preview at full slots'}
              </label>
              {form.prize_pool_mode === 'specified' ? (
                <input
                  type="number"
                  min={0}
                  value={form.prize_pool}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      prize_pool: Math.max(0, Number(event.target.value) || 0),
                    }))
                  }
                  className="input"
                  placeholder="Amount in KES"
                />
              ) : (
                <div className="input flex items-center text-[var(--text-soft)]">
                  {autoPrizeAtCapacity.prizePool > 0
                    ? `Up to KES ${autoPrizeAtCapacity.prizePool.toLocaleString()}`
                    : 'KES 0 at the current settings'}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Live prize preview
              </p>
              <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                KES {displayedPrizePool.toLocaleString()}
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                {form.prize_pool_mode === 'specified'
                  ? 'This amount stays fixed on the tournament.'
                  : 'This is the top-end pool if every slot pays in.'}
              </p>
            </div>
          </div>

          <div>
            <label className="label">Rules</label>
            <textarea
              value={form.rules}
              onChange={(event) =>
                setForm((current) => ({ ...current, rules: event.target.value }))
              }
              className="input min-h-28 resize-none"
              maxLength={800}
              placeholder="Example: Best of 1. Screenshot disputes. No rage quits."
            />
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--text-secondary)]">
            <div className="mb-2 flex items-center gap-2 font-black text-[var(--text-primary)]">
              <Trophy size={15} className="text-[var(--brand-coral)]" />
              Prize setup
            </div>
            {form.prize_pool_mode === 'specified'
              ? `Specified mode keeps the prize pool fixed at KES ${form.prize_pool.toLocaleString()} from the moment you publish the bracket.`
              : form.entry_type === 'free'
                ? 'Auto mode with free entry stays at KES 0. Switch to specified mode if you want to guarantee a cash payout.'
                : `Auto mode grows only from paid slots. At full capacity this bracket would reach up to KES ${autoPrizeAtCapacity.prizePool.toLocaleString()}.`}
          </div>

          {createFeedback ? (
            <ActionFeedback
              tone={createFeedback.tone}
              title={createFeedback.title}
              detail={createFeedback.detail}
            />
          ) : null}

          <button onClick={handleCreate} disabled={creating} className="btn-primary w-full">
            {creating ? 'Creating...' : 'Create Tournament'}
          </button>
        </div>
      </div>
    </div>
  );
}
