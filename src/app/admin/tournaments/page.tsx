'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, Save, ShieldAlert, Trophy, Users, X } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS } from '@/lib/config';
import type {
  GameKey,
  PlatformKey,
  TournamentApprovalStatus,
  TournamentPaymentStatus,
} from '@/types';

interface TournamentRow {
  id: string;
  slug: string;
  title: string;
  game: GameKey;
  platform?: PlatformKey | null;
  size: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  approval_status: TournamentApprovalStatus;
  is_featured: boolean;
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
  supportsReviewControls: boolean;
  tournament: TournamentRow & {
    region?: string | null;
    platform_fee?: number;
    platform_fee_rate?: number;
    rules?: string | null;
    payout_status?: string | null;
    payout_ref?: string | null;
    payout_error?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
    approved_at?: string | null;
    approved_by?: string | null;
    confirmed_count?: number;
    paid_count?: number;
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

type TournamentEditForm = {
  title: string;
  game: GameKey;
  platform: PlatformKey | '';
  region: string;
  size: number;
  entry_fee: number;
  rules: string;
};

const STATUS_TABS = ['all', 'open', 'full', 'active', 'completed', 'cancelled'] as const;

function getTournamentPriority(tournament: TournamentRow) {
  if (tournament.approval_status === 'pending') {
    return 0;
  }

  if (tournament.status === 'active') {
    return 1;
  }

  if (tournament.status === 'full') {
    return 2;
  }

  if (tournament.status === 'open') {
    return 3;
  }

  if (tournament.status === 'completed') {
    return 4;
  }

  return 5;
}

function getTournamentDecision(tournament: TournamentRow) {
  if (tournament.approval_status === 'pending') {
    return 'Approve, reject, or send this bracket back to review before it gains more visibility.';
  }

  if (tournament.status === 'active') {
    return 'Monitor live matches, bracket progression, and payout visibility while players are in flight.';
  }

  if (tournament.status === 'full') {
    return 'Confirm the bracket is ready to start and that any last-minute changes are handled quickly.';
  }

  if (tournament.status === 'open') {
    return 'Watch sign-ups and listing quality so this event is ready before the lobby fills.';
  }

  if (tournament.status === 'completed') {
    return 'Historical event only. Use details if you need payout or bracket evidence.';
  }

  return 'No immediate intervention is required unless a player reports a bracket issue.';
}

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

function formatTournamentStatus(status: string) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'full':
      return 'Full';
    case 'active':
      return 'Live';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function formatApprovalStatus(status: TournamentApprovalStatus) {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'pending':
    default:
      return 'Pending review';
  }
}

function approvalStatusClass(status: TournamentApprovalStatus) {
  switch (status) {
    case 'approved':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]';
    case 'rejected':
      return 'bg-red-500/14 text-red-400';
    case 'pending':
    default:
      return 'bg-amber-500/14 text-amber-400';
  }
}

function buildEditForm(tournament: TournamentDetail['tournament']): TournamentEditForm {
  return {
    title: tournament.title,
    game: tournament.game,
    platform: tournament.platform ?? '',
    region: tournament.region ?? '',
    size: tournament.size,
    entry_fee: tournament.entry_fee,
    rules: tournament.rules ?? '',
  };
}

