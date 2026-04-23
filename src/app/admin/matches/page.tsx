'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, Loader2, MessageCircle, Send, Swords, X } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS } from '@/lib/config';
import type {
  GameKey,
  MatchChatMessage,
  MatchEscalation,
  MatchEscalationReason,
  PlatformKey,
} from '@/types';

interface MatchRow {
  id: string;
  game: GameKey;
  platform: PlatformKey | null;
  region: string;
  status: string;
  winner_id: string | null;
  player1_score?: number | null;
  player2_score?: number | null;
  created_at: string;
  completed_at: string | null;
  dispute_screenshot_url: string | null;
  tournament_id: string | null;
  open_escalation_count?: number | null;
  player1: { id: string; username: string } | null;
  player2: { id: string; username: string } | null;
}

interface MatchDetail {
  match: MatchRow & {
    player1_id: string;
    player2_id: string;
    player1_reported_winner: string | null;
    player2_reported_winner: string | null;
    player1_reported_player1_score?: number | null;
    player1_reported_player2_score?: number | null;
    player2_reported_player1_score?: number | null;
    player2_reported_player2_score?: number | null;
    player1_score?: number | null;
    player2_score?: number | null;
    rating_change_p1: number | null;
    rating_change_p2: number | null;
    dispute_requested_by: string | null;
    gamification_summary_p1?: unknown;
    gamification_summary_p2?: unknown;
    player1: { id: string; username: string; email?: string | null; phone?: string | null } | null;
    player2: { id: string; username: string; email?: string | null; phone?: string | null } | null;
  };
  disputeRequester: { id: string; username: string } | null;
  reportState: {
    player1ReportedWinner: { id: string; username: string } | null;
    player2ReportedWinner: { id: string; username: string } | null;
  };
  tournament: { id: string; slug: string; title: string; status: string; payout_status?: string | null } | null;
  chatMessages: MatchChatMessage[];
  escalations: MatchEscalation[];
  openEscalationCount: number;
}

