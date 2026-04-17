'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, ShieldAlert, Trophy, Users, X } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES } from '@/lib/config';
import type { GameKey, TournamentPaymentStatus } from '@/types';

interface TournamentRow {
  id: string;
  slug: string;
  title: string;
  game: GameKey;
  size: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  created_at: string;
  organizer: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  player_count: number;
}

interface TournamentPlayerDetail {
  id: string;
  seed: number | null;
  payment_status: TournamentPaymentStatus;
  joined_at: string;
  user: { id: string; username: string; email?: string | null; phone?: string | null } | null;
}

interface TournamentDetail {
  tournament: TournamentRow & {
    platform?: string | null;
    region?: string | null;
    platform_fee?: number;
    platform_fee_rate?: number;
    rules?: string | null;
    payout_status?: string | null;
    payout_ref?: string | null;
    payout_error?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
    organizer?: { id: string; username: string; email?: string | null } | null;
    winner?: { id: string; username: string } | null;
  };
  players: TournamentPlayerDetail[];
  bracketMatches: Array<{
    id: string;
    round: number;
    slot: number;
    status: string;
    player1?: { id: string; username: string } | null;
    player2?: { id: string; username: string } | null;
    winner?: { id: string; username: string } | null;
    match?: {
      id: string;
      status: string;
      player1_score?: number | null;
      player2_score?: number | null;
    } | null;
  }>;
  liveMatches: Array<{
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    winner_id: string | null;
    player1_score?: number | null;
    player2_score?: number | null;
    player1?: { id: string; username: string } | null;
    player2?: { id: string; username: string } | null;
  }>;
  paymentBreakdown: Record<TournamentPaymentStatus, number>;
}

const STATUS_TABS = ['all', 'open', 'full', 'active', 'completed', 'cancelled'] as const;

function paymentStatusClass(status: TournamentPaymentStatus) {
  switch (status) {
    case 'paid':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]';
    case 'free':
      return 'bg-blue-500/14 text-blue-400';
    case 'pending':
      return 'bg-amber-500/14 text-amber-400';
    case 'failed':
      return 'bg-red-500/14 text-red-400';
    case 'refunded':
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
    default:
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
  }
}

