'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Search, Shield, ShieldOff, UserCog, Users } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { AdminUser, GameKey, PlatformKey, UserRole } from '@/types';

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

export default function AdminUsersPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_OPTIONS)[number]['value']>('all');
  const [bannedFilter, setBannedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (query.trim()) params.set('q', query.trim());
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (bannedFilter !== 'all') params.set('banned', bannedFilter);

      const res = await authFetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load users');
        setUsers([]);
        return;
      }
      setUsers((data.users ?? []) as AdminUser[]);
    } catch {
      toast.error('Network error while loading users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, bannedFilter, query, roleFilter]);

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
        setDetailUserId(targetId);
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
        if (detailUserId === targetId) {
          await fetchUserDetail(targetId);
        }
      } catch {
        toast.error('Network error');
      } finally {
        setActingOn(null);
      }
    },
    [authFetch, detailUserId, fetchUserDetail, fetchUsers]
  );

  const handleToggleDetail = useCallback(
    async (targetId: string) => {
      if (detailUserId === targetId) {
        setDetailUserId(null);
        setDetail(null);
        return;
      }

      await fetchUserDetail(targetId);
    },
    [detailUserId, fetchUserDetail]
  );

  const summary = useMemo(() => {
    const banned = users.filter((item) => item.is_banned).length;
    const moderators = users.filter((item) => item.role === 'moderator').length;
    const admins = users.filter((item) => item.role === 'admin').length;

    return { banned, moderators, admins };
  }, [users]);

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Admin users</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              User access and moderation
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Search accounts, suspend bad actors, and open player detail when you need their queue,
              lobby, and tournament context in one place.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Loaded', value: users.length, accent: 'var(--brand-teal)' },
              { label: 'Banned', value: summary.banned, accent: '#F87171' },
              { label: 'Staff', value: summary.moderators + summary.admins, accent: 'var(--brand-coral)' },
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
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 shimmer rounded-3xl" />
          ))}
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
        <div className="space-y-3">
          {users.map((member) => {
            const isSelf = user?.id === member.id;
            const games = member.selected_games
              .slice(0, 3)
              .map((game) => GAMES[game as GameKey]?.label ?? game);
            const isExpanded = detailUserId === member.id;

            return (
              <div key={member.id} className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--text-primary)]">{member.username}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          member.role === 'admin'
                            ? 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]'
                            : member.role === 'moderator'
                              ? 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                              : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {member.role}
                      </span>
                      {member.is_banned ? (
                        <span className="rounded-full bg-[rgba(248,113,113,0.14)] px-2.5 py-1 text-[11px] font-bold text-red-400">
                          Suspended
                        </span>
                      ) : null}
                      {isSelf ? <span className="brand-chip px-2 py-0.5">You</span> : null}
                    </div>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {member.phone}
                      {member.email ? ` | ${member.email}` : ''} | {member.region}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {games.length > 0 ? (
                        games.map((label) => (
                          <span key={label} className="brand-chip px-2 py-0.5">
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--text-soft)]">No games selected yet</span>
                      )}
                    </div>

                    {member.is_banned && member.ban_reason ? (
                      <p className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs leading-6 text-red-300">
                        Reason: {member.ban_reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleDetail(member.id)}
                      className="btn-ghost"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>

                    {actingOn === member.id ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 size={14} className="animate-spin" />
                        Working...
                      </div>
                    ) : (
                      <>
                        {!member.is_banned ? (
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() =>
                              void handleAction(
                                member.id,
                                { action: 'ban', reason: 'Admin moderation action' },
                                'User suspended'
                              )
                            }
                            className="btn-danger"
                          >
                            <Shield size={14} />
                            Ban
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => void handleAction(member.id, { action: 'unban' }, 'User restored')}
                            className="btn-ghost"
                          >
                            <ShieldOff size={14} />
                            Unban
                          </button>
                        )}

                        {user?.role === 'admin' ? (
                          <>
                            {member.role === 'user' ? (
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() =>
                                  void handleAction(
                                    member.id,
                                    { action: 'set_role', role: 'moderator' },
                                    'Moderator access granted'
                                  )
                                }
                                className="btn-ghost"
                              >
                                <UserCog size={14} />
                                Make mod
                              </button>
                            ) : member.role === 'moderator' ? (
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() =>
                                  void handleAction(
                                    member.id,
                                    { action: 'set_role', role: 'user' },
                                    'Moderator access removed'
                                  )
                                }
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

                {isExpanded ? (
                  <div className="mt-5 border-t border-[var(--border-color)] pt-5">
                    {detailLoading || !detail ? (
                      <div className="h-48 shimmer rounded-3xl" />
                    ) : (
                      <div className="space-y-4">
                        <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Player snapshot</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                                  Progress
                                </p>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                  Level {detail.user.level ?? 0} | XP {detail.user.xp ?? 0} | MP {detail.user.mp ?? 0}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-soft)]">
                                  Streak {detail.user.win_streak ?? 0} | Best {detail.user.max_win_streak ?? 0}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                                  Plan
                                </p>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                  {detail.user.plan ?? 'free'}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-soft)]">
                                  {detail.user.plan_expires_at
                                    ? `Expires ${new Date(detail.user.plan_expires_at).toLocaleString()}`
                                    : 'No paid plan expiry'}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                                  Platforms
                                </p>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                  {detail.user.platforms.length > 0
                                    ? detail.user.platforms
                                        .map((platform) => PLATFORMS[platform]?.label ?? platform)
                                        .join(', ')
                                    : 'No platforms set'}
                                </p>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                                  Queue state
                                </p>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                  {detail.currentQueueEntry
                                    ? `${GAMES[detail.currentQueueEntry.game]?.label ?? detail.currentQueueEntry.game} | ${detail.currentQueueEntry.status}`
                                    : 'Not currently queued'}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-soft)]">
                                  {detail.currentQueueEntry
                                    ? `Joined ${new Date(detail.currentQueueEntry.joined_at).toLocaleString()}`
                                    : 'No active queue entry'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Current subscription</p>
                            {!detail.currentSubscription ? (
                              <p className="mt-4 text-sm text-[var(--text-secondary)]">No active subscription record.</p>
                            ) : (
                              <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                                <p>Plan: {detail.currentSubscription.plan}</p>
                                <p>Status: {detail.currentSubscription.status}</p>
                                <p>Billing: {detail.currentSubscription.billing_cycle}</p>
                                <p>Amount: KSh {detail.currentSubscription.amount_kes.toLocaleString()}</p>
                                <p>
                                  Expires:{' '}
                                  {detail.currentSubscription.expires_at
                                    ? new Date(detail.currentSubscription.expires_at).toLocaleString()
                                    : 'n/a'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-3">
                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Recent matches</p>
                            <div className="mt-4 space-y-3">
                              {detail.recentMatches.length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)]">No recent matches.</p>
                              ) : (
                                detail.recentMatches.map((match) => (
                                  <div key={match.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-3">
                                    <p className="text-sm font-black text-[var(--text-primary)]">
                                      {match.player1?.username ?? 'Unknown'} vs {match.player2?.username ?? 'Unknown'}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                      {GAMES[match.game]?.label ?? match.game} | {match.status}
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                                      {new Date(match.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Lobby activity</p>
                            <div className="mt-4 space-y-3">
                              {[...detail.hostedLobbies.map((lobby) => ({ type: 'hosted', lobby })), ...detail.joinedLobbies.map((item) => ({ type: 'joined' as const, lobby: item.lobby }))].slice(0, 6).length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)]">No recent lobbies.</p>
                              ) : (
                                [...detail.hostedLobbies.map((lobby) => ({ type: 'hosted', lobby })), ...detail.joinedLobbies.map((item) => ({ type: 'joined' as const, lobby: item.lobby }))]
                                  .slice(0, 6)
                                  .map((item) => (
                                    <div key={`${item.type}-${item.lobby.id}`} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-black text-[var(--text-primary)]">{item.lobby.title}</p>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                                          {item.type}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                        {item.lobby.status} | Room {item.lobby.room_code}
                                      </p>
                                      <Link href={`/lobbies/${item.lobby.id}`} className="brand-link mt-2 inline-flex text-xs font-semibold">
                                        Open room
                                      </Link>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Tournament activity</p>
                            <div className="mt-4 space-y-3">
                              {[...detail.organizedTournaments.map((tournament) => ({ type: 'hosted', tournament })), ...detail.joinedTournaments.map((item) => ({ type: 'joined' as const, tournament: item.tournament, payment_status: item.payment_status }))].slice(0, 6).length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)]">No recent tournaments.</p>
                              ) : (
                                [...detail.organizedTournaments.map((tournament) => ({ type: 'hosted', tournament })), ...detail.joinedTournaments.map((item) => ({ type: 'joined' as const, tournament: item.tournament, payment_status: item.payment_status }))]
                                  .slice(0, 6)
                                  .map((item) => (
                                    <div key={`${item.type}-${item.tournament.id}`} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-black text-[var(--text-primary)]">{item.tournament.title}</p>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                                          {item.type}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                        {item.tournament.status}
                                        {' payout_status' in item && item.payment_status ? ` | ${item.payment_status}` : ''}
                                      </p>
                                      <Link href={`/t/${item.tournament.slug}`} className="brand-link mt-2 inline-flex text-xs font-semibold">
                                        Open bracket
                                      </Link>
                                    </div>
                                  ))
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