const STATUS_TABS = ['attention', 'all', 'disputed', 'pending', 'completed', 'cancelled'] as const;
const DETAIL_POLL_INTERVAL_MS = 10000;
const STATUS_LABELS: Record<(typeof STATUS_TABS)[number], string> = {
  attention: 'Needs attention',
  all: 'All',
  disputed: 'Disputed',
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const MATCH_ESCALATION_REASON_LABELS: Record<MatchEscalationReason, string> = {
  setup_issue: 'Setup issue',
  stalling: 'Stalling',
  wrong_result: 'Wrong result',
  abuse: 'Abuse',
  other: 'Other',
};
const STALE_PENDING_MINUTES = 30;

function formatChatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return 'just now';
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function getMatchAgeMinutes(value: string) {
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}

function matchStatusClass(status: string) {
  switch (status) {
    case 'disputed':
      return 'bg-amber-500/14 text-amber-400';
    case 'completed':
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
    case 'pending':
      return 'bg-blue-500/14 text-blue-400';
    default:
      return 'bg-red-500/14 text-red-400';
  }
}

function getMatchPriority(match: MatchRow) {
  const ageMinutes = getMatchAgeMinutes(match.created_at);

  if ((match.open_escalation_count ?? 0) > 0) {
    return 0;
  }

  if (match.status === 'disputed') {
    return 1;
  }

  if (match.status === 'pending' && ageMinutes >= STALE_PENDING_MINUTES) {
    return 2;
  }

  if (match.status === 'pending') {
    return 3;
  }

  if (match.status === 'completed') {
    return 4;
  }

  return 5;
}

function getMatchDecision(match: MatchRow) {
  const ageMinutes = getMatchAgeMinutes(match.created_at);

  if ((match.open_escalation_count ?? 0) > 0) {
    return 'Reply to the help request and unblock the players before the match stalls further.';
  }

  if (match.status === 'disputed') {
    return 'Review the reported winner and dispute proof, then set the final result.';
  }

  if (match.status === 'pending' && ageMinutes >= STALE_PENDING_MINUTES) {
    return 'Check if the match should be nudged forward or cancelled as a stale session.';
  }

  if (match.status === 'pending') {
    return 'Monitor until a result lands or a player asks for help.';
  }

  if (match.status === 'completed') {
    return 'Historical result only. No intervention is needed unless a new dispute appears.';
  }

  return 'Watch for player friction and step in if the live session drifts.';
}

function getChatSenderLabel(message: MatchChatMessage) {
  if (message.sender_type === 'system') {
    return 'Mechi';
  }

  if (message.sender_type === 'admin') {
    return message.sender?.username ?? 'Admin';
  }

  return message.sender?.username ?? 'Player';
}

function getSystemEventLabel(message: MatchChatMessage) {
  const event = String(message.meta?.event ?? message.meta?.seed ?? 'timeline');

  if (event === 'match-start' || event === 'timeline') {
    return 'Match live';
  }

  if (event === 'match_reported') {
    return 'Result submitted';
  }

  if (event === 'match_disputed') {
    return 'Dispute';
  }

  if (event === 'dispute_proof_uploaded') {
    return 'Proof uploaded';
  }

  if (event === 'match_completed') {
    return 'Closed';
  }

  if (event === 'match_cancelled') {
    return 'Cancelled';
  }

  if (event === 'admin_help_requested') {
    return 'Admin help';
  }

  if (event === 'admin_help_resolved') {
    return 'Resolved';
  }

  if (event === 'admin_help_dismissed') {
    return 'Closed';
  }

  return 'Timeline';
}

export default function AdminMatchesPage() {
  const authFetch = useAuthFetch();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('attention');
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [replyingMatchId, setReplyingMatchId] = useState<string | null>(null);
  const [detailMatchId, setDetailMatchId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adminReply, setAdminReply] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (tab !== 'all') params.set('status', tab);
      const res = await authFetch(`/api/admin/matches?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to load matches');
        setMatches([]);
        return;
      }
      setMatches((data.matches ?? []) as MatchRow[]);
    } catch {
      toast.error('Network error while loading matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, tab]);

  const fetchMatchDetail = useCallback(
    async (matchId: string, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setDetailLoading(true);
      }
      try {
        const res = await authFetch(`/api/admin/matches/${matchId}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Failed to load match detail');
          setDetail(null);
          return null;
        }

        const nextDetail = data as MatchDetail;
        setDetail(nextDetail);
        setDetailMatchId(matchId);
        return nextDetail;
      } catch {
        if (!options?.silent) {
          toast.error('Network error while loading match detail');
          setDetail(null);
        }
        return null;
      } finally {
        if (!options?.silent) {
          setDetailLoading(false);
        }
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    if (!detailMatchId) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void fetchMatchDetail(detailMatchId, { silent: true });
    }, DETAIL_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [detailMatchId, fetchMatchDetail]);

  const doAction = useCallback(
    async (matchId: string, body: Record<string, unknown>, successMessage: string) => {
      setActingOn(matchId);
      try {
        const res = await authFetch(`/api/admin/matches/${matchId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Action failed');
          return false;
        }
        toast.success(successMessage);
        await fetchMatches();
        if (detailMatchId === matchId) {
          await fetchMatchDetail(matchId);
        }
        return true;
      } catch {
        toast.error('Network error');
        return false;
      } finally {
        setActingOn(null);
      }
    },
    [authFetch, detailMatchId, fetchMatchDetail, fetchMatches]
  );

  const handleToggleDetail = useCallback(
    async (matchId: string) => {
      if (detailMatchId === matchId) {
        setDetailMatchId(null);
        setDetail(null);
        setAdminReply('');
        return;
      }

      setAdminReply('');
      await fetchMatchDetail(matchId);
    },
    [detailMatchId, fetchMatchDetail]
  );

  const handleAdminReply = useCallback(
    async (matchId: string) => {
      const message = adminReply.trim();

      if (!message) {
        return;
      }

      setReplyingMatchId(matchId);
      try {
        const res = await authFetch(`/api/admin/matches/${matchId}/chat`, {
          method: 'POST',
          body: JSON.stringify({ message }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? 'Could not send admin reply');
          return;
        }

        setAdminReply('');
        toast.success('Admin reply sent');
        await fetchMatchDetail(matchId);
      } catch {
        toast.error('Network error while sending reply');
      } finally {
        setReplyingMatchId(null);
      }
    },
    [adminReply, authFetch, fetchMatchDetail]
  );

  const handleEscalationAction = useCallback(
    async (
      matchId: string,
      escalationId: string,
      action: 'resolve_escalation' | 'dismiss_escalation'
    ) => {
      const note = resolutionNotes[escalationId] ?? '';
      const didSucceed = await doAction(
        matchId,
        {
          action,
          escalation_id: escalationId,
          note,
        },
        action === 'resolve_escalation' ? 'Escalation resolved' : 'Escalation dismissed'
      );

      if (didSucceed) {
        setResolutionNotes((current) => ({
          ...current,
          [escalationId]: '',
        }));
      }
    },
    [doAction, resolutionNotes]
  );
  const sortedMatches = useMemo(
    () =>
      [...matches].sort((left, right) => {
        const leftPriority = getMatchPriority(left);
        const rightPriority = getMatchPriority(right);

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      }),
    [matches]
  );
  const summaryCards = useMemo(
    () => {
      const helpRequests = matches.filter((match) => (match.open_escalation_count ?? 0) > 0).length;
      const disputed = matches.filter((match) => match.status === 'disputed').length;
      const stalePending = matches.filter(
        (match) => match.status === 'pending' && getMatchAgeMinutes(match.created_at) >= STALE_PENDING_MINUTES
      ).length;
      const leadMatch = sortedMatches[0] ?? null;

      return {
        helpRequests,
        disputed,
        stalePending,
        leadMatch,
      };
    },
    [matches, sortedMatches]
  );

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <p className="brand-kicker">Admin matches</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Match reviews, help requests, and dispute fixes
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Start in the attention lane to catch help requests, disputes, and stalled matches
              before the ranked flow backs up.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setTab(status)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  tab === status
                    ? 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <div className="card bg-[var(--surface-elevated)] px-4 py-4">
            <p className="section-title">Next decision</p>
            <p className="mt-2 text-base font-black text-[var(--text-primary)]">
              {summaryCards.leadMatch
                ? `${summaryCards.leadMatch.player1?.username ?? 'Unknown'} vs ${summaryCards.leadMatch.player2?.username ?? 'Unknown'}`
                : 'No active intervention needed'}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {summaryCards.leadMatch
                ? getMatchDecision(summaryCards.leadMatch)
                : 'This lane is clear right now.'}
            </p>
          </div>

          <div className="card bg-[var(--surface-elevated)] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Help requests
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--brand-coral)]">{summaryCards.helpRequests}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Player escalations waiting on human review.
            </p>
          </div>

          <div className="card bg-[var(--surface-elevated)] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Disputes
            </p>
            <p className="mt-2 text-2xl font-black text-amber-400">{summaryCards.disputed}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Matches that need a final result decision.
            </p>
          </div>

          <div className="card bg-[var(--surface-elevated)] px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Stale pending
            </p>
            <p className="mt-2 text-2xl font-black text-[#60A5FA]">{summaryCards.stalePending}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
              Pending matches older than {STALE_PENDING_MINUTES} minutes.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 shimmer rounded-3xl" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="card p-10 text-center">
          <Swords size={22} className="mx-auto text-[var(--text-soft)]" />
          <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">No matches in this lane.</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Try a different filter if you want to review older results.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMatches.map((match) => {
            const gameLabel = GAMES[match.game]?.label ?? match.game;
            const platformLabel = match.platform
              ? (PLATFORMS[match.platform]?.label ?? match.platform)
              : 'Any platform';
            const player1 = match.player1;
            const player2 = match.player2;
            const winnerName =
              match.winner_id === player1?.id
                ? player1?.username
                : match.winner_id === player2?.id
                  ? player2?.username
                  : null;
            const confirmedScoreline =
              match.player1_score !== null &&
              match.player1_score !== undefined &&
              match.player2_score !== null &&
              match.player2_score !== undefined
                ? `${match.player1_score}-${match.player2_score}`
                : null;
            const isExpanded = detailMatchId === match.id;
            const matchDecision = getMatchDecision(match);
            const needsAttention = getMatchPriority(match) <= 2;

            return (
              <div key={match.id} className="card p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black text-[var(--text-primary)]">
                        {match.player1?.username ?? 'Unknown'} vs {match.player2?.username ?? 'Unknown'}
                      </p>
                      <span className="brand-chip px-2 py-0.5">{gameLabel}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${matchStatusClass(match.status)}`}>
                        {match.status}
                      </span>
                      {(match.open_escalation_count ?? 0) > 0 ? (
                        <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-[11px] font-bold text-amber-400">
                          {match.open_escalation_count} help request
                          {(match.open_escalation_count ?? 0) === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      {match.tournament_id ? (
                        <span className="brand-chip-coral px-2 py-0.5">Tournament match</span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {matchDecision}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                        {match.region}
                      </span>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                        {platformLabel}
                      </span>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                        Started {formatRelativeTime(match.created_at)}
                      </span>
                      {winnerName ? (
                        <span className="rounded-full border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] px-2.5 py-1 text-[11px] text-[var(--brand-teal)]">
                          Winner: {winnerName}
                        </span>
                      ) : null}
                      {confirmedScoreline ? (
                        <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                          Score {confirmedScoreline}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-xs text-[var(--text-soft)]">
                      Opened {new Date(match.created_at).toLocaleString()}
                      {needsAttention ? ' | Needs moderator attention' : ' | Monitor only'}
                    </p>

                    {match.dispute_screenshot_url ? (
                      <Link
                        href={match.dispute_screenshot_url}
                        target="_blank"
                        className="brand-link mt-3 inline-flex text-xs font-semibold"
                      >
                        Open dispute proof
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleDetail(match.id)}
                      className="btn-ghost"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                    </button>

                    {actingOn === match.id ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 size={14} className="animate-spin" />
                        Working...
                      </div>
                    ) : (
                      <>
                        {match.status === 'disputed' && player1 && player2 ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void doAction(
                                  match.id,
                                  {
                                    action: 'resolve_dispute',
                                    winner_id: player1.id,
                                    reason: 'Admin reviewed dispute evidence',
                                  },
                                  `${player1.username} set as winner`
                                )
                              }
                              className="btn-ghost"
                            >
                              <Check size={14} />
                              {player1.username}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void doAction(
                                  match.id,
                                  {
                                    action: 'resolve_dispute',
                                    winner_id: player2.id,
                                    reason: 'Admin reviewed dispute evidence',
                                  },
                                  `${player2.username} set as winner`
                                )
                              }
                              className="btn-ghost"
                            >
                              <Check size={14} />
                              {player2.username}
                            </button>
                          </>
                        ) : null}

                        {match.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() =>
                              void doAction(
                                match.id,
                                { action: 'cancel', reason: 'Admin cancelled stale match' },
                                'Match cancelled'
                              )
                            }
                            className="btn-danger"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        ) : null}

                        {match.status === 'completed' ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                            <AlertTriangle size={14} className="text-[var(--text-soft)]" />
                            Completed
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-5 border-t border-[var(--border-color)] pt-5">
                    {detailLoading || !detail ? (
                      <div className="h-40 shimmer rounded-3xl" />
                    ) : (
                      <>
                        <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Match snapshot</p>
                            <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                              <p>Status: {detail.match.status}</p>
                              <p>
                                Platform:{' '}
                                {detail.match.platform
                                  ? (PLATFORMS[detail.match.platform]?.label ?? detail.match.platform)
                                  : 'Any platform'}
                              </p>
                              <p>Region: {detail.match.region}</p>
                              <p>Created: {new Date(detail.match.created_at).toLocaleString()}</p>
                              <p>
                                Completed:{' '}
                                {detail.match.completed_at
                                  ? new Date(detail.match.completed_at).toLocaleString()
                                  : 'Not completed'}
                              </p>
                              <p>Rating delta P1: {detail.match.rating_change_p1 ?? 0}</p>
                              <p>Rating delta P2: {detail.match.rating_change_p2 ?? 0}</p>
                              {detail.match.player1_score !== null &&
                              detail.match.player1_score !== undefined &&
                              detail.match.player2_score !== null &&
                              detail.match.player2_score !== undefined ? (
                                <p>
                                  Final score: {detail.match.player1_score} - {detail.match.player2_score}
                                </p>
                              ) : null}
                              {detail.tournament ? (
                                <p>
                                  Tournament:{' '}
                                  <Link
                                    href={`/t/${detail.tournament.slug}`}
                                    className="brand-link font-semibold"
                                  >
                                    {detail.tournament.title}
                                  </Link>
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Report state</p>
                            <div className="mt-4 space-y-3">
                              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                                <p className="text-sm font-black text-[var(--text-primary)]">
                                  {detail.match.player1?.username ?? 'Unknown'}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  {detail.match.player1?.phone ?? 'No phone'}
                                  {detail.match.player1?.email ? ` | ${detail.match.player1.email}` : ''}
                                </p>
                                <p className="mt-2 text-xs text-[var(--text-soft)]">
                                  Reported winner:{' '}
                                  {detail.reportState.player1ReportedWinner?.username ?? 'No report yet'}
                                </p>
                                {detail.match.player1_reported_player1_score !== null &&
                                detail.match.player1_reported_player1_score !== undefined &&
                                detail.match.player1_reported_player2_score !== null &&
                                detail.match.player1_reported_player2_score !== undefined ? (
                                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                                    Reported score: {detail.match.player1_reported_player1_score} -{' '}
                                    {detail.match.player1_reported_player2_score}
                                  </p>
                                ) : null}
                              </div>

                              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                                <p className="text-sm font-black text-[var(--text-primary)]">
                                  {detail.match.player2?.username ?? 'Unknown'}
                                </p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                  {detail.match.player2?.phone ?? 'No phone'}
                                  {detail.match.player2?.email ? ` | ${detail.match.player2.email}` : ''}
                                </p>
                                <p className="mt-2 text-xs text-[var(--text-soft)]">
                                  Reported winner:{' '}
                                  {detail.reportState.player2ReportedWinner?.username ?? 'No report yet'}
                                </p>
                                {detail.match.player2_reported_player1_score !== null &&
                                detail.match.player2_reported_player1_score !== undefined &&
                                detail.match.player2_reported_player2_score !== null &&
                                detail.match.player2_reported_player2_score !== undefined ? (
                                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                                    Reported score: {detail.match.player2_reported_player1_score} -{' '}
                                    {detail.match.player2_reported_player2_score}
                                  </p>
                                ) : null}
                              </div>

                              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                                <p className="text-sm font-black text-[var(--text-primary)]">Dispute lane</p>
                                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                                  Requested by:{' '}
                                  {detail.disputeRequester?.username ?? 'No dispute requester recorded'}
                                </p>
                                {detail.match.dispute_screenshot_url ? (
                                  <Link
                                    href={detail.match.dispute_screenshot_url}
                                    target="_blank"
                                    className="brand-link mt-3 inline-flex text-xs font-semibold"
                                  >
                                    Open screenshot proof
                                  </Link>
                                ) : (
                                  <p className="mt-2 text-xs text-[var(--text-soft)]">No proof URL attached.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 xl:grid-cols-[0.92fr_1.08fr]">
                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                  Admin help lane
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                                  Review player help requests, add a note, then resolve or dismiss the
                                  issue so both players see the final call in the match thread.
                                </p>
                              </div>
                              <span className="rounded-full bg-amber-500/12 px-3 py-1 text-[11px] font-semibold text-amber-400">
                                {detail.openEscalationCount} open
                              </span>
                            </div>

                            <div className="mt-4 space-y-3">
                              {detail.escalations.length === 0 ? (
                                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                                  No one has asked for admin help on this match yet.
                                </div>
                              ) : (
                                detail.escalations.map((escalation) => {
                                  const isOpen = escalation.status === 'open';
                                  const noteValue = resolutionNotes[escalation.id] ?? '';

                                  return (
                                    <div
                                      key={escalation.id}
                                      className={`rounded-2xl border px-4 py-4 ${
                                        isOpen
                                          ? 'border-amber-500/18 bg-amber-500/8'
                                          : 'border-[var(--border-color)] bg-[var(--surface)]'
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-black text-[var(--text-primary)]">
                                            {MATCH_ESCALATION_REASON_LABELS[escalation.reason]}
                                          </p>
                                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                            Requested by {escalation.requester?.username ?? 'Unknown'}{' '}
                                            {formatRelativeTime(escalation.created_at)}
                                          </p>
                                        </div>
                                        <span
                                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                            escalation.status === 'open'
                                              ? 'bg-amber-500/12 text-amber-400'
                                              : escalation.status === 'resolved'
                                                ? 'bg-[rgba(50,224,196,0.12)] text-[var(--brand-teal)]'
                                                : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                                          }`}
                                        >
                                          {escalation.status}
                                        </span>
                                      </div>

                                      {escalation.details ? (
                                        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                                          {escalation.details}
                                        </p>
                                      ) : (
                                        <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                                          No extra note was attached.
                                        </p>
                                      )}

                                      {isOpen ? (
                                        <div className="mt-4 space-y-3">
                                          <div>
                                            <label
                                              htmlFor={`resolution-${escalation.id}`}
                                              className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]"
                                            >
                                              Resolution note
                                            </label>
                                            <textarea
                                              id={`resolution-${escalation.id}`}
                                              value={noteValue}
                                              onChange={(event) =>
                                                setResolutionNotes((current) => ({
                                                  ...current,
                                                  [escalation.id]: event.target.value,
                                                }))
                                              }
                                              placeholder="Add the decision or next step players should see."
                                              className="input-field min-h-[6.5rem] resize-none"
                                              maxLength={400}
                                            />
                                          </div>

                                          <div className="flex flex-col gap-2 sm:flex-row">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void handleEscalationAction(
                                                  detail.match.id,
                                                  escalation.id,
                                                  'resolve_escalation'
                                                )
                                              }
                                              disabled={actingOn === detail.match.id}
                                              className="btn-primary justify-center sm:flex-1"
                                            >
                                              Resolve issue
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void handleEscalationAction(
                                                  detail.match.id,
                                                  escalation.id,
                                                  'dismiss_escalation'
                                                )
                                              }
                                              disabled={actingOn === detail.match.id}
                                              className="btn-outline justify-center sm:flex-1"
                                            >
                                              Dismiss
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
                                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                                            Moderator outcome
                                          </p>
                                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                            {escalation.resolver?.username ?? 'Admin'} updated this{' '}
                                            {formatRelativeTime(escalation.resolved_at ?? escalation.updated_at)}.
                                          </p>
                                          {escalation.resolution_note ? (
                                            <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                                              {escalation.resolution_note}
                                            </p>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <MessageCircle size={16} className="text-[var(--brand-teal)]" />
                                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    Match chat
                                  </p>
                                </div>
                                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                                  Full setup transcript visible to moderators. Reply here when you need
                                  to guide both players inside the match.
                                </p>
                              </div>
                              <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--text-soft)]">
                                Last move{' '}
                                {formatRelativeTime(
                                  detail.chatMessages[detail.chatMessages.length - 1]?.created_at
                                )}
                              </span>
                            </div>

                            <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface)] p-4">
                              {detail.chatMessages.length === 0 ? (
                                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                                  No chat messages yet.
                                </div>
                              ) : (
                                detail.chatMessages.map((message) => {
                                  const isSystem = message.sender_type === 'system';
                                  const isAdmin = message.sender_type === 'admin';

                                  if (isSystem) {
                                    return (
                                      <div
                                        key={message.id}
                                        className="rounded-[1rem] border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] px-4 py-3"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="flex items-center gap-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                                              {getChatSenderLabel(message)}
                                            </p>
                                            <span className="rounded-full bg-[rgba(50,224,196,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                                              {getSystemEventLabel(message)}
                                            </span>
                                          </div>
                                          <span className="text-[11px] text-[var(--text-soft)]">
                                            {formatChatTime(message.created_at)}
                                          </span>
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                          {message.body}
                                        </p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={message.id}
                                      className={`rounded-[1rem] border px-4 py-3 ${
                                        isAdmin
                                          ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)]'
                                          : 'border-[var(--border-color)] bg-[var(--surface-elevated)]'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                                          {getChatSenderLabel(message)}
                                        </p>
                                        <span className="text-[11px] text-[var(--text-soft)]">
                                          {formatChatTime(message.created_at)}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                                        {message.body}
                                      </p>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            <div className="mt-4">
                              <label
                                htmlFor="admin-match-reply"
                                className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]"
                              >
                                Reply as admin
                              </label>
                              <textarea
                                id="admin-match-reply"
                                value={adminReply}
                                onChange={(event) => setAdminReply(event.target.value)}
                                placeholder="Send a clear next step, decision, or moderation note to both players."
                                className="input-field min-h-[6.5rem] resize-none"
                                maxLength={280}
                              />
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-[var(--text-soft)]">
                                  The reply lands in the match thread and notifies both players.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void handleAdminReply(detail.match.id)}
                                  disabled={replyingMatchId === detail.match.id || !adminReply.trim()}
                                  className="btn-primary justify-center"
                                >
                                  {replyingMatchId === detail.match.id ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <Send size={15} />
                                  )}
                                  Send admin reply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
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
