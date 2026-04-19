'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  DoorOpen,
  ExternalLink,
  Globe,
  Lock,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES, getSelectableGameKeys, supportsLobbyMode } from '@/lib/config';
import type { AdminLobbyDetail, AdminLobbySummary, GameKey } from '@/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'open', label: 'Open' },
  { value: 'full', label: 'Full' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
] as const;

function formatSchedule(value?: string | null) {
  if (!value) {
    return 'No schedule set';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid schedule';
  }

  return date.toLocaleString();
}

function isOverdue(lobby: Pick<AdminLobbySummary, 'scheduled_for' | 'status'>) {
  if (!lobby.scheduled_for || !['open', 'full'].includes(lobby.status)) {
    return false;
  }

  return new Date(lobby.scheduled_for).getTime() < Date.now();
}

export default function AdminLobbiesPage() {
  const authFetch = useAuthFetch();
  const [lobbies, setLobbies] = useState<AdminLobbySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]['value']>('open');
  const [gameFilter, setGameFilter] = useState<'all' | GameKey>('all');
  const [loading, setLoading] = useState(true);
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null);
  const [selectedLobby, setSelectedLobby] = useState<AdminLobbyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actingKey, setActingKey] = useState<string | null>(null);

  const fetchLobbies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (query.trim()) params.set('q', query.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (gameFilter !== 'all') params.set('game', gameFilter);

      const res = await authFetch(`/api/admin/lobbies?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load lobbies');
        setLobbies([]);
        setTotal(0);
        return;
      }

      setLobbies((data.lobbies ?? []) as AdminLobbySummary[]);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    } catch {
      toast.error('Network error while loading lobbies');
      setLobbies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [authFetch, gameFilter, query, statusFilter]);

  const fetchLobbyDetail = useCallback(
    async (lobbyId: string) => {
      setDetailLoading(true);
      try {
        const res = await authFetch(`/api/admin/lobbies/${lobbyId}`);
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? 'Failed to load lobby details');
          if (selectedLobbyId === lobbyId) {
            setSelectedLobby(null);
          }
          return null;
        }

        const detail = (data.lobby ?? null) as AdminLobbyDetail | null;
        setSelectedLobby(detail);
        setSelectedLobbyId(lobbyId);
        return detail;
      } catch {
        toast.error('Network error while loading lobby detail');
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [authFetch, selectedLobbyId]
  );

  useEffect(() => {
    void fetchLobbies();
  }, [fetchLobbies]);

  const handleInspect = useCallback(
    async (lobbyId: string) => {
      if (selectedLobbyId === lobbyId) {
        setSelectedLobbyId(null);
        setSelectedLobby(null);
        return;
      }

      await fetchLobbyDetail(lobbyId);
    },
    [fetchLobbyDetail, selectedLobbyId]
  );

  const handleCloseLobby = useCallback(
    async (lobby: AdminLobbySummary) => {
      const confirmed = window.confirm(`Close "${lobby.title}"?`);
      if (!confirmed) {
        return;
      }

      const actionKey = `close:${lobby.id}`;
      setActingKey(actionKey);
      try {
        const res = await authFetch(`/api/admin/lobbies/${lobby.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'close',
            reason: 'Admin closed lobby from control room',
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? 'Failed to close lobby');
          return;
        }

        toast.success('Lobby closed');
        await fetchLobbies();
        if (selectedLobbyId === lobby.id) {
          await fetchLobbyDetail(lobby.id);
        }
      } catch {
        toast.error('Network error');
      } finally {
        setActingKey(null);
      }
    },
    [authFetch, fetchLobbies, fetchLobbyDetail, selectedLobbyId]
  );

  const handleRemoveMember = useCallback(
    async (lobbyId: string, userId: string, username: string) => {
      const confirmed = window.confirm(`Remove ${username} from this lobby?`);
      if (!confirmed) {
        return;
      }

      const actionKey = `remove:${lobbyId}:${userId}`;
      setActingKey(actionKey);
      try {
        const res = await authFetch(`/api/admin/lobbies/${lobbyId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'remove_member',
            user_id: userId,
            reason: 'Admin removed lobby member from control room',
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? 'Failed to remove lobby member');
          return;
        }

        toast.success('Lobby member removed');
        await fetchLobbies();
        if (selectedLobbyId === lobbyId) {
          await fetchLobbyDetail(lobbyId);
        }
      } catch {
        toast.error('Network error');
      } finally {
        setActingKey(null);
      }
    },
    [authFetch, fetchLobbies, fetchLobbyDetail, selectedLobbyId]
  );

  const summary = useMemo(() => {
    const open = lobbies.filter((lobby) => lobby.status === 'open').length;
    const full = lobbies.filter((lobby) => lobby.status === 'full').length;
    const live = lobbies.filter((lobby) => lobby.status === 'in_progress').length;
    const overdue = lobbies.filter((lobby) => isOverdue(lobby)).length;

    return { open, full, live, overdue };
  }, [lobbies]);

  const lobbyGames = useMemo(
    () => getSelectableGameKeys().filter((gameKey) => supportsLobbyMode(gameKey)),
    []
  );

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Admin lobbies</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Room health, host control, and cleanup
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Inspect live rooms, remove problem members, and close bad lobbies before community play
              turns into guesswork.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { label: 'Loaded', value: lobbies.length, accent: 'var(--brand-teal)' },
              { label: 'Open', value: summary.open, accent: '#60A5FA' },
              { label: 'Live', value: summary.live, accent: 'var(--brand-coral)' },
              { label: 'Overdue', value: summary.overdue, accent: '#F87171' },
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
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_180px_220px_auto]">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              placeholder="Search title, room code, host, or game"
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
            <option value="all">All lobby games</option>
            {lobbyGames.map((gameKey) => (
              <option key={gameKey} value={gameKey}>
                {GAMES[gameKey].label}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void fetchLobbies()} className="btn-ghost whitespace-nowrap">
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="brand-chip px-2.5 py-1">{total.toLocaleString()} total lobbies</span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1">
            {summary.full.toLocaleString()} full rooms
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 shimmer rounded-3xl" />
          ))}
        </div>
      ) : lobbies.length === 0 ? (
        <div className="card p-10 text-center">
          <DoorOpen size={22} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No lobbies matched this filter.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Try widening the filters or clearing the search term.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lobbies.map((lobby) => {
            const gameLabel = GAMES[lobby.game]?.label ?? lobby.game;
            const selected = selectedLobbyId === lobby.id;
            const closing = actingKey === `close:${lobby.id}`;
            const visibility = lobby.visibility === 'private' ? 'private' : 'public';

            return (
              <div key={lobby.id} className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--text-primary)]">{lobby.title}</p>
                      <span className="brand-chip px-2 py-0.5">{gameLabel}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          visibility === 'public'
                            ? 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                            : 'bg-white/[0.06] text-[var(--text-secondary)]'
                        }`}
                      >
                        {visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                        {visibility === 'public' ? 'Public room' : 'Private room'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          lobby.status === 'open'
                            ? 'bg-blue-500/14 text-blue-400'
                            : lobby.status === 'full'
                              ? 'bg-amber-500/14 text-amber-400'
                              : lobby.status === 'in_progress'
                                ? 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                                : 'bg-red-500/14 text-red-400'
                        }`}
                      >
                        {lobby.status}
                      </span>
                      {isOverdue(lobby) ? (
                        <span className="rounded-full bg-red-500/14 px-2.5 py-1 text-[11px] font-bold text-red-400">
                          Overdue
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Host {lobby.host?.username ?? 'Unknown'} | {lobby.member_count}/{lobby.max_players} players | Room code {lobby.room_code} | {visibility === 'public' ? 'Public room' : 'Private room'}
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          Schedule
                        </p>
                        <p className="mt-2 text-sm font-black text-[var(--text-primary)]">
                          {formatSchedule(lobby.scheduled_for)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          Mode
                        </p>
                        <p className="mt-2 text-sm font-black text-[var(--text-primary)]">{lobby.mode || 'Lobby'}</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {lobby.map_name ? `Map ${lobby.map_name}` : 'No map set'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          Host lane
                        </p>
                        <p className="mt-2 text-sm font-black text-[var(--text-primary)]">
                          {lobby.host?.phone ?? 'No phone on profile'}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {lobby.host?.email ?? 'No email on profile'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleInspect(lobby.id)}
                      className="btn-ghost"
                    >
                      <Users size={14} />
                      {selected ? 'Hide details' : 'Inspect'}
                    </button>
                    <Link href={`/lobbies/${lobby.id}`} className="btn-ghost">
                      <ExternalLink size={14} />
                      Open room page
                    </Link>
                    {closing ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 size={14} className="animate-spin" />
                        Closing...
                      </div>
                    ) : lobby.status !== 'closed' ? (
                      <button
                        type="button"
                        onClick={() => void handleCloseLobby(lobby)}
                        className="btn-danger"
                      >
                        <X size={14} />
                        Close lobby
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Shield size={14} className="text-[var(--text-soft)]" />
                        Already closed
                      </span>
                    )}
                  </div>
                </div>

                {selected ? (
                  <div className="mt-5 border-t border-[var(--border-color)] pt-5">
                    {detailLoading || !selectedLobby ? (
                      <div className="h-40 shimmer rounded-3xl" />
                    ) : (
                      <div className="space-y-4">
                        <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <div className="flex items-center gap-2">
                              <CalendarClock size={16} className="text-[var(--brand-teal)]" />
                              <p className="text-sm font-semibold text-[var(--text-primary)]">Lobby snapshot</p>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                              <p>Host: {selectedLobby.host?.username ?? 'Unknown'}</p>
                              <p>Status: {selectedLobby.status}</p>
                              <p>Visibility: {selectedLobby.visibility === 'private' ? 'Private room' : 'Public room'}</p>
                              <p>Room code: {selectedLobby.room_code}</p>
                              <p>Players: {selectedLobby.member_count}/{selectedLobby.max_players}</p>
                              <p>Schedule: {formatSchedule(selectedLobby.scheduled_for)}</p>
                              <p>Mode: {selectedLobby.mode || 'Lobby'}</p>
                              <p>Map: {selectedLobby.map_name ?? 'Not set'}</p>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <div className="flex items-center gap-2">
                              <Users size={16} className="text-[var(--brand-coral)]" />
                              <p className="text-sm font-semibold text-[var(--text-primary)]">Members</p>
                            </div>
                            <div className="mt-4 space-y-3">
                              {selectedLobby.members.length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)]">No members found for this lobby.</p>
                              ) : (
                                selectedLobby.members.map((member) => {
                                  const removeKey = `remove:${selectedLobby.id}:${member.user_id}`;
                                  const removing = actingKey === removeKey;
                                  const isHost = selectedLobby.host_id === member.user_id;

                                  return (
                                    <div
                                      key={member.id}
                                      className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3"
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-black text-[var(--text-primary)]">
                                              {member.user?.username ?? 'Unknown'}
                                            </p>
                                            {isHost ? (
                                              <span className="brand-chip-coral px-2 py-0.5">Host</span>
                                            ) : null}
                                            {member.user?.role && member.user.role !== 'user' ? (
                                              <span className="rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-secondary)]">
                                                {member.user.role}
                                              </span>
                                            ) : null}
                                          </div>
                                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                            {member.user?.phone ?? 'No phone'}{member.user?.email ? ` | ${member.user.email}` : ''}
                                          </p>
                                          <p className="mt-1 text-xs text-[var(--text-soft)]">
                                            Joined {new Date(member.joined_at).toLocaleString()}
                                          </p>
                                        </div>

                                        {removing ? (
                                          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                                            <Loader2 size={14} className="animate-spin" />
                                            Working...
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void handleRemoveMember(
                                                selectedLobby.id,
                                                member.user_id,
                                                member.user?.username ?? 'this player'
                                              )
                                            }
                                            className="btn-danger"
                                          >
                                            <X size={14} />
                                            {isHost ? 'Remove host' : 'Remove member'}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
