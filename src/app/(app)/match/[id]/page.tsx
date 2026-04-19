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
import { MatchChatPanel } from '@/components/MatchChatPanel';
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
import type {
  GameKey,
  GamificationResult,
  MatchChatMessage,
  MatchChatThreadState,
  MatchEscalationReason,
  PlatformKey,
} from '@/types';

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
const MATCH_CHAT_POLL_INTERVAL_MS = 5000;
const MATCH_CHAT_QUICK_REPLIES = [
  "I'm here",
  'Send room code',
  'Ready in 2 mins',
  'Join now',
  'Report result now',
] as const;
const MATCH_ESCALATION_DETAIL_MAX_LENGTH = 400;
const MATCH_ESCALATION_REASON_LABELS: Record<MatchEscalationReason, string> = {
  setup_issue: 'Setup issue',
  stalling: 'Stalling',
  wrong_result: 'Wrong result',
  abuse: 'Abuse',
  other: 'Other',
};
const MATCH_ESCALATION_OPTIONS: ReadonlyArray<{
  value: MatchEscalationReason;
  label: string;
  helper: string;
}> = [
  {
    value: 'setup_issue',
    label: 'Setup issue',
    helper: 'Room code, invite, or platform setup is breaking the start.',
  },
  {
    value: 'stalling',
    label: 'Stalling',
    helper: 'The opponent is delaying, going quiet, or refusing to start.',
  },
  {
    value: 'wrong_result',
    label: 'Wrong result',
    helper: 'The report or scoreline is off and you want admin eyes on it.',
  },
  {
    value: 'abuse',
    label: 'Abuse',
    helper: 'Toxic behavior, harassment, or suspicious conduct.',
  },
  {
    value: 'other',
    label: 'Other',
    helper: 'Anything else that needs moderator help in this match.',
  },
] as const;

