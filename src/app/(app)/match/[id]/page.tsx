'use client';

import Image from 'next/image';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Check,
  Clock,
  ExternalLink,
  ImageIcon,
  Swords,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import {
  GAMES,
  PLATFORMS,
  getCanonicalGameKey,
  getGameIdValue,
  getGameRatingKey,
  getMatchingPlatform,
  getPlatformAddUrl,
  requiresMatchScoreReport,
} from '@/lib/config';
import { PlatformBadge } from '@/components/PlatformBadge';
import { PlatformLogo } from '@/components/PlatformLogo';
import { RatingBadge } from '@/components/RatingBadge';
import type { GameKey, GamificationResult, PlatformKey } from '@/types';

interface MatchPlayer {
  id: string;
  username: string;
  game_ids: Record<string, string>;
  platforms: PlatformKey[];
}

interface MatchData {
  id: string;
  player1_id: string;
  player2_id: string;
  game: GameKey;
  platform?: PlatformKey | null;
  region: string;
  status: 'pending' | 'completed' | 'disputed' | 'cancelled';
  winner_id: string | null;
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
  gamification_summary_p1?: GamificationResult | null;
  gamification_summary_p2?: GamificationResult | null;
  dispute_screenshot_url: string | null;
  dispute_requested_by: string | null;
  created_at: string;
  player1: MatchPlayer;
  player2: MatchPlayer;
}

const QUICK_RESULT_COMMENTS = ['GG', 'Close one', 'Lucky', 'Run it back'] as const;
const MATCH_STATUS_POLL_INTERVAL_MS = 3000;

function hasSubmittedScore(value: number | null | undefined) {
  return value !== null && value !== undefined;
}

