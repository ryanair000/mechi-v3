'use client';

import Link from 'next/link';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, Loader2, Search, Shield, ShieldOff, UserCog, Users } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS, normalizeSelectedGameKeys } from '@/lib/config';
import { cn } from '@/lib/utils';
import type { AdminUser, GameKey, LobbyVisibility, PlatformKey, UserRole } from '@/types';

interface UserDetailMatch {
  id: string;
  game: GameKey;
  platform: PlatformKey | null;
  region: string;
  status: string;
  winner_id: string | null;
  created_at: string;
  completed_at: string | null;
  tournament_id: string | null;
  player1: { id: string; username: string } | null;
  player2: { id: string; username: string } | null;
}

interface UserDetailLobby {
  id: string;
  game: GameKey;
  title: string;
  visibility: LobbyVisibility;
  status: string;
  room_code: string;
  member_count?: number;
  created_at: string;
}

interface UserDetailTournament {
  id: string;
  slug: string;
  title: string;
  game: GameKey;
  status: string;
  entry_fee: number;
  prize_pool: number;
  payout_status?: string | null;
  created_at: string;
}

interface AdminUserDetail {
  user: AdminUser & {
    platforms: PlatformKey[];
    xp?: number;
    level?: number;
    mp?: number;
    win_streak?: number;
    max_win_streak?: number;
    plan?: string | null;
    plan_since?: string | null;
    plan_expires_at?: string | null;
  };
  currentQueueEntry: {
    id: string;
    game: GameKey;
    platform: PlatformKey | null;
    region: string;
    rating: number;
    status: string;
    joined_at: string;
  } | null;
  recentMatches: UserDetailMatch[];
  joinedLobbies: Array<{ joined_at: string; lobby: UserDetailLobby }>;
  hostedLobbies: UserDetailLobby[];
  joinedTournaments: Array<{
    id: string;
    payment_status: string;
    joined_at: string;
    tournament: UserDetailTournament;
  }>;
  organizedTournaments: UserDetailTournament[];
  currentSubscription: {
    id: string;
    plan: string;
    billing_cycle: string;
    amount_kes: number;
    status: string;
    expires_at: string | null;
    created_at: string;
  } | null;
}

const ROLE_OPTIONS: Array<{ value: UserRole | 'all'; label: string }> = [
  { value: 'all', label: 'All roles' },
  { value: 'user', label: 'Users' },
  { value: 'moderator', label: 'Moderators' },
  { value: 'admin', label: 'Admins' },
];

const BANNED_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'false', label: 'Active' },
  { value: 'true', label: 'Banned' },
];

