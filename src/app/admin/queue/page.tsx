'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock3, Loader2, RefreshCw, Search, Shield, Users, X } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS, REGIONS, getSelectableGameKeys } from '@/lib/config';
import { QUEUE_MAX_WAIT_MINUTES } from '@/lib/queue';
import type { AdminQueueEntry, GameKey, PlatformKey } from '@/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'matched', label: 'Matched' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

function formatWaitTime(joinedAt: string) {
  const diffMs = Math.max(0, Date.now() - new Date(joinedAt).getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function getWaitMinutes(joinedAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60_000));
}

export default function AdminQueuePage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [entries, setEntries] = useState<AdminQueueEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]['value']>('waiting');
  const [gameFilter, setGameFilter] = useState<'all' | GameKey>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | PlatformKey>('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (query.trim()) params.set('q', query.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (gameFilter !== 'all') params.set('game', gameFilter);
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (regionFilter !== 'all') params.set('region', regionFilter);

      const res = await authFetch(`/api/admin/queue?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load queue entries');
        setEntries([]);
        setTotal(0);
        return;
      }

      setEntries((data.entries ?? []) as AdminQueueEntry[]);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    } catch {
      toast.error('Network error while loading the queue');
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [authFetch, gameFilter, platformFilter, query, regionFilter, statusFilter]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleCancel = useCallback(
    async (entry: AdminQueueEntry) => {
      setActingOn(entry.id);
      try {
        const res = await authFetch(`/api/admin/queue/${entry.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'cancel',
            reason: 'Admin cancelled queue entry from control room',
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? 'Failed to cancel queue entry');
          return;
        }

        toast.success('Queue entry cancelled');
        await fetchEntries();
      } catch {
        toast.error('Network error');
      } finally {
        setActingOn(null);
      }
    },
    [authFetch, fetchEntries]
  );

  const handleReconcile = useCallback(async () => {
    setReconciling(true);
    try {
      const res = await authFetch('/api/admin/queue/reconcile', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to rerun matchmaking');
        return;
      }

      toast.success(
        typeof data.matchesCreated === 'number'
          ? `Matchmaking rerun complete: ${data.matchesCreated} matches created`
          : 'Matchmaking rerun complete'
      );
      await fetchEntries();
    } catch {
      toast.error('Network error');
    } finally {
      setReconciling(false);
    }
  }, [authFetch, fetchEntries]);

  const summary = useMemo(() => {
    const waiting = entries.filter((entry) => entry.status === 'waiting').length;
    const matched = entries.filter((entry) => entry.status === 'matched').length;
    const stuck = entries.filter(
      (entry) =>
        entry.status === 'waiting' && getWaitMinutes(entry.joined_at) >= QUEUE_MAX_WAIT_MINUTES
    ).length;

    return { waiting, matched, stuck };
  }, [entries]);

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Admin queue</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Ranked queue health and interventions
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              See who is waiting, who already has a pending match, and which entries need manual cleanup
              before players start bouncing.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Loaded', value: entries.length, accent: 'var(--brand-teal)' },
              { label: 'Waiting', value: summary.waiting, accent: '#60A5FA' },
              { label: 'Stuck', value: summary.stuck, accent: 'var(--brand-coral)' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-black" style={{ color: item.accent }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_180px_180px_180px_180px_auto]">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              placeholder="Search player, phone, email, game, or platform"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="input"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={gameFilter}
            onChange={(event) => setGameFilter(event.target.value as typeof gameFilter)}
            className="input"
          >
            <option value="all">All games</option>
            {getSelectableGameKeys().map((gameKey) => (
              <option key={gameKey} value={gameKey}>
                {GAMES[gameKey].label}
              </option>
            ))}
          </select>

          <select
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value as typeof platformFilter)}
            className="input"
          >
            <option value="all">All platforms</option>
            {(Object.keys(PLATFORMS) as PlatformKey[]).map((platformKey) => (
              <option key={platformKey} value={platformKey}>
                {PLATFORMS[platformKey].label}
              </option>
            ))}
          </select>

          <select
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value)}
            className="input"
          >
            <option value="all">All regions</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void fetchEntries()} className="btn-ghost whitespace-nowrap">
              <RefreshCw size={14} />
              Refresh
            </button>
            {user?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => void handleReconcile()}
                disabled={reconciling}
                className="btn-primary whitespace-nowrap"
              >
                {reconciling ? <Loader2 size={14} className="animate-spin" /> : <Clock3 size={14} />}
                {reconciling ? 'Running...' : 'Run matchmaking'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="brand-chip px-2.5 py-1">{total.toLocaleString()} total entries</span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1">
            {summary.matched.toLocaleString()} linked to pending matches
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 shimmer rounded-3xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={22} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No queue entries matched this filter.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Try widening the filters or clearing the search term.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const gameLabel = GAMES[entry.game]?.label ?? entry.game;
            const platformLabel = entry.platform ? (PLATFORMS[entry.platform]?.label ?? entry.platform) : 'Any platform';
            const waitMinutes = getWaitMinutes(entry.joined_at);

            return (
              <div key={entry.id} className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--text-primary)]">
                        {entry.user?.username ?? 'Unknown player'}
                      </p>
                      <span className="brand-chip px-2 py-0.5">{gameLabel}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          entry.status === 'waiting'
                            ? 'bg-blue-500/14 text-blue-400'
                            : entry.status === 'matched'
                              ? 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                              : 'bg-red-500/14 text-red-400'
                        }`}
                      >
                        {entry.status}
                      </span>
                      {entry.user?.is_banned ? (
                        <span className="rounded-full bg-red-500/14 px-2.5 py-1 text-[11px] font-bold text-red-400">
                          Banned
                        </span>
                      ) : null}
                      {entry.user?.role && entry.user.role !== 'user' ? (
                        <span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
                          {entry.user.role}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {platformLabel} | {entry.region} | Joined {new Date(entry.joined_at).toLocaleString()}
                    </p>

                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      {entry.user?.phone ?? 'No phone'}{entry.user?.email ? ` | ${entry.user.email}` : ''}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          Wait time
                        </p>
                        <p className="mt-2 text-xl font-black text-[var(--text-primary)]">
                          {formatWaitTime(entry.joined_at)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {waitMinutes >= QUEUE_MAX_WAIT_MINUTES
                            ? `Past the ${QUEUE_MAX_WAIT_MINUTES} minute queue window`
                            : 'Still inside the live queue window'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          Rating
                        </p>
                        <p className="mt-2 text-xl font-black text-[var(--text-primary)]">
                          {entry.rating.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Matchmaking score for this queue entry
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          Pending match
                        </p>
                        <p className="mt-2 text-sm font-black text-[var(--text-primary)]">
                          {entry.active_match
                            ? `vs ${entry.active_match.opponent?.username ?? 'Unknown'}`
                            : 'No linked pending match'}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {entry.active_match
                            ? `Created ${new Date(entry.active_match.created_at).toLocaleString()}`
                            : 'Still waiting in the pool'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {actingOn === entry.id ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 size={14} className="animate-spin" />
                        Working...
                      </div>
                    ) : entry.status === 'waiting' ? (
                      <button
                        type="button"
                        onClick={() => void handleCancel(entry)}
                        className="btn-danger"
                      >
                        <X size={14} />
                        Cancel entry
                      </button>
                    ) : entry.status === 'matched' ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Shield size={14} className="text-[var(--text-soft)]" />
                        Match already created
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Shield size={14} className="text-[var(--text-soft)]" />
                        No action needed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