function hasUserSubmittedResultReport(match: MatchData, userId: string) {
  const isPlayer1 = userId === match.player1_id;

  if (requiresMatchScoreReport(match.game)) {
    const reportedPlayer1Score = isPlayer1
      ? match.player1_reported_player1_score
      : match.player2_reported_player1_score;
    const reportedPlayer2Score = isPlayer1
      ? match.player1_reported_player2_score
      : match.player2_reported_player2_score;

    return hasSubmittedScore(reportedPlayer1Score) && hasSubmittedScore(reportedPlayer2Score);
  }

  return Boolean(isPlayer1 ? match.player1_reported_winner : match.player2_reported_winner);
}

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<ActionFeedbackState | null>(null);
  const [disputeFeedback, setDisputeFeedback] = useState<ActionFeedbackState | null>(null);
  const [selectedQuickComment, setSelectedQuickComment] = useState<string | null>(null);
  const [sentQuickComment, setSentQuickComment] = useState<string | null>(null);
  const [receivedQuickComment, setReceivedQuickComment] = useState<{
    from: string;
    comment: string;
  } | null>(null);
  const [reportScores, setReportScores] = useState({ player1: '', player2: '' });
  const [keepResultOpen, setKeepResultOpen] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<{ send: (payload: unknown) => Promise<unknown> } | null>(null);
  const previousStatusRef = useRef<MatchData['status'] | null>(null);
  const suppressNextStatusToastRef = useRef<MatchData['status'] | null>(null);

  const fetchMatch = useCallback(async () => {
    const res = await authFetch(`/api/matches/${matchId}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setMatch((current) => {
        const nextMatch = data.match as MatchData;

        if (current?.id === nextMatch.id && current.status !== 'pending' && nextMatch.status === 'pending') {
          return current;
        }

        return nextMatch;
      });
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  }, [authFetch, matchId, router]);

  useEffect(() => {
    void fetchMatch();
    const supabase = createClient();
    const channel = supabase
      .channel(`match_${matchId}`)
      .on(
        'broadcast',
        { event: 'result-comment' },
        ({ payload }) => {
          const nextPayload = payload as
            | {
                comment?: string;
                fromUserId?: string;
                fromUsername?: string;
              }
            | undefined;

          if (!nextPayload?.comment || nextPayload.fromUserId === user?.id) {
            return;
          }

          const note = {
            from: nextPayload.fromUsername ?? 'Opponent',
            comment: nextPayload.comment,
          };

          setReceivedQuickComment(note);
          toast(`${note.from}: ${note.comment}`, {
            icon: '💬',
          });
        }
      )
      .on(
        'broadcast',
        { event: 'match-updated' },
        ({ payload }) => {
          const nextPayload = payload as { matchId?: string } | undefined;

          if (nextPayload?.matchId && nextPayload.matchId !== matchId) {
            return;
          }

          void fetchMatch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          void fetchMatch();
        }
      )
      .subscribe();

    channelRef.current = channel as unknown as { send: (payload: unknown) => Promise<unknown> };

    return () => {
      channelRef.current = null;
      channel.unsubscribe();
    };
  }, [matchId, fetchMatch, user?.id]);

  useEffect(() => {
    if (match?.status !== 'completed') {
      setAutoCloseCountdown(null);
      setKeepResultOpen(false);
      return;
    }

    if (!keepResultOpen) {
      setAutoCloseCountdown((current) => current ?? 8);
    }
  }, [match?.status, keepResultOpen]);

  useEffect(() => {
    if (autoCloseCountdown === null || keepResultOpen) {
      return;
    }

    if (autoCloseCountdown <= 0) {
      router.push('/dashboard');
      return;
    }

    const timer = window.setTimeout(() => {
      setAutoCloseCountdown((current) =>
        current === null ? null : current - 1
      );
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [autoCloseCountdown, keepResultOpen, router]);

  useEffect(() => {
    if (!match || !user) {
      return;
    }

    const reporterIsPlayer1 = user.id === match.player1_id;
    const reportedPlayer1Score = reporterIsPlayer1
      ? match.player1_reported_player1_score
      : match.player2_reported_player1_score;
    const reportedPlayer2Score = reporterIsPlayer1
      ? match.player1_reported_player2_score
      : match.player2_reported_player2_score;

    if (
      reportedPlayer1Score === null ||
      reportedPlayer1Score === undefined ||
      reportedPlayer2Score === null ||
      reportedPlayer2Score === undefined
    ) {
      setReportScores({ player1: '', player2: '' });
      return;
    }

    setReportScores({
      player1: String(reportedPlayer1Score),
      player2: String(reportedPlayer2Score),
    });
  }, [match, user]);

  useEffect(() => {
    if (!match || !user || match.status !== 'pending') {
      return;
    }

    if (!hasUserSubmittedResultReport(match, user.id)) {
      return;
    }

    // Realtime can be missed in some Supabase configs, so keep this fallback
    // narrow: only poll while this user is waiting for the opponent's report.
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void fetchMatch();
    }, MATCH_STATUS_POLL_INTERVAL_MS);

    return () => window.clearInterval(pollTimer);
  }, [fetchMatch, match, user]);

  useEffect(() => {
    if (!match) {
      return;
    }

    if (match.status === 'disputed') {
      setDisputeFeedback({
        tone: match.dispute_screenshot_url ? 'info' : 'error',
        title: match.dispute_screenshot_url ? 'Proof uploaded.' : 'Reports did not match.',
        detail: match.dispute_screenshot_url
          ? "Admin review is in progress. We'll keep the screenshot here until it is resolved."
          : 'Upload a screenshot of the final result so the dispute can be resolved faster.',
      });
    } else {
      setDisputeFeedback(null);
    }
  }, [match]);

  useEffect(() => {
    if (!match) {
      return;
    }

    const previousStatus = previousStatusRef.current;

    if (
      previousStatus &&
      previousStatus !== match.status &&
      previousStatus === 'pending'
    ) {
      const suppressToast = suppressNextStatusToastRef.current === match.status;
      const scoreline =
        match.player1_score !== null &&
        match.player1_score !== undefined &&
        match.player2_score !== null &&
        match.player2_score !== undefined
          ? `${match.player1_score}-${match.player2_score}`
          : null;

      if (!suppressToast && match.status === 'completed') {
        toast.success(
          scoreline
            ? `Result confirmed at ${scoreline}.`
            : 'Result confirmed. Match complete.'
        );
        setReportFeedback({
          tone: 'success',
          title: 'Result confirmed.',
          detail: scoreline
            ? `Both players matched the ${scoreline} report.`
            : 'Both players agreed on the final result.',
        });
      }

      if (!suppressToast && match.status === 'disputed') {
        toast.error('Reports did not match. Upload proof to resolve the dispute.');
        setReportFeedback({
          tone: 'error',
          title: 'Reports did not match.',
          detail: 'The match is disputed until proof is uploaded or an admin resolves it.',
        });
      }
    }

    if (suppressNextStatusToastRef.current === match.status) {
      suppressNextStatusToastRef.current = null;
    }

    previousStatusRef.current = match.status;
  }, [match]);

  const handleReport = async (winnerId?: string) => {
    if (!match) {
      return;
    }

    const scoreReportingEnabled = requiresMatchScoreReport(match.game);
    const payload: Record<string, unknown> = {};
    const nextReportingState = scoreReportingEnabled ? 'score' : (winnerId ?? 'report');

    if (scoreReportingEnabled) {
      const player1ScoreText = reportScores.player1.trim();
      const player2ScoreText = reportScores.player2.trim();

      if (!/^\d+$/.test(player1ScoreText) || !/^\d+$/.test(player2ScoreText)) {
        setReportFeedback({
          tone: 'error',
          title: 'Enter both scorelines first.',
          detail: 'Only whole numbers are allowed in the score report.',
        });
        toast.error('Enter both scorelines as whole numbers');
        return;
      }

      const player1Score = Number(player1ScoreText);
      const player2Score = Number(player2ScoreText);

      payload.player1_score = player1Score;
      payload.player2_score = player2Score;
      payload.winner_id =
        player1Score > player2Score
          ? match.player1_id
          : player1Score < player2Score
            ? match.player2_id
            : null;
    } else if (!winnerId) {
      setReportFeedback({
        tone: 'error',
        title: 'Pick a winner before you submit.',
        detail: 'Mechi cannot lock the match until you choose who won.',
      });
      toast.error('Pick a winner first');
      return;
    } else {
      payload.winner_id = winnerId;
    }

    setReporting(nextReportingState);
    setReportFeedback({
      tone: 'loading',
      title: scoreReportingEnabled ? 'Submitting your scoreline...' : 'Submitting your result...',
      detail: "We're saving your report and checking whether the opponent already reported.",
    });
    try {
      const res = await authFetch(`/api/matches/${matchId}/report`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setReportFeedback({
          tone: 'error',
          title: 'Could not submit your report.',
          detail: data.error ?? 'Please try again.',
        });
        toast.error(data.error ?? 'Failed to report');
        return;
      }

      if (selectedQuickComment && channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'result-comment',
          payload: {
            comment: selectedQuickComment,
            fromUserId: user?.id,
            fromUsername: user?.username ?? 'Player',
          },
        });
        setSentQuickComment(selectedQuickComment);
        setSelectedQuickComment(null);
      }

      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'match-updated',
          payload: {
            matchId,
            fromUserId: user?.id,
            status: data.status,
          },
        });
      }

      if (data.status === 'completed') {
        suppressNextStatusToastRef.current = 'completed';
        setReportFeedback({
          tone: 'success',
          title: data.result === 'draw' ? 'Draw confirmed.' : 'Result confirmed.',
          detail:
            data.result === 'draw'
              ? 'Both score reports matched and the draw is locked in.'
              : 'Both reports matched, so the match is now complete.',
        });
        toast.success(data.result === 'draw' ? 'Draw confirmed. Score locked.' : 'Match completed! Your climb is updated.');
      } else if (data.status === 'disputed') {
        suppressNextStatusToastRef.current = 'disputed';
        setReportFeedback({
          tone: 'error',
          title: 'Reports did not match.',
          detail: 'Upload a screenshot so the dispute can be resolved.',
        });
        setDisputeFeedback({
          tone: 'error',
          title: 'Reports did not match.',
          detail: 'Upload a screenshot of the result to help resolve the dispute quickly.',
        });
        toast.error('Result disputed! Upload a screenshot.');
      } else {
        setReportFeedback({
          tone: 'info',
          title: 'Your report is in.',
          detail: "We're waiting for the opponent to submit the same result.",
        });
        toast.success('Result reported. Waiting for opponent...');
      }
      void fetchMatch();
    } catch {
      setReportFeedback({
        tone: 'error',
        title: 'Could not submit your report.',
        detail: 'We could not reach the server. Please try again.',
      });
      toast.error('Network error');
    } finally {
      setReporting(null);
    }
  };

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setDisputeFeedback({
        tone: 'error',
        title: 'That file is not an image.',
        detail: 'Upload a PNG, JPG, or WEBP screenshot.',
      });
      toast.error('Please upload an image');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDisputeFeedback({
        tone: 'error',
        title: 'Screenshot is too large.',
        detail: 'Keep the upload under 10MB and try again.',
      });
      toast.error('Image must be under 10MB');
      return;
    }

    setUploadingScreenshot(true);
    setDisputeFeedback({
      tone: 'loading',
      title: 'Uploading screenshot...',
      detail: "We're attaching your proof to the dispute now.",
    });
    try {
      const formData = new FormData();
      formData.append('screenshot', file);
      const res = await fetch(`/api/matches/${matchId}/dispute`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setDisputeFeedback({
          tone: 'error',
          title: 'Screenshot upload failed.',
          detail: data.error ?? 'Please try again with a clearer image.',
        });
        toast.error(data.error ?? 'Upload failed');
        return;
      }
      setDisputeFeedback({
        tone: 'success',
        title: 'Screenshot uploaded.',
        detail: 'Your proof is attached and ready for review.',
      });
      toast.success('Screenshot uploaded');
      void fetchMatch();
    } catch {
      setDisputeFeedback({
        tone: 'error',
        title: 'Screenshot upload failed.',
        detail: 'We could not reach the server. Please try again.',
      });
      toast.error('Upload failed');
    } finally {
      setUploadingScreenshot(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this match?')) return;
    setCancelling(true);
    try {
      const res = await authFetch(`/api/matches/${matchId}/cancel`, { method: 'POST' });
      if (res.ok) {
        toast.success('Match cancelled');
        router.push('/dashboard');
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to cancel');
      }
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[var(--brand-teal)] border-t-transparent" />
          <p className="text-sm text-[var(--text-soft)]">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match || !user) return null;

  const isPlayer1 = user.id === match.player1_id;
  const me = isPlayer1 ? match.player1 : match.player2;
  const opponent = isPlayer1 ? match.player2 : match.player1;
  const matchGame = getCanonicalGameKey(match.game);
  const game = GAMES[matchGame];
  const gamePlatforms = game?.platforms ?? [];
  const myPlatform = getMatchingPlatform(me.platforms, gamePlatforms);
  const opponentPlatform = getMatchingPlatform(opponent.platforms, gamePlatforms);
  const displayPlatform = match.platform ?? opponentPlatform ?? myPlatform;
  const opponentPlatformId = displayPlatform
    ? getGameIdValue(opponent.game_ids ?? {}, matchGame, displayPlatform) || 'Not set'
    : 'Not set';
  const gamificationResult = isPlayer1
    ? match.gamification_summary_p1 ?? null
    : match.gamification_summary_p2 ?? null;
  const usesScoreReport = requiresMatchScoreReport(matchGame);
  const iWon = match.winner_id === user.id;
  const myReport = isPlayer1 ? match.player1_reported_winner : match.player2_reported_winner;
  const opponentReport = isPlayer1 ? match.player2_reported_winner : match.player1_reported_winner;
  const myReportedPlayer1Score = isPlayer1
    ? match.player1_reported_player1_score
    : match.player2_reported_player1_score;
  const myReportedPlayer2Score = isPlayer1
    ? match.player1_reported_player2_score
    : match.player2_reported_player2_score;
  const opponentReportedPlayer1Score = isPlayer1
    ? match.player2_reported_player1_score
    : match.player1_reported_player1_score;
  const opponentReportedPlayer2Score = isPlayer1
    ? match.player2_reported_player2_score
    : match.player1_reported_player2_score;
  const myReportedScoreline =
    myReportedPlayer1Score !== null &&
    myReportedPlayer1Score !== undefined &&
    myReportedPlayer2Score !== null &&
    myReportedPlayer2Score !== undefined
      ? `${myReportedPlayer1Score}-${myReportedPlayer2Score}`
      : null;
  const opponentReportedScoreline =
    opponentReportedPlayer1Score !== null &&
    opponentReportedPlayer1Score !== undefined &&
    opponentReportedPlayer2Score !== null &&
    opponentReportedPlayer2Score !== undefined
      ? `${opponentReportedPlayer1Score}-${opponentReportedPlayer2Score}`
      : null;
  const confirmedScoreline =
    match.player1_score !== null &&
    match.player1_score !== undefined &&
    match.player2_score !== null &&
    match.player2_score !== undefined
      ? `${match.player1_score}-${match.player2_score}`
      : null;
  const hasMyReport = usesScoreReport ? Boolean(myReportedScoreline) : Boolean(myReport);
  const hasOpponentReport = usesScoreReport
    ? Boolean(opponentReportedScoreline)
    : Boolean(opponentReport);
  const myReportLabel =
    usesScoreReport && myReportedScoreline
      ? myReportedPlayer1Score === myReportedPlayer2Score
        ? 'Draw reported'
        : myReport === user.id
          ? 'You won'
          : `${opponent.username} won`
      : myReport === user.id
        ? 'You won'
        : `${opponent.username} won`;
  const isDrawResult =
    match.status === 'completed' &&
    match.winner_id === null &&
    match.player1_score !== null &&
    match.player1_score !== undefined &&
    match.player2_score !== null &&
    match.player2_score !== undefined &&
    match.player1_score === match.player2_score;
  const platformAddUrl = displayPlatform
    ? getPlatformAddUrl(displayPlatform, opponentPlatformId)
    : null;
  const resultHeading = isDrawResult ? 'Draw locked in' : iWon ? 'Victory locked in' : 'Tough one';
  const resultCopy = isDrawResult
    ? confirmedScoreline
      ? `Both players matched the ${confirmedScoreline} scoreline. The draw is now locked in.`
      : 'Both players confirmed the draw. The match is closed.'
    : iWon
    ? confirmedScoreline
      ? `Both players matched the scoreline. Your ${confirmedScoreline} win is now locked in.`
      : 'Both players confirmed it. Your win, streak, and climb progress are now locked in.'
    : confirmedScoreline
      ? `Both players matched the scoreline. The ${confirmedScoreline} result is now locked in.`
      : 'Both players confirmed the result. The match is closed and your climb progress is updated.';

  const statusTone =
    match.status === 'completed'
      ? 'bg-[rgba(50,224,196,0.12)] text-[var(--brand-teal)]'
      : match.status === 'disputed'
        ? 'bg-red-500/10 text-red-500'
        : match.status === 'pending'
          ? 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
          : 'bg-[var(--surface-elevated)] text-[var(--text-soft)]';

  return (
    <div className="page-container">
      <div className="mx-auto max-w-2xl">
        <div className="card circuit-panel mb-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Swords size={16} className="text-[var(--brand-coral)]" />
            <span className="text-sm font-semibold text-[var(--brand-coral)]">
              {game?.label}
            </span>
            <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone}`}>
              {match.status === 'pending' && <Clock size={10} />}
              {match.status === 'completed' && <Check size={10} />}
              {match.status === 'disputed' && <AlertTriangle size={10} />}
              {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xl font-bold text-[var(--text-primary)]">{me.username}</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">You</p>
            </div>
            <span className="px-4 text-lg font-bold text-[var(--text-soft)]">VS</span>
            <div className="flex-1 text-right">
              <p className="text-xl font-bold text-[var(--text-primary)]">{opponent.username}</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Opponent</p>
            </div>
          </div>
        </div>

        <div className="card mb-4 p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Connect with Opponent</h3>
          {displayPlatform ? (
            <>
              <div className="mb-3 flex items-start gap-3">
                <span className="mt-0.5">
                  <PlatformLogo platform={displayPlatform} size={22} />
                </span>
                <div className="flex-1">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Playing {game?.label} on {PLATFORMS[displayPlatform]?.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                    {PLATFORMS[displayPlatform]?.idLabel}:{' '}
                    <span className="text-[var(--brand-teal)]">{opponentPlatformId}</span>
                  </p>
                </div>
              </div>
              {platformAddUrl && (
                <a
                  href={platformAddUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline w-full text-sm"
                >
                  <ExternalLink size={14} /> Add on {PLATFORMS[displayPlatform]?.label}
                </a>
              )}
            </>
          ) : (
            <p className="py-4 text-center text-sm text-[var(--text-soft)]">
              Platform info not available
            </p>
          )}
          <div className="mt-3 border-t border-[var(--border-color)] pt-3">
            <p className="mb-2 text-xs text-[var(--text-soft)]">Opponent&apos;s platforms</p>
            <div className="flex flex-wrap gap-2">
              {opponent.platforms.map((platform) => (
                <PlatformBadge
                  key={platform}
                  platform={platform}
                  platformId={platform === displayPlatform ? opponentPlatformId : opponent.game_ids?.[platform]}
                  size="sm"
                />
              ))}
            </div>
          </div>
        </div>

        {match.status === 'pending' && (
          <div className="card mb-4 p-5">
            <h3 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Report Result</h3>
            <p className="mb-4 text-xs text-[var(--text-secondary)]">
              Both players must agree on the result.
            </p>
            {reportFeedback ? (
              <ActionFeedback
                tone={reportFeedback.tone}
                title={reportFeedback.title}
                detail={reportFeedback.detail}
                className="mb-4"
              />
            ) : null}
            {!hasMyReport && (
              <div className="mb-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Quick comment
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_RESULT_COMMENTS.map((comment) => {
                    const isSelected = selectedQuickComment === comment;

                    return (
                      <button
                        key={comment}
                        type="button"
                        onClick={() =>
                          setSelectedQuickComment((current) =>
                            current === comment ? null : comment
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                            : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[rgba(255,107,107,0.22)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {comment}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-[var(--text-soft)]">
                  Optional. Pick one and Mechi sends it live with your report.
                </p>
              </div>
            )}
            {hasMyReport ? (
              <div className="surface-live mb-3 rounded-xl p-3">
                <p className="text-sm font-medium text-[var(--accent-secondary-text)]">
                  You reported:{' '}
                  <strong>{myReportLabel}</strong>
                </p>
                {usesScoreReport && myReportedScoreline ? (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Submitted score: <span className="font-semibold text-[var(--text-primary)]">{myReportedScoreline}</span>
                  </p>
                ) : null}
                {sentQuickComment && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Your note: <span className="font-semibold text-[var(--text-primary)]">{sentQuickComment}</span>
                  </p>
                )}
                {!hasOpponentReport && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Waiting for opponent...
                  </p>
                )}
              </div>
            ) : usesScoreReport ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Final score
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Enter the result in match order. Draws are allowed when both players submit the same scoreline.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">
                        {match.player1.username}
                      </span>
                      <input
                        inputMode="numeric"
                        value={reportScores.player1}
                        onChange={(event) =>
                          setReportScores((current) => ({
                            ...current,
                            player1: event.target.value.replace(/[^0-9]/g, ''),
                          }))
                        }
                        className="input"
                        placeholder="0"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]">
                        {match.player2.username}
                      </span>
                      <input
                        inputMode="numeric"
                        value={reportScores.player2}
                        onChange={(event) =>
                          setReportScores((current) => ({
                            ...current,
                            player2: event.target.value.replace(/[^0-9]/g, ''),
                          }))
                        }
                        className="input"
                        placeholder="0"
                      />
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => void handleReport()}
                  disabled={!!reporting}
                  className="btn-primary w-full justify-center"
                >
                  <Check size={16} />
                  {reporting ? 'Submitting score...' : 'Submit Score'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleReport(user.id)}
                  disabled={!!reporting}
                  className="btn-primary flex flex-col items-center gap-1 py-4"
                >
                  <Check size={18} />
                  <span className="text-sm">I Won</span>
                </button>
                <button
                  onClick={() => handleReport(opponent.id)}
                  disabled={!!reporting}
                  className="btn-outline flex flex-col items-center gap-1 py-4"
                >
                  <X size={18} />
                  <span className="text-sm">{opponent.username} Won</span>
                </button>
              </div>
            )}
            {receivedQuickComment && (
              <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Opponent note
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {receivedQuickComment.from}: {receivedQuickComment.comment}
                </p>
              </div>
            )}
            {usesScoreReport && opponentReportedScoreline && !hasMyReport ? (
              <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Opponent score
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {opponent.username} submitted {opponentReportedScoreline}
                </p>
              </div>
            ) : null}
            <button onClick={handleCancel} disabled={cancelling} className="btn-danger mt-3 w-full text-sm">
              {cancelling ? 'Cancelling...' : 'Cancel Match'}
            </button>
          </div>
        )}

        {match.status === 'disputed' && (
          <div className="card mb-4 p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-500" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Match Disputed</h3>
            </div>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Upload a screenshot of the result to help resolve the dispute.
            </p>
            {disputeFeedback ? (
              <ActionFeedback
                tone={disputeFeedback.tone}
                title={disputeFeedback.title}
                detail={disputeFeedback.detail}
                className="mb-4"
              />
            ) : null}
            {match.dispute_screenshot_url ? (
              <div className="mb-4">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--border-color)]">
                  <Image
                    src={match.dispute_screenshot_url}
                    alt="Dispute screenshot"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="mt-2 text-center text-xs font-medium text-[var(--brand-teal)]">
                  Under review. Admin will resolve within 24 hours.
                </p>
              </div>
            ) : (
              <div
                className="mb-3 cursor-pointer rounded-xl border-2 border-dashed border-[var(--border-color)] p-6 text-center transition-colors hover:border-[rgba(255,107,107,0.28)]"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={24} className="mx-auto mb-2 text-[var(--text-soft)]" />
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Click to upload screenshot
                </p>
                <p className="mt-1 text-xs text-[var(--text-soft)]">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              className="hidden"
            />
            {!match.dispute_screenshot_url && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingScreenshot}
                className="btn-primary w-full"
              >
                <Upload size={14} /> {uploadingScreenshot ? 'Uploading...' : 'Upload Screenshot'}
              </button>
            )}
          </div>
        )}

        {match.status === 'completed' && (
          <div
            className={`card result-panel mb-4 overflow-hidden p-6 text-center ${
              isDrawResult ? '' : iWon ? 'result-panel-win' : 'result-panel-loss'
            }`}
          >
            <div className={`result-burst ${isDrawResult ? 'result-burst-win' : iWon ? 'result-burst-win' : 'result-burst-loss'}`} />
            <div className="relative">
              <div className={`result-emblem ${isDrawResult || iWon ? 'result-emblem-win' : 'result-emblem-loss'}`}>
                {isDrawResult ? <Check size={30} /> : iWon ? <Trophy size={30} /> : <X size={30} />}
              </div>
              <h3 className="mb-1 text-2xl font-black text-[var(--text-primary)]">
                {resultHeading}
              </h3>
              <p className="mx-auto max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                {resultCopy}
              </p>
            </div>
            {gamificationResult && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="brand-chip px-2.5 py-1">+{gamificationResult.xpEarned} XP</span>
                <span className="brand-chip-coral px-2.5 py-1">+{gamificationResult.mpEarned} MP</span>
                <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]">
                  Lv. {gamificationResult.newLevel}
                </span>
                <span className="rounded-full border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.14)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-secondary-text)]">
                  Streak {gamificationResult.newStreak}
                </span>
                {gamificationResult.leveledUp && (
                  <span className="rounded-full border border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.14)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-coral)]">
                    Level up
                  </span>
                )}
              </div>
            )}
            {match.winner_id && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Winner:{' '}
                <strong className="text-[var(--text-primary)]">
                  {match.winner_id === user.id ? 'You' : opponent.username}
                </strong>
              </p>
            )}
            {confirmedScoreline ? (
              <div className="mt-3 inline-flex rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-black text-[var(--text-primary)]">
                Final score: {confirmedScoreline}
              </div>
            ) : null}
            {gamificationResult?.newAchievements?.length ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {gamificationResult.newAchievements.map((achievement) => (
                  <span
                    key={achievement.key}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                  >
                    {achievement.emoji} {achievement.title}
                  </span>
                ))}
              </div>
            ) : null}
            {sentQuickComment && (
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                Your note: <span className="font-semibold text-[var(--text-primary)]">{sentQuickComment}</span>
              </p>
            )}
            {receivedQuickComment && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {receivedQuickComment.from} said:{' '}
                <span className="font-semibold text-[var(--text-primary)]">{receivedQuickComment.comment}</span>
              </p>
            )}
            {!keepResultOpen && autoCloseCountdown !== null && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Closing match in {autoCloseCountdown}s
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="btn-primary">
                Back to dashboard
              </button>
              {!keepResultOpen && autoCloseCountdown !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setKeepResultOpen(true);
                    setAutoCloseCountdown(null);
                  }}
                  className="btn-outline"
                >
                  Keep result open
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card p-5">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-soft)]">
            Match Info
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="mb-1 text-xs text-[var(--text-soft)]">Your Rank</p>
              <RatingBadge
                rating={
                  ((user as unknown as Record<string, unknown>)[getGameRatingKey(matchGame)] as number) ??
                  1000
                }
                size="sm"
              />
            </div>
            <div className="text-center">
              <p className="mb-1 text-xs text-[var(--text-soft)]">Game Mode</p>
              <span className="brand-chip justify-center">{game?.mode}</span>
            </div>
          </div>
          {gamificationResult && (
            <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">
              Match payout: {gamificationResult.xpEarned} XP / {gamificationResult.mpEarned} MP
            </p>
          )}
          {confirmedScoreline ? (
            <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">
              Confirmed score: {match.player1.username} {match.player1_score} - {match.player2_score} {match.player2.username}
            </p>
          ) : null}
          <p className="mt-3 text-center text-xs text-[var(--text-soft)]">
            Started {new Date(match.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
