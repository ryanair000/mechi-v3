'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS, REGIONS } from '@/lib/config';
import type { GameKey, PlatformKey } from '@/types';

const TOURNAMENT_SIZES = [4, 8, 16] as const;

export default function CreateTournamentPage() {
  const authFetch = useAuthFetch();
  const router = useRouter();
  const tournamentGames = useMemo(
    () => (Object.keys(GAMES) as GameKey[]).filter((game) => GAMES[game].mode === '1v1'),
    []
  );
  const [form, setForm] = useState({
    title: '',
    game: tournamentGames[0] ?? 'fc26',
    platform: GAMES[tournamentGames[0] ?? 'fc26']?.platforms[0] ?? 'ps',
    region: 'Nairobi',
    size: 4,
    entry_fee: 0,
    rules: '',
  });
  const [creating, setCreating] = useState(false);

  const platforms = GAMES[form.game]?.platforms ?? [];

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Name the bracket first');
      return;
    }

    setCreating(true);
    try {
      const res = await authFetch('/api/tournaments', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not create tournament');
        return;
      }
      toast.success('Tournament created');
      router.push(`/t/${data.tournament.slug}`);
    } catch {
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
            Keep it simple: game, slots, rules, and entry fee. Mechi handles bracket flow after results.
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

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Region</label>
              <select
                value={form.region}
                onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
                className="input"
              >
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
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
            <div>
              <label className="label">Entry fee (KES)</label>
              <input
                type="number"
                min={0}
                value={form.entry_fee}
                onChange={(event) =>
                  setForm((current) => ({ ...current, entry_fee: Number(event.target.value) }))
                }
                className="input"
              />
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
            Mechi keeps 10%. Winner gets the remaining pool when the final result is confirmed.
          </div>

          <button onClick={handleCreate} disabled={creating} className="btn-primary w-full">
            {creating ? 'Creating...' : 'Create Tournament'}
          </button>
        </div>
      </div>
    </div>
  );
}