export default function AdminTournamentsPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [detailTournamentId, setDetailTournamentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (tab !== 'all') params.set('status', tab);
      const res = await authFetch(`/api/admin/tournaments?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load tournaments');
        setTournaments([]);
        return;
      }
      setTournaments((data.tournaments ?? []) as TournamentRow[]);
    } catch {
      toast.error('Network error while loading tournaments');
    } finally {
      setLoading(false);
    }
  }, [authFetch, tab]);

  const fetchTournamentDetail = useCallback(
    async (tournamentId: string) => {
      setDetailLoading(true);
      try {
        const res = await authFetch(`/api/admin/tournaments/${tournamentId}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Failed to load tournament detail');
          setDetail(null);
          return null;
        }

        const nextDetail = data as TournamentDetail;
        setDetail(nextDetail);
        setDetailTournamentId(tournamentId);
        return nextDetail;
      } catch {
        toast.error('Network error while loading tournament detail');
        setDetail(null);
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  const handleAction = useCallback(
    async (tournamentId: string, body: Record<string, unknown>, successMessage: string) => {
      setActingOn(tournamentId);
      try {
        const res = await authFetch(`/api/admin/tournaments/${tournamentId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Action failed');
          return;
        }
        toast.success(successMessage);
        await fetchTournaments();
        if (detailTournamentId === tournamentId) {
          await fetchTournamentDetail(tournamentId);
        }
      } catch {
        toast.error('Network error');
      } finally {
        setActingOn(null);
      }
    },
    [authFetch, detailTournamentId, fetchTournamentDetail, fetchTournaments]
  );

  const handleToggleDetail = useCallback(
    async (tournamentId: string) => {
      if (detailTournamentId === tournamentId) {
        setDetailTournamentId(null);
        setDetail(null);
        return;
      }

      await fetchTournamentDetail(tournamentId);
    },
    [detailTournamentId, fetchTournamentDetail]
  );

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <p className="brand-kicker">Admin tournaments</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Brackets, entries, and tournament health
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Review live brackets, inspect payment state and payout outcomes, and kill broken events
              when the competition lane gets messy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setTab(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                  tab === status
                    ? 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 shimmer rounded-3xl" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card p-10 text-center">
          <Trophy size={22} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No tournaments matched that status.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Switch tabs to inspect older or live events.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((tournament) => {
            const gameLabel = GAMES[tournament.game]?.label ?? tournament.game;
            const playerCount = tournament.player_count ?? 0;
            const canCancel = ['open', 'full', 'active'].includes(tournament.status) && user?.role === 'admin';
            const isExpanded = detailTournamentId === tournament.id;

            return (
              <div key={tournament.id} className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--text-primary)]">{tournament.title}</p>
                      <span className="brand-chip px-2 py-0.5">{gameLabel}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          tournament.status === 'active'
                            ? 'bg-blue-500/14 text-blue-400'
                            : tournament.status === 'completed'
                              ? 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                              : tournament.status === 'cancelled'
                                ? 'bg-red-500/14 text-red-400'
                                : 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                        }`}
                      >
                        {tournament.status}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      By {tournament.organizer?.username ?? 'Unknown'} | {playerCount}/{tournament.size} players | KSh{' '}
                      {tournament.entry_fee.toLocaleString()} entry
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Prize pool: KSh {tournament.prize_pool.toLocaleString()}
                      {tournament.winner ? ` | Winner: ${tournament.winner.username}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      Created {new Date(tournament.created_at).toLocaleString()}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={12} />
                        {playerCount} locked in
                      </span>
                      <Link href={`/t/${tournament.slug}`} className="brand-link font-semibold">
                        Open bracket
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleDetail(tournament.id)}
                      className="btn-ghost"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>

                    {actingOn === tournament.id ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 size={14} className="animate-spin" />
                        Working...
                      </div>
                    ) : canCancel ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleAction(
                            tournament.id,
                            { action: 'cancel', reason: 'Admin cancelled tournament' },
                            'Tournament cancelled'
                          )
                        }
                        className="btn-danger"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <ShieldAlert size={14} className="text-[var(--text-soft)]" />
                        {user?.role === 'admin' ? 'No action needed' : 'Admin-only cancel'}
                      </span>
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
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Tournament snapshot</p>
                            <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                              <p>Status: {detail.tournament.status}</p>
                              <p>Region: {detail.tournament.region ?? 'n/a'}</p>
                              <p>Entry fee: KSh {detail.tournament.entry_fee.toLocaleString()}</p>
                              <p>Prize pool: KSh {detail.tournament.prize_pool.toLocaleString()}</p>
                              <p>Platform fee: KSh {(detail.tournament.platform_fee ?? 0).toLocaleString()}</p>
                              <p>Payout status: {detail.tournament.payout_status ?? 'none'}</p>
                              <p>Payout ref: {detail.tournament.payout_ref ?? 'n/a'}</p>
                              <p>Payout error: {detail.tournament.payout_error ?? 'n/a'}</p>
                              <p>Organizer: {detail.tournament.organizer?.username ?? 'Unknown'}</p>
                              {detail.tournament.winner ? <p>Winner: {detail.tournament.winner.username}</p> : null}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Finance visibility</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {(Object.entries(detail.paymentBreakdown) as Array<[TournamentPaymentStatus, number]>).map(
                                ([status, count]) => (
                                  <div
                                    key={status}
                                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3"
                                  >
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                                      {status}
                                    </p>
                                    <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                                      {count}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                            <p className="mt-4 text-xs leading-6 text-[var(--text-soft)]">
                              Finance is visibility-only in v1. No refund, retry, or manual payout actions live here.
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Players and payment state</p>
                            <div className="mt-4 space-y-3">
                              {detail.players.length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)]">No players found.</p>
                              ) : (
                                detail.players.map((player) => {
                                  const playerUser = player.user;

                                  return (
                                    <div
                                      key={player.id}
                                      className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3"
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-black text-[var(--text-primary)]">
                                              {playerUser?.username ?? 'Unknown'}
                                            </p>
                                            <span
                                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${paymentStatusClass(player.payment_status)}`}
                                            >
                                              {player.payment_status}
                                            </span>
                                            {detail.tournament.winner?.id === playerUser?.id ? (
                                              <span className="brand-chip-coral px-2 py-0.5">Winner</span>
                                            ) : null}
                                          </div>
                                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                            {playerUser?.phone ?? 'No phone'}{playerUser?.email ? ` | ${playerUser.email}` : ''}
                                          </p>
                                          <p className="mt-1 text-xs text-[var(--text-soft)]">
                                            Joined {new Date(player.joined_at).toLocaleString()}
                                            {player.seed ? ` | Seed ${player.seed}` : ''}
                                          </p>
                                        </div>

                                        {user?.role === 'admin' && playerUser ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void handleAction(
                                                detail.tournament.id,
                                                {
                                                  action: 'override_winner',
                                                  winner_id: playerUser.id,
                                                  reason: 'Admin set tournament winner from control room',
                                                },
                                                `${playerUser.username} set as tournament winner`
                                              )
                                            }
                                            className="btn-ghost"
                                          >
                                            Set winner
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                              <p className="text-sm font-semibold text-[var(--text-primary)]">Bracket matches</p>
                              <div className="mt-4 space-y-3">
                                {detail.bracketMatches.length === 0 ? (
                                  <p className="text-sm text-[var(--text-secondary)]">No bracket matches yet.</p>
                                ) : (
                                  detail.bracketMatches.slice(0, 6).map((match) => (
                                    <div key={match.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                                      <p className="text-sm font-black text-[var(--text-primary)]">
                                        Round {match.round}, Slot {match.slot}
                                      </p>
                                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                        {match.player1?.username ?? 'TBD'} vs {match.player2?.username ?? 'TBD'}
                                      </p>
                                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                                        {match.status}{match.winner ? ` | Winner ${match.winner.username}` : ''}
                                      </p>
                                      {match.match?.player1_score !== null &&
                                      match.match?.player1_score !== undefined &&
                                      match.match?.player2_score !== null &&
                                      match.match?.player2_score !== undefined ? (
                                        <p className="mt-1 text-xs text-[var(--text-soft)]">
                                          Score: {match.match.player1_score} - {match.match.player2_score}
                                        </p>
                                      ) : null}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                              <p className="text-sm font-semibold text-[var(--text-primary)]">Linked live matches</p>
                              <div className="mt-4 space-y-3">
                                {detail.liveMatches.length === 0 ? (
                                  <p className="text-sm text-[var(--text-secondary)]">No live matches yet.</p>
                                ) : (
                                  detail.liveMatches.slice(0, 6).map((match) => (
                                    <div key={match.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                                      <p className="text-sm font-black text-[var(--text-primary)]">
                                        {match.player1?.username ?? 'Unknown'} vs {match.player2?.username ?? 'Unknown'}
                                      </p>
                                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{match.status}</p>
                                      {match.player1_score !== null &&
                                      match.player1_score !== undefined &&
                                      match.player2_score !== null &&
                                      match.player2_score !== undefined ? (
                                        <p className="mt-1 text-xs text-[var(--text-soft)]">
                                          Score: {match.player1_score} - {match.player2_score}
                                        </p>
                                      ) : null}
                                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                                        {new Date(match.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
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