function roleBadgeClass(role: UserRole) {
  if (role === 'admin') {
    return 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]';
  }

  if (role === 'moderator') {
    return 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]';
  }

  return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_OPTIONS)[number]['value']>('all');
  const [bannedFilter, setBannedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (deferredQuery.trim()) params.set('q', deferredQuery.trim());
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (bannedFilter !== 'all') params.set('banned', bannedFilter);

      const res = await authFetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load users');
        setUsers([]);
        setSelectedUserId(null);
        return;
      }

      const nextUsers = (data.users ?? []) as AdminUser[];
      setUsers(nextUsers);
      setSelectedUserId((current) => {
        if (current && nextUsers.some((item) => item.id === current)) {
          return current;
        }

        return nextUsers[0]?.id ?? null;
      });
    } catch {
      toast.error('Network error while loading users');
      setUsers([]);
      setSelectedUserId(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, bannedFilter, deferredQuery, roleFilter]);

  const fetchUserDetail = useCallback(
    async (targetId: string) => {
      setDetailLoading(true);
      try {
        const res = await authFetch(`/api/admin/users/${targetId}`);
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? 'Failed to load user details');
          setDetail(null);
          return null;
        }

        const nextDetail = data as AdminUserDetail;
        setDetail(nextDetail);
        return nextDetail;
      } catch {
        toast.error('Network error while loading user details');
        setDetail(null);
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!selectedUserId) {
      setDetail(null);
      return;
    }

    void fetchUserDetail(selectedUserId);
  }, [fetchUserDetail, selectedUserId]);

  const handleAction = useCallback(
    async (targetId: string, body: Record<string, unknown>, successMessage: string) => {
      setActingOn(targetId);
      try {
        const res = await authFetch(`/api/admin/users/${targetId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Action failed');
          return;
        }
        toast.success(successMessage);
        await fetchUsers();
        if (selectedUserId === targetId) {
          await fetchUserDetail(targetId);
        }
      } catch {
        toast.error('Network error');
      } finally {
        setActingOn(null);
      }
    },
    [authFetch, fetchUserDetail, fetchUsers, selectedUserId]
  );

  const summary = useMemo(() => {
    const banned = users.filter((item) => item.is_banned).length;
    const moderators = users.filter((item) => item.role === 'moderator').length;
    const admins = users.filter((item) => item.role === 'admin').length;

    return { banned, moderators, admins };
  }, [users]);

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const recentLobbyActivity = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [
      ...detail.hostedLobbies.map((lobby) => ({ type: 'Hosted', lobby })),
      ...detail.joinedLobbies.map((item) => ({ type: 'Joined', lobby: item.lobby })),
    ].slice(0, 6);
  }, [detail]);

  const recentTournamentActivity = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [
      ...detail.organizedTournaments.map((tournament) => ({
        type: 'Hosted',
        tournament,
        paymentStatus: null as string | null,
      })),
      ...detail.joinedTournaments.map((item) => ({
        type: 'Joined',
        tournament: item.tournament,
        paymentStatus: item.payment_status,
      })),
    ].slice(0, 6);
  }, [detail]);

  const showingSelectedDetail = detail?.user.id === selectedUserId;

  return (
    <div className="space-y-5">
      <section className="card p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="brand-kicker">Admin users</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Review accounts without losing the rest of the list.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Scan the roster on the left, keep one player in focus on the right, and move sensitive
              actions out of the browsing flow so moderation feels safer and faster.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="brand-chip">{users.length} loaded</span>
            <span className="brand-chip-coral">{summary.banned} suspended</span>
            <span className="brand-chip">{summary.moderators + summary.admins} staff accounts</span>
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              placeholder="Search username, phone, or email"
            />
          </label>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
            className="input"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={bannedFilter}
            onChange={(event) => setBannedFilter(event.target.value)}
            className="input"
          >
            {BANNED_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => void fetchUsers()} className="btn-ghost whitespace-nowrap">
            Refresh list
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--text-secondary)]">
          <span className="brand-chip">Search updates automatically as you type</span>
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1">
            Select a player to open details and actions
          </span>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.75fr)]">
          <div className="card h-[38rem] p-4 shimmer" />
          <div className="card h-[38rem] p-4 shimmer" />
        </div>
      ) : users.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={22} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No users matched that filter.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Try a wider search, or switch the role and status filters back to all.
          </p>
        </div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.75fr)]">
          <div className="card p-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div>
                <p className="section-title">Player list</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Browse the roster first, then inspect one player at a time.
                </p>
              </div>
              <span className="brand-chip">{users.length} results</span>
            </div>

            <div className="mt-4 space-y-2">
              {users.map((member) => {
                const games = normalizeSelectedGameKeys(member.selected_games)
                  .slice(0, 3)
                  .map((game) => GAMES[game]?.label ?? game);
                const isSelected = member.id === selectedUserId;

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedUserId(member.id)}
                    className={cn(
                      'w-full rounded-3xl border p-4 text-left transition-colors',
                      isSelected
                        ? 'border-[rgba(50,224,196,0.3)] bg-[rgba(50,224,196,0.08)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:bg-[var(--surface)]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-black text-[var(--text-primary)]">{member.username}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(member.role)}`}>
                            {member.role}
                          </span>
                          {member.is_banned ? (
                            <span className="rounded-full bg-red-500/14 px-2.5 py-1 text-xs font-semibold text-red-400">
                              Suspended
                            </span>
                          ) : null}
                          {user?.id === member.id ? <span className="brand-chip">You</span> : null}
                        </div>

                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {member.phone}
                          {member.email ? ` · ${member.email}` : ''}
                        </p>
                      </div>

                      <span className="text-xs text-[var(--text-soft)]">{member.region}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {games.length > 0 ? (
                        games.map((label) => (
                          <span key={label} className="brand-chip">
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-[var(--text-soft)]">No games selected yet</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
                      <span>Joined {formatDate(member.created_at)}</span>
                      <span className="inline-flex items-center gap-1 font-semibold">
                        Review
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card self-start p-5 xl:sticky xl:top-6">
            {!selectedUser ? (
              <div className="flex min-h-[32rem] items-center justify-center rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-center">
                <div>
                  <Users size={22} className="mx-auto text-[var(--text-soft)]" />
                  <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">Pick a player</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Account details and moderation actions will appear here.
                  </p>
                </div>
              </div>
            ) : detailLoading || !detail || !showingSelectedDetail ? (
              <div className="space-y-3">
                <div className="h-24 shimmer rounded-3xl" />
                <div className="h-32 shimmer rounded-3xl" />
                <div className="h-56 shimmer rounded-3xl" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="border-b border-[var(--border-color)] pb-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                          {detail.user.username}
                        </h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(detail.user.role)}`}>
                          {detail.user.role}
                        </span>
                        {detail.user.is_banned ? (
                          <span className="rounded-full bg-red-500/14 px-2.5 py-1 text-xs font-semibold text-red-400">
                            Suspended
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {detail.user.phone}
                        {detail.user.email ? ` · ${detail.user.email}` : ''}
                        {detail.user.region ? ` · ${detail.user.region}` : ''}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {detail.user.platforms.length > 0 ? (
                          detail.user.platforms.map((platform) => (
                            <span key={platform} className="brand-chip">
                              {PLATFORMS[platform]?.label ?? platform}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[var(--text-soft)]">No platforms set</span>
                        )}
                      </div>

                      {detail.user.is_banned && detail.user.ban_reason ? (
                        <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-sm leading-6 text-red-300">
                          Reason: {detail.user.ban_reason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {actingOn === detail.user.id ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                          <Loader2 size={14} className="animate-spin" />
                          Working...
                        </div>
                      ) : (
                        <>
                          {!detail.user.is_banned ? (
                            <button
                              type="button"
                              disabled={user?.id === detail.user.id}
                              onClick={() => {
                                if (!window.confirm(`Suspend ${detail.user.username}?`)) {
                                  return;
                                }

                                void handleAction(
                                  detail.user.id,
                                  { action: 'ban', reason: 'Admin moderation action' },
                                  'User suspended'
                                );
                              }}
                              className="btn-danger"
                            >
                              <Shield size={14} />
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={user?.id === detail.user.id}
                              onClick={() => {
                                if (!window.confirm(`Restore ${detail.user.username}?`)) {
                                  return;
                                }

                                void handleAction(detail.user.id, { action: 'unban' }, 'User restored');
                              }}
                              className="btn-ghost"
                            >
                              <ShieldOff size={14} />
                              Restore
                            </button>
                          )}

                          {user?.role === 'admin' ? (
                            <>
                              {detail.user.role === 'user' ? (
                                <button
                                  type="button"
                                  disabled={user?.id === detail.user.id}
                                  onClick={() => {
                                    if (!window.confirm(`Promote ${detail.user.username} to moderator?`)) {
                                      return;
                                    }

                                    void handleAction(
                                      detail.user.id,
                                      { action: 'set_role', role: 'moderator' },
                                      'Moderator access granted'
                                    );
                                  }}
                                  className="btn-ghost"
                                >
                                  <UserCog size={14} />
                                  Make moderator
                                </button>
                              ) : detail.user.role === 'moderator' ? (
                                <button
                                  type="button"
                                  disabled={user?.id === detail.user.id}
                                  onClick={() => {
                                    if (!window.confirm(`Return ${detail.user.username} to user access?`)) {
                                      return;
                                    }

                                    void handleAction(
                                      detail.user.id,
                                      { action: 'set_role', role: 'user' },
                                      'Moderator access removed'
                                    );
                                  }}
                                  className="btn-ghost"
                                >
                                  <UserCog size={14} />
                                  Back to user
                                </button>
                              ) : null}
                            </>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <p className="section-title">Account</p>
                    <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                      Joined {formatDate(detail.user.created_at)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Role {detail.user.role} · Region {detail.user.region}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <p className="section-title">Progress</p>
                    <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                      Level {detail.user.level ?? 0} · XP {detail.user.xp ?? 0}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      MP {detail.user.mp ?? 0} · Streak {detail.user.win_streak ?? 0} · Best {detail.user.max_win_streak ?? 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <p className="section-title">Current queue</p>
                    <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                      {detail.currentQueueEntry
                        ? `${GAMES[detail.currentQueueEntry.game]?.label ?? detail.currentQueueEntry.game} · ${detail.currentQueueEntry.status}`
                        : 'Not currently queued'}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {detail.currentQueueEntry
                        ? `Joined ${formatDateTime(detail.currentQueueEntry.joined_at)}`
                        : 'No waiting or matched queue entry'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <p className="section-title">Plan and billing</p>
                    <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                      {detail.currentSubscription
                        ? `${detail.currentSubscription.plan} · ${detail.currentSubscription.status}`
                        : detail.user.plan ?? 'free'}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {detail.currentSubscription
                        ? `KSh ${detail.currentSubscription.amount_kes.toLocaleString()} · ${detail.currentSubscription.billing_cycle}`
                        : detail.user.plan_expires_at
                          ? `Expires ${formatDateTime(detail.user.plan_expires_at)}`
                          : 'No paid subscription record'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="section-title">Recent matches</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          The latest ranked or tournament matches linked to this player.
                        </p>
                      </div>
                      <span className="brand-chip">{detail.recentMatches.length} items</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {detail.recentMatches.length === 0 ? (
                        <p className="text-sm text-[var(--text-secondary)]">No recent matches.</p>
                      ) : (
                        detail.recentMatches.map((match) => (
                          <div
                            key={match.id}
                            className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3"
                          >
                            <p className="text-sm font-black text-[var(--text-primary)]">
                              {match.player1?.username ?? 'Unknown'} vs {match.player2?.username ?? 'Unknown'}
                            </p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                              {GAMES[match.game]?.label ?? match.game} · {match.status}
                            </p>
                            <p className="mt-1 text-sm text-[var(--text-soft)]">
                              {formatDateTime(match.created_at)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="section-title">Lobby activity</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Hosted and joined rooms, merged into one timeline.
                        </p>
                      </div>
                      <span className="brand-chip">{recentLobbyActivity.length} items</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {recentLobbyActivity.length === 0 ? (
                        <p className="text-sm text-[var(--text-secondary)]">No recent lobbies.</p>
                      ) : (
                        recentLobbyActivity.map((item) => (
                          <div
                            key={`${item.type}-${item.lobby.id}`}
                            className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-[var(--text-primary)]">{item.lobby.title}</p>
                                <p className="mt-1 text-xs text-[var(--text-soft)]">
                                  {item.lobby.visibility === 'private' ? 'Private room' : 'Public room'}
                                </p>
                                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                  {item.type} · {item.lobby.status} · Room {item.lobby.room_code}
                                </p>
                              </div>
                              <Link href={`/lobbies/${item.lobby.id}`} className="brand-link text-sm font-semibold">
                                Open
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="section-title">Tournament activity</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Recent brackets this player joined or organized.
                        </p>
                      </div>
                      <span className="brand-chip">{recentTournamentActivity.length} items</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {recentTournamentActivity.length === 0 ? (
                        <p className="text-sm text-[var(--text-secondary)]">No recent tournaments.</p>
                      ) : (
                        recentTournamentActivity.map((item) => (
                          <div
                            key={`${item.type}-${item.tournament.id}`}
                            className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-black text-[var(--text-primary)]">
                                  {item.tournament.title}
                                </p>
                                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                  {item.type} · {item.tournament.status}
                                  {item.paymentStatus ? ` · ${item.paymentStatus}` : ''}
                                </p>
                              </div>
                              <Link href={`/t/${item.tournament.slug}`} className="brand-link text-sm font-semibold">
                                Open
                              </Link>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
