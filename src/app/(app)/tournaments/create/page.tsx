'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS, getSelectableGameKeys } from '@/lib/config';
import { COUNTRY_OPTIONS, getRegionsForCountry, resolveProfileLocation } from '@/lib/location';
import { getPlan } from '@/lib/plans';
import type { CountryKey, GameKey, PlatformKey } from '@/types';

const TOURNAMENT_SIZES = [4, 8, 16] as const;

export default function CreateTournamentPage() {
  const { user } = useAuth();
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
    entry_type: 'paid' as 'paid' | 'free',
    entry_fee: 0,
    rules: '',
  });
  const [creating, setCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<ActionFeedbackState | null>(null);

  const platforms = GAMES[form.game]?.platforms ?? [];
  const availableRegions = getRegionsForCountry(form.country || null);
  const currentPlan = getPlan(user?.plan ?? 'free');

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

  const handleCreate = async () => {
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
          entry_fee: form.entry_type === 'free' ? 0 : form.entry_fee,
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

  return (
    <div className="page-container">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => router.back()} className="brand-link mb-5 inline-flex items-center gap-2 text-sm font-semibold">
          <ArrowLeft size={14} /> Back
        </button>

        <div className="card circuit-panel mb-5 p-6">
          <p className="brand-kicker">New Bracket</p>
          <h1 className="mt-3 text-3xl font-black tracking-normal text-[var(--text-primary)]">
            Create a tournament
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Lock the game, pick whether entry is paid or free, and let Mechi handle the bracket once results start landing.
          </p>
        </div>

        <div className="card space-y-5 p-5 sm:p-6">
          <div>
            <label className="label">Tournament name</label>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
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
                  setForm((current) => ({ ...current, platform: event.target.value as PlatformKey }))
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
                onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
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
                onChange={(event) => setForm((current) => ({ ...current, size: Number(event.target.value) }))}
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

          <div>
            <label className="label">Entry type</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  key: 'paid' as const,
                  title: 'Paid entry',
                  copy:
                    'Players pay to join, and every successful paid checkout adds to the live prize pool.',
                },
                {
                  key: 'free' as const,
                  title: 'Free entry',
                  copy:
                    currentPlan.id === 'free'
                      ? 'Pro or Elite only. Upgrade if you want to host a free bracket.'
                      : 'Open the bracket without asking players to pay in.',
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
                        entry_fee: entryType.key === 'free' ? 0 : Math.max(0, current.entry_fee || 0),
                      }))
                    }
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-[rgba(255,107,107,0.28)] bg-[var(--accent-primary-soft)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:border-[rgba(50,224,196,0.22)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <p className="text-sm font-black text-[var(--text-primary)]">{entryType.title}</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{entryType.copy}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Entry fee</label>
              {form.entry_type === 'paid' ? (
                <input
                  type="number"
                  min={0}
                  value={form.entry_fee}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, entry_fee: Number(event.target.value) }))
                  }
                  className="input"
                  placeholder="Amount in KES"
                />
              ) : (
                <div className="input flex items-center text-[var(--text-soft)]">Free entry</div>
              )}
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Platform fee
              </p>
              <p className="mt-1 text-sm font-black text-[var(--text-primary)]">
                {currentPlan.tournamentFeePercent}% reference rate
              </p>
            </div>
          </div>

          <div>
            <label className="label">Rules</label>
            <textarea
              value={form.rules}
              onChange={(event) => setForm((current) => ({ ...current, rules: event.target.value }))}
              className="input min-h-28 resize-none"
              maxLength={800}
              placeholder="Example: Best of 1. Screenshot disputes. No rage quits."
            />
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--text-secondary)]">
            <div className="mb-2 flex items-center gap-2 font-black text-[var(--text-primary)]">
              <Trophy size={15} className="text-[var(--brand-coral)]" />
              Prize split
            </div>
            {form.entry_type === 'free'
              ? 'Free-entry brackets stay open to join. Pro and Elite can host them, and Elite pays 0% platform fee.'
              : 'Every paid slot grows the live prize pool. Free organizer or comped slots do not add cash to the pool.'}
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