type MatchEscalationThreadSummary = {
  id: string;
  reason: MatchEscalationReason;
  status: 'open' | 'resolved' | 'dismissed';
  details: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

function isMatchEscalationReason(value: unknown): value is MatchEscalationReason {
  return (
    typeof value === 'string' &&
    ['setup_issue', 'stalling', 'wrong_result', 'abuse', 'other'].includes(value)
  );
}

function getMatchEscalationSummaries(messages: MatchChatMessage[]) {
  const escalations = new Map<string, MatchEscalationThreadSummary>();

  messages.forEach((message) => {
    const event = typeof message.meta?.event === 'string' ? message.meta.event : '';
    const escalationId =
      typeof message.meta?.escalation_id === 'string' ? message.meta.escalation_id : null;

    if (!escalationId) {
      return;
    }

    if (event === 'admin_help_requested') {
      const reason = isMatchEscalationReason(message.meta?.reason)
        ? message.meta.reason
        : 'other';
      const details =
        typeof message.meta?.details === 'string' && message.meta.details.trim().length > 0
          ? message.meta.details.trim()
          : null;

      escalations.set(escalationId, {
        id: escalationId,
        reason,
        status: 'open',
        details,
        resolutionNote: null,
        createdAt: message.created_at,
        updatedAt: message.created_at,
      });
      return;
    }

    if (event === 'admin_help_resolved' || event === 'admin_help_dismissed') {
      const current = escalations.get(escalationId);
      const reason = current?.reason ?? (
        isMatchEscalationReason(message.meta?.escalation_reason)
          ? message.meta.escalation_reason
          : 'other'
      );
      const resolutionNote =
        typeof message.meta?.resolution_note === 'string' &&
        message.meta.resolution_note.trim().length > 0
          ? message.meta.resolution_note.trim()
          : null;

      escalations.set(escalationId, {
        id: escalationId,
        reason,
        status: event === 'admin_help_resolved' ? 'resolved' : 'dismissed',
        details: current?.details ?? null,
        resolutionNote,
        createdAt: current?.createdAt ?? message.created_at,
        updatedAt: message.created_at,
      });
    }
  });

  return [...escalations.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
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
  const [chatMessages, setChatMessages] = useState<MatchChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatLocked, setChatLocked] = useState(false);
  const [chatState, setChatState] = useState<MatchChatThreadState | null>(null);
  const [showEscalationComposer, setShowEscalationComposer] = useState(false);
  const [requestingAdminHelp, setRequestingAdminHelp] = useState(false);
  const [escalationReason, setEscalationReason] =
    useState<MatchEscalationReason>('setup_issue');
  const [escalationDetails, setEscalationDetails] = useState('');
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

  const fetchChat = useCallback(
    async (silent = false) => {
      if (!silent) {
        setChatLoading(true);
      }

      try {
        const res = await authFetch(`/api/matches/${matchId}/chat`, { cache: 'no-store' });

        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as {
          messages?: MatchChatMessage[];
          can_reply?: boolean;
          state?: MatchChatThreadState;
          did_mark_read?: boolean;
        };

        setChatMessages(data.messages ?? []);
        setChatLocked(data.can_reply === false);
        setChatState(data.state ?? null);

        if (data.did_mark_read && channelRef.current) {
          void channelRef.current.send({
            type: 'broadcast',
            event: 'match-chat-read',
            payload: {
              matchId,
              readByUserId: user?.id,
            },
          });
        }
      } finally {
        if (!silent) {
          setChatLoading(false);
        }
      }
    },
    [authFetch, matchId, user?.id]
  );

  useEffect(() => {
    void fetchMatch();
    void fetchChat();
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
          toast(`${note.from}: ${note.comment}`);
        }
      )
      .on(
        'broadcast',
        { event: 'match-chat-message' },
        ({ payload }) => {
          const nextPayload = payload as
            | {
                matchId?: string;
                fromUserId?: string;
                fromUsername?: string;
                preview?: string;
              }
            | undefined;

          if (nextPayload?.matchId !== matchId) {
            return;
          }

          void fetchChat(true);

          if (nextPayload.fromUserId && nextPayload.fromUserId !== user?.id && nextPayload.preview) {
            toast(`${nextPayload.fromUsername ?? 'Opponent'}: ${nextPayload.preview}`);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'match-chat-read' },
        ({ payload }) => {
          const nextPayload = payload as
            | {
                matchId?: string;
                readByUserId?: string;
              }
            | undefined;

          if (nextPayload?.matchId !== matchId || nextPayload.readByUserId === user?.id) {
            return;
          }

          void fetchChat(true);
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
          void fetchChat(true);
        }
      )
      .subscribe();

    channelRef.current = channel as unknown as { send: (payload: unknown) => Promise<unknown> };

    return () => {
      channelRef.current = null;
      channel.unsubscribe();
    };
  }, [matchId, fetchChat, fetchMatch, user?.id]);

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

    // Broadcast delivery can be missed, so keep a narrow polling fallback
    // while the match is still live.
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void fetchMatch();
    }, MATCH_STATUS_POLL_INTERVAL_MS);

    return () => window.clearInterval(pollTimer);
  }, [fetchMatch, match, user]);

  useEffect(() => {
    if (!match || !user || !['pending', 'disputed'].includes(match.status)) {
      return;
    }

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      void fetchChat(true);
    }, MATCH_CHAT_POLL_INTERVAL_MS);

    return () => window.clearInterval(pollTimer);
  }, [fetchChat, match, user]);

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
      void fetchChat(true);
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

  const handleRequestAdminHelp = async () => {
    const trimmedDetails = escalationDetails.trim();

    if (trimmedDetails.length > MATCH_ESCALATION_DETAIL_MAX_LENGTH) {
      toast.error(`Keep the note under ${MATCH_ESCALATION_DETAIL_MAX_LENGTH} characters`);
      return;
    }

    setRequestingAdminHelp(true);

    try {
      const res = await authFetch(`/api/matches/${matchId}/escalate`, {
        method: 'POST',
        body: JSON.stringify({
          reason: escalationReason,
          details: trimmedDetails,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not request admin help');
        return;
      }

      setEscalationDetails('');
      setEscalationReason('setup_issue');
      setShowEscalationComposer(false);
      toast.success('Admin help requested');
      await fetchChat(true);

      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'match-chat-message',
          payload: {
            matchId,
            fromUserId: user?.id,
            fromUsername: user?.username ?? 'Player',
            preview: 'Requested admin help',
          },
        });

        void channelRef.current.send({
          type: 'broadcast',
          event: 'match-updated',
          payload: {
            matchId,
            fromUserId: user?.id,
            status: match?.status,
          },
        });
      }
    } catch {
      toast.error('Network error');
    } finally {
      setRequestingAdminHelp(false);
    }
  };

  const handleSendChat = async (
    nextMessage = chatInput,
    messageType: MatchChatMessage['message_type'] = 'text'
  ) => {
    const trimmedMessage = nextMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    setSendingChat(true);

    try {
      const res = await authFetch(`/api/matches/${matchId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: trimmedMessage,
          message_type: messageType,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        message?: MatchChatMessage;
      };

      if (!res.ok || !data.message) {
        toast.error(data.error ?? 'Could not send message');
        return;
      }

      setChatMessages((current) => [...current, data.message as MatchChatMessage]);
      setChatInput('');

      if (channelRef.current) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'match-chat-message',
          payload: {
            matchId,
            fromUserId: user?.id,
            fromUsername: user?.username ?? 'Player',
            preview: trimmedMessage,
          },
        });
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSendingChat(false);
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
  const escalationSummaries = getMatchEscalationSummaries(chatMessages);
  const openEscalation =
    escalationSummaries.find((escalation) => escalation.status === 'open') ?? null;
  const latestClosedEscalation =
    escalationSummaries.find((escalation) => escalation.status !== 'open') ?? null;
  const canRequestAdminHelp = ['pending', 'disputed'].includes(match.status) && !openEscalation;

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

        <MatchChatPanel
          currentUserId={user.id}
          opponentUsername={opponent.username}
          messages={chatMessages}
          state={chatState}
          loading={chatLoading}
          canReply={!chatLocked}
          input={chatInput}
          sending={sendingChat}
          quickReplies={MATCH_CHAT_QUICK_REPLIES}
          onInputChange={setChatInput}
          onQuickReply={(value) => void handleSendChat(value, 'quick_reply')}
          onSend={() => void handleSendChat()}
        />

        {['pending', 'disputed'].includes(match.status) ? (
          <div className="card mb-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Need admin help?
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Use this if setup stalls, the scoreline feels wrong, or behavior gets messy.
                  Mechi adds the request to the match thread so nothing is blind or lost.
                </p>
              </div>

              {openEscalation ? (
                <span className="inline-flex items-center rounded-full bg-amber-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-400">
                  Admin reviewing
                </span>
              ) : latestClosedEscalation ? (
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    latestClosedEscalation.status === 'resolved'
                      ? 'bg-[rgba(50,224,196,0.12)] text-[var(--brand-teal)]'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  {latestClosedEscalation.status === 'resolved'
                    ? 'Last issue resolved'
                    : 'Last issue closed'}
                </span>
              ) : null}
            </div>

            {openEscalation ? (
              <div className="mt-4 rounded-2xl border border-amber-500/18 bg-amber-500/8 p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Admin help is already open for{' '}
                  <span className="text-amber-400">
                    {MATCH_ESCALATION_REASON_LABELS[openEscalation.reason]}
                  </span>
                  .
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Requested {new Date(openEscalation.createdAt).toLocaleString()}.
                  {openEscalation.details ? ` Note: ${openEscalation.details}` : ' Keep chatting here while the team reviews it.'}
                </p>
              </div>
            ) : latestClosedEscalation ? (
              <div className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  Last admin update: {MATCH_ESCALATION_REASON_LABELS[latestClosedEscalation.reason]}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {latestClosedEscalation.status === 'resolved'
                    ? 'Resolved'
                    : 'Closed'}{' '}
                  {new Date(latestClosedEscalation.updatedAt).toLocaleString()}.
                  {latestClosedEscalation.resolutionNote
                    ? ` Note: ${latestClosedEscalation.resolutionNote}`
                    : ' Open the chat above to see the full moderator update.'}
                </p>
              </div>
            ) : null}

            {showEscalationComposer ? (
              <div className="mt-4 space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    What do you need help with?
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Pick the clearest reason so the admin team can step in faster.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {MATCH_ESCALATION_OPTIONS.map((option) => {
                    const isSelected = escalationReason === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setEscalationReason(option.value)}
                        className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                          isSelected
                            ? 'border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.1)]'
                            : 'border-[var(--border-color)] bg-[var(--surface)] hover:border-[rgba(255,107,107,0.2)]'
                        }`}
                      >
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {option.label}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                          {option.helper}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label
                    htmlFor="admin-help-note"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]"
                  >
                    Quick note
                  </label>
                  <textarea
                    id="admin-help-note"
                    value={escalationDetails}
                    onChange={(event) => setEscalationDetails(event.target.value)}
                    maxLength={MATCH_ESCALATION_DETAIL_MAX_LENGTH}
                    placeholder="Add a short note so admin can understand what is stuck."
                    className="input-field min-h-[6.5rem] resize-none"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--text-soft)]">
                    <span>Optional, but it helps the team move faster.</span>
                    <span>
                      {escalationDetails.length}/{MATCH_ESCALATION_DETAIL_MAX_LENGTH}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handleRequestAdminHelp()}
                    disabled={requestingAdminHelp}
                    className="btn-primary justify-center sm:flex-1"
                  >
                    {requestingAdminHelp ? 'Requesting help...' : 'Request admin help'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEscalationComposer(false);
                      setEscalationDetails('');
                      setEscalationReason('setup_issue');
                    }}
                    disabled={requestingAdminHelp}
                    className="btn-outline justify-center sm:flex-1"
                  >
                    Not now
                  </button>
                </div>
              </div>
            ) : canRequestAdminHelp ? (
              <button
                type="button"
                onClick={() => setShowEscalationComposer(true)}
                className="btn-outline mt-4"
              >
                Ask admin to step in
              </button>
            ) : null}
          </div>
        ) : null}

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