export default function AdminTournamentsPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [supportsReviewControls, setSupportsReviewControls] = useState(true);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [detailTournamentId, setDetailTournamentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editForm, setEditForm] = useState<TournamentEditForm | null>(null);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (tab !== 'all') params.set('status', tab);
      const res = await authFetch(`/api/admin/tournaments?${params.toString()}`);
      const data = (await res.json()) as {
        error?: string;
        tournaments?: TournamentRow[];
        supportsReviewControls?: boolean;
      };
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load tournaments');
        setTournaments([]);
        return;
      }
      setTournaments(data.tournaments ?? []);
      setSupportsReviewControls(data.supportsReviewControls ?? true);
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
          setEditForm(null);
          return null;
        }

        const parsedDetail = data as TournamentDetail;
        const nextDetail = {
          ...parsedDetail,
          supportsReviewControls: parsedDetail.supportsReviewControls ?? true,
        };
        setDetail(nextDetail);
        setEditForm(buildEditForm(nextDetail.tournament));
        setDetailTournamentId(tournamentId);
        return nextDetail;
      } catch {
        toast.error('Network error while loading tournament detail');
        setDetail(null);
        setEditForm(null);
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
          return false;
        }
        toast.success(successMessage);
        await fetchTournaments();
        if (detailTournamentId === tournamentId) {
          await fetchTournamentDetail(tournamentId);
        }
        return true;
      } catch {
        toast.error('Network error');
        return false;
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
        setEditForm(null);
        return;
      }

      await fetchTournamentDetail(tournamentId);
    },
    [detailTournamentId, fetchTournamentDetail]
  );
  const sortedTournaments = useMemo(
    () =>
      [...tournaments].sort((left, right) => {
        const leftPriority = getTournamentPriority(left);
        const rightPriority = getTournamentPriority(right);

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }),
    [tournaments]
  );
  const tournamentSummary = useMemo(
    () => ({
      nextDecision: sortedTournaments[0] ?? null,
      pendingReview: tournaments.filter((tournament) => tournament.approval_status === 'pending').length,
      liveNow: tournaments.filter((tournament) => tournament.status === 'active').length,
      readyToFeature: supportsReviewControls
        ? tournaments.filter(
            (tournament) => tournament.approval_status === 'approved' && !tournament.is_featured
          ).length
        : 0,
    }),
    [sortedTournaments, supportsReviewControls, tournaments]
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
              Review payout visibility, approve brackets before they get featured, and fix event
              details before players are affected.
            </p>
            {!supportsReviewControls ? (
              <p className="mt-3 max-w-2xl text-sm leading-7 text-amber-300">
                Tournament review and featured placement are temporarily unavailable on the live
                database until the latest migration is applied. Listing, edits, and bracket ops
                still work normally.
              </p>
            ) : null}
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

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4">
            <p className="section-title">Next decision</p>
            <p className="mt-2 text-base font-black text-[var(--text-primary)]">
              {tournamentSummary.nextDecision?.title ?? 'No tournament needs intervention'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {tournamentSummary.nextDecision
                ? getTournamentDecision(tournamentSummary.nextDecision)
                : 'This lane is clear right now.'}
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Needs approval
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--brand-coral)]">
              {tournamentSummary.pendingReview}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Brackets waiting on moderation before trust can increase.
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Live now
            </p>
            <p className="mt-2 text-2xl font-black text-[#60A5FA]">{tournamentSummary.liveNow}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Active brackets to watch for player friction and payout blockers.
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Ready to feature
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--brand-teal)]">
              {tournamentSummary.readyToFeature}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Approved brackets that can be promoted if they deserve more traffic.
            </p>
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
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">
            No tournaments matched that status.
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Switch tabs to inspect older or live events.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTournaments.map((tournament) => {
            const gameLabel = GAMES[tournament.game]?.label ?? tournament.game;
            const playerCount = tournament.player_count ?? 0;
            const canCancel =
              ['open', 'full', 'active'].includes(tournament.status) && user?.role === 'admin';
            const isExpanded = detailTournamentId === tournament.id;
            const tournamentDecision = getTournamentDecision(tournament);

            return (
              <div key={tournament.id} className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--text-primary)]">
                        {tournament.title}
                      </p>
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
                        {formatTournamentStatus(tournament.status)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${approvalStatusClass(tournament.approval_status)}`}
                      >
                        {formatApprovalStatus(tournament.approval_status)}
                      </span>
                      {tournament.is_featured ? (
                        <span className="brand-chip-coral px-2 py-0.5">Featured</span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {tournamentDecision}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                        Organizer: {tournament.organizer?.username ?? 'Unknown'}
                      </span>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                        {playerCount}/{tournament.size} players
                      </span>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                        Entry KSh {tournament.entry_fee.toLocaleString()}
                      </span>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                        Prize KSh {tournament.prize_pool.toLocaleString()}
                      </span>
                      {tournament.winner ? (
                        <span className="rounded-full border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] px-2.5 py-1 text-[11px] text-[var(--brand-teal)]">
                          Winner: {tournament.winner.username}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={12} />
                        Created {new Date(tournament.created_at).toLocaleString()}
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
                    {detailLoading || !detail || !editForm ? (
                      <div className="h-48 shimmer rounded-3xl" />
                    ) : (
                      (() => {
                        const holdCount =
                          (detail.paymentBreakdown.pending ?? 0) +
                          (detail.paymentBreakdown.paid ?? 0) +
                          (detail.paymentBreakdown.free ?? 0);
                        const canEditStructure =
                          detail.tournament.status === 'open' &&
                          holdCount <= 1 &&
                          (detail.paymentBreakdown.paid ?? 0) === 0;
                        const availablePlatforms = GAMES[editForm.game]?.platforms ?? [];
                        const isActingHere = actingOn === detail.tournament.id;

                        return (
                          <div className="space-y-4">
                            <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                              <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  Tournament snapshot
                                </p>
                                <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                                  <p>Status: {formatTournamentStatus(detail.tournament.status)}</p>
                                  <p>
                                    Review:{' '}
                                    {detail.supportsReviewControls
                                      ? formatApprovalStatus(detail.tournament.approval_status)
                                      : 'Unavailable on current schema'}
                                  </p>
                                  <p>
                                    Featured:{' '}
                                    {detail.supportsReviewControls
                                      ? detail.tournament.is_featured
                                        ? 'Yes'
                                        : 'No'
                                      : 'Unavailable on current schema'}
                                  </p>
                                  <p>Region: {detail.tournament.region ?? 'n/a'}</p>
                                  <p>
                                    Entry fee: KSh {detail.tournament.entry_fee.toLocaleString()}
                                  </p>
                                  <p>
                                    Prize pool: KSh {detail.tournament.prize_pool.toLocaleString()}
                                  </p>
                                  <p>
                                    Platform fee: KSh{' '}
                                    {(detail.tournament.platform_fee ?? 0).toLocaleString()}
                                  </p>
                                  <p>Payout status: {detail.tournament.payout_status ?? 'none'}</p>
                                  <p>Payout ref: {detail.tournament.payout_ref ?? 'n/a'}</p>
                                  <p>Payout error: {detail.tournament.payout_error ?? 'n/a'}</p>
                                  <p>
                                    Organizer: {detail.tournament.organizer?.username ?? 'Unknown'}
                                  </p>
                                  {detail.tournament.winner ? (
                                    <p>Winner: {detail.tournament.winner.username}</p>
                                  ) : null}
                                </div>
                              </div>

                              <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  Finance visibility
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  {(Object.entries(detail.paymentBreakdown) as Array<
                                    [TournamentPaymentStatus, number]
                                  >).map(([status, count]) => (
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
                                  ))}
                                </div>
                                <div className="mt-4 space-y-1 text-xs leading-6 text-[var(--text-soft)]">
                                  <p>
                                    Paid entries collected: KSh{' '}
                                    {detail.tournament.prize_pool.toLocaleString()}
                                  </p>
                                  <p>
                                    Live confirmed slots: {detail.tournament.confirmed_count ?? 0}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                              <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  Review and placement
                                </p>
                                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                  {detail.supportsReviewControls
                                    ? 'Approve a tournament before featuring it. Moving a tournament back to review or rejecting it automatically removes the featured flag.'
                                    : 'This environment has not run the tournament review migration yet, so review and featured placement controls are disabled.'}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleAction(
                                        detail.tournament.id,
                                        {
                                          action: 'set_approval',
                                          approval_status: 'approved',
                                          reason: 'Admin approved tournament for public trust',
                                        },
                                        'Tournament approved'
                                      )
                                    }
                                    className="btn-ghost"
                                    disabled={
                                      isActingHere ||
                                      !detail.supportsReviewControls ||
                                      detail.tournament.approval_status === 'approved'
                                    }
                                  >
                                    <CheckCircle2 size={14} />
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleAction(
                                        detail.tournament.id,
                                        {
                                          action: 'set_approval',
                                          approval_status: 'pending',
                                          reason: 'Admin moved tournament back to review',
                                        },
                                        'Tournament moved back to review'
                                      )
                                    }
                                    className="btn-ghost"
                                    disabled={
                                      isActingHere ||
                                      !detail.supportsReviewControls ||
                                      detail.tournament.approval_status === 'pending'
                                    }
                                  >
                                    Send to review
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleAction(
                                        detail.tournament.id,
                                        {
                                          action: 'set_approval',
                                          approval_status: 'rejected',
                                          reason: 'Admin rejected tournament listing',
                                        },
                                        'Tournament rejected'
                                      )
                                    }
                                    className="btn-danger"
                                    disabled={
                                      isActingHere ||
                                      !detail.supportsReviewControls ||
                                      detail.tournament.approval_status === 'rejected'
                                    }
                                  >
                                    Reject
                                  </button>
                                </div>

                                <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    Featured placement
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                    {detail.supportsReviewControls
                                      ? 'Use this for brackets you want at the top of the tournament feed.'
                                      : 'Featured placement is unavailable until the live database has the review controls migration.'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleAction(
                                        detail.tournament.id,
                                        {
                                          action: 'set_featured',
                                          is_featured: !detail.tournament.is_featured,
                                          reason: detail.tournament.is_featured
                                            ? 'Admin removed tournament from featured placement'
                                            : 'Admin featured tournament',
                                        },
                                        detail.tournament.is_featured
                                          ? 'Tournament removed from featured'
                                          : 'Tournament featured'
                                      )
                                    }
                                    className={`mt-4 ${detail.tournament.is_featured ? 'btn-ghost' : 'btn-primary'}`}
                                    disabled={
                                      isActingHere ||
                                      !detail.supportsReviewControls ||
                                      (!detail.tournament.is_featured &&
                                        detail.tournament.approval_status !== 'approved')
                                    }
                                  >
                                    {detail.supportsReviewControls
                                      ? detail.tournament.is_featured
                                        ? 'Remove featured flag'
                                        : 'Feature tournament'
                                      : 'Featured placement unavailable'}
                                  </button>
                                </div>
                              </div>

                              <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  Edit details
                                </p>
                                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                  Title, region, and rules stay editable. Game, platform, size, and
                                  entry fee lock once other players join or payments begin.
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <div className="sm:col-span-2">
                                    <label className="label">Title</label>
                                    <input
                                      value={editForm.title}
                                      onChange={(event) =>
                                        setEditForm((current) =>
                                          current
                                            ? { ...current, title: event.target.value }
                                            : current
                                        )
                                      }
                                      className="input"
                                      maxLength={80}
                                    />
                                  </div>

                                  <div>
                                    <label className="label">Game</label>
                                    <select
                                      value={editForm.game}
                                      onChange={(event) => {
                                        const game = event.target.value as GameKey;
                                        setEditForm((current) =>
                                          current
                                            ? {
                                                ...current,
                                                game,
                                                platform: GAMES[game]?.platforms[0] ?? '',
                                              }
                                            : current
                                        );
                                      }}
                                      className="input"
                                      disabled={!canEditStructure}
                                    >
                                      {Object.entries(GAMES)
                                        .filter(([, value]) => value.mode === '1v1')
                                        .map(([gameKey, value]) => (
                                          <option key={gameKey} value={gameKey}>
                                            {value.label}
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="label">Platform</label>
                                    <select
                                      value={editForm.platform}
                                      onChange={(event) =>
                                        setEditForm((current) =>
                                          current
                                            ? {
                                                ...current,
                                                platform: event.target.value as PlatformKey,
                                              }
                                            : current
                                        )
                                      }
                                      className="input"
                                      disabled={!canEditStructure}
                                    >
                                      {availablePlatforms.map((platform) => (
                                        <option key={platform} value={platform}>
                                          {PLATFORMS[platform]?.label ?? platform}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="label">Region</label>
                                    <input
                                      value={editForm.region}
                                      onChange={(event) =>
                                        setEditForm((current) =>
                                          current
                                            ? { ...current, region: event.target.value }
                                            : current
                                        )
                                      }
                                      className="input"
                                    />
                                  </div>

                                  <div>
                                    <label className="label">Slots</label>
                                    <select
                                      value={editForm.size}
                                      onChange={(event) =>
                                        setEditForm((current) =>
                                          current
                                            ? {
                                                ...current,
                                                size: Number(event.target.value),
                                              }
                                            : current
                                        )
                                      }
                                      className="input"
                                      disabled={!canEditStructure}
                                    >
                                      {[4, 8, 16].map((size) => (
                                        <option key={size} value={size}>
                                          {size} players
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="sm:col-span-2">
                                    <label className="label">Entry fee (KES)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={editForm.entry_fee}
                                      onChange={(event) =>
                                        setEditForm((current) =>
                                          current
                                            ? {
                                                ...current,
                                                entry_fee: Number(event.target.value),
                                              }
                                            : current
                                        )
                                      }
                                      className="input"
                                      disabled={!canEditStructure}
                                    />
                                  </div>

                                  <div className="sm:col-span-2">
                                    <label className="label">Rules</label>
                                    <textarea
                                      value={editForm.rules}
                                      onChange={(event) =>
                                        setEditForm((current) =>
                                          current
                                            ? { ...current, rules: event.target.value }
                                            : current
                                        )
                                      }
                                      className="input min-h-28 resize-none"
                                      maxLength={800}
                                    />
                                  </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-xs leading-6 text-[var(--text-soft)]">
                                  {canEditStructure
                                    ? 'Structural edits are still open because only the organizer slot is holding the bracket.'
                                    : 'Structural edits are locked on this tournament because players or payments are already in flight.'}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleAction(
                                      detail.tournament.id,
                                      {
                                        action: 'update_details',
                                        title: editForm.title,
                                        game: editForm.game,
                                        platform: editForm.platform,
                                        region: editForm.region,
                                        size: editForm.size,
                                        entry_fee: editForm.entry_fee,
                                        rules: editForm.rules,
                                        reason: 'Admin updated tournament details',
                                      },
                                      'Tournament details updated'
                                    )
                                  }
                                  className="btn-primary mt-4"
                                  disabled={isActingHere}
                                >
                                  <Save size={14} />
                                  Save changes
                                </button>
                              </div>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
                              <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  Players and payment state
                                </p>
                                <div className="mt-4 space-y-3">
                                  {detail.players.length === 0 ? (
                                    <p className="text-sm text-[var(--text-secondary)]">
                                      No players found.
                                    </p>
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
                                                {detail.tournament.winner?.id ===
                                                playerUser?.id ? (
                                                  <span className="brand-chip-coral px-2 py-0.5">
                                                    Winner
                                                  </span>
                                                ) : null}
                                              </div>
                                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                                {playerUser?.phone ?? 'No phone'}
                                                {playerUser?.email
                                                  ? ` | ${playerUser.email}`
                                                  : ''}
                                              </p>
                                              <p className="mt-1 text-xs text-[var(--text-soft)]">
                                                Joined{' '}
                                                {new Date(player.joined_at).toLocaleString()}
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
                                                      reason:
                                                        'Admin set tournament winner from control room',
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
                                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    Bracket matches
                                  </p>
                                  <div className="mt-4 space-y-3">
                                    {detail.bracketMatches.length === 0 ? (
                                      <p className="text-sm text-[var(--text-secondary)]">
                                        No bracket matches yet.
                                      </p>
                                    ) : (
                                      detail.bracketMatches.slice(0, 6).map((match) => (
                                        <div
                                          key={match.id}
                                          className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3"
                                        >
                                          <p className="text-sm font-black text-[var(--text-primary)]">
                                            Round {match.round}, Slot {match.slot}
                                          </p>
                                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                            {match.player1?.username ?? 'TBD'} vs{' '}
                                            {match.player2?.username ?? 'TBD'}
                                          </p>
                                          <p className="mt-1 text-xs text-[var(--text-soft)]">
                                            {match.status}
                                            {match.winner
                                              ? ` | Winner ${match.winner.username}`
                                              : ''}
                                          </p>
                                          {match.match?.player1_score !== null &&
                                          match.match?.player1_score !== undefined &&
                                          match.match?.player2_score !== null &&
                                          match.match?.player2_score !== undefined ? (
                                            <p className="mt-1 text-xs text-[var(--text-soft)]">
                                              Score: {match.match.player1_score} -{' '}
                                              {match.match.player2_score}
                                            </p>
                                          ) : null}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>

                                <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    Linked live matches
                                  </p>
                                  <div className="mt-4 space-y-3">
                                    {detail.liveMatches.length === 0 ? (
                                      <p className="text-sm text-[var(--text-secondary)]">
                                        No live matches yet.
                                      </p>
                                    ) : (
                                      detail.liveMatches.slice(0, 6).map((match) => (
                                        <div
                                          key={match.id}
                                          className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3"
                                        >
                                          <p className="text-sm font-black text-[var(--text-primary)]">
                                            {match.player1?.username ?? 'Unknown'} vs{' '}
                                            {match.player2?.username ?? 'Unknown'}
                                          </p>
                                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                            {match.status}
                                          </p>
                                          {match.player1_score !== null &&
                                          match.player1_score !== undefined &&
                                          match.player2_score !== null &&
                                          match.player2_score !== undefined ? (
                                            <p className="mt-1 text-xs text-[var(--text-soft)]">
                                              Score: {match.player1_score} -{' '}
                                              {match.player2_score}
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
                        );
                      })()
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
