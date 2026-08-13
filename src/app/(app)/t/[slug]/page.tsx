'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
  Video,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ActionFeedback, type ActionFeedbackState } from '@/components/ActionFeedback';
import { GameCover } from '@/components/GameCover';
import { LiveBadge } from '@/components/LiveBadge';
import { ShareMenu } from '@/components/ShareMenu';
import { useAuthFetch } from '@/components/AuthProvider';
import { getRoundLabel } from '@/lib/bracket';
import { GAMES, PLATFORMS } from '@/lib/config';
import {
  getTournamentOgImageUrl,
  getTournamentShareUrl,
  tournamentShareText,
} from '@/lib/share';
import { getTournamentPrizePoolLabel } from '@/lib/tournament-metrics';
import {
  formatTournamentDateTime,
  getTournamentCheckInDate,
  parseTournamentSchedule,
} from '@/lib/tournament-schedule';
import type { GameKey, LiveStream, Tournament, TournamentMatch, TournamentPlayer } from '@/types';

type TournamentDetail = Tournament & {
  confirmed_count: number;
  slots_left: number;
};

type ViewerState = {
  joined: boolean;
  teamId: string | null;
  teamRole: string | null;
  canManageTeamEntry: boolean;
  isOrganizer: boolean;
  paymentStatus: string | null;
  checkInStatus: 'registered' | 'checked_in' | 'no_show' | null;
  checkedInAt: string | null;
  plan: string;
  isPrimaryAdmin: boolean;
  canCreateStream: boolean;
  canManageStream: boolean;
};

type TournamentTeamEntry = {
  id: string;
  team_id: string;
  payment_status: string;
  check_in_status: 'registered' | 'checked_in' | 'no_show';
  roster_locked_at: string;
  roster_snapshot: {
    team_name?: string;
    players?: Array<{
      user_id?: string;
      username?: string;
      roster_role?: string;
    }>;
  };
  team?: {
    id: string;
    name: string;
    slug: string;
    avatar_url?: string | null;
  } | null;
};

type TournamentStream = LiveStream & {
  streamer?: {
    id: string;
    username: string;
  } | null;
};

type DetailResponse = {
  tournament: TournamentDetail;
  players: TournamentPlayer[];
  teams: TournamentTeamEntry[];
  matches: TournamentMatch[];
  viewer: ViewerState;
  stream: TournamentStream | null;
};

type StreamSetupState = {
  stream_id: string;
  rtmp_url: string;
  stream_key: string;
  playback_id: string;
};

function formatTournamentStatusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'full':
      return 'Ongoing';
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

function formatPayoutStatusLabel(status: string | null | undefined, prizePool: number) {
  if (prizePool <= 0) return 'No cash payout';

  switch (status) {
    case 'pending':
      return 'Payout pending';
    case 'paid':
      return 'Payout paid';
    case 'failed':
      return 'Payout needs review';
    case 'none':
    default:
      return 'Payout not started';
  }
}

function getPayoutStatusDetail(status: string | null | undefined, prizePool: number) {
  if (prizePool <= 0) {
    return 'This tournament does not currently carry a cash payout.';
  }

  switch (status) {
    case 'pending':
      return 'The winner is set and payout is queued for operator review or provider completion.';
    case 'paid':
      return 'The tournament payout has been marked complete.';
    case 'failed':
      return 'The payout could not complete automatically and needs operator review.';
    default:
      return 'Payout state appears after the tournament is completed and a winner is confirmed.';
  }
}

function getResultStatusDetail(status: string) {
  switch (status) {
    case 'active':
      return 'Matches are live. Players report results from their match rooms.';
    case 'completed':
      return 'The bracket is complete and final results are locked.';
    case 'full':
      return 'The bracket is filled. Organizer can start once schedule rules allow it.';
    case 'open':
      return 'Registration is open. Results appear after the bracket starts.';
    default:
      return 'Tournament state is tracked by Mechi and organizer actions.';
  }
}

export default function TournamentDetailPage() {
  return (
    <Suspense fallback={<div className="page-container py-8">Loading tournament...</div>}>
      <TournamentDetailContent />
    </Suspense>
  );
}

function TournamentDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const authFetch = useAuthFetch();
  const paymentVerifiedRef = useRef<string | null>(null);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [creatingStream, setCreatingStream] = useState(false);
  const [stoppingStream, setStoppingStream] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamSetup, setStreamSetup] = useState<StreamSetupState | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackState | null>(null);

  const fetchTournament = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/tournaments/${slug}`);
      const payload = await res.json();
      if (!res.ok) {
        toast.error(payload.error ?? 'Tournament not found');
        router.push('/tournaments');
        return;
      }
      setData(payload);
    } catch {
      toast.error('Could not load tournament');
    } finally {
      setLoading(false);
    }
  }, [authFetch, router, slug]);

  useEffect(() => {
    void fetchTournament();
  }, [fetchTournament]);

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference || paymentVerifiedRef.current === reference) return;

    paymentVerifiedRef.current = reference;
    async function verifyPayment() {
      setActionFeedback({
        tone: 'loading',
        title: 'Confirming your payment...',
        detail: "We're checking the payment provider and locking your bracket slot.",
      });
      const res = await authFetch(`/api/tournaments/${slug}/verify-payment`, {
        method: 'POST',
        body: JSON.stringify({ reference }),
      });
      const payload = await res.json();
      if (res.ok) {
        setActionFeedback({
          tone: 'success',
          title: 'Payment confirmed.',
          detail: 'Your slot is locked in. Refreshing the bracket now.',
        });
        toast.success('Payment confirmed. You are in.');
        router.replace(`/t/${slug}`);
        void fetchTournament();
      } else {
        setActionFeedback({
          tone: 'error',
          title: 'Payment not confirmed yet.',
          detail: payload.error ?? 'Try again once the payment provider finishes processing it.',
        });
        toast.error(payload.error ?? 'Payment not confirmed yet');
      }
    }

    void verifyPayment();
  }, [authFetch, fetchTournament, router, searchParams, slug]);

  const rounds = useMemo(() => {
    const map = new Map<number, TournamentMatch[]>();
    for (const match of data?.matches ?? []) {
      map.set(match.round, [...(map.get(match.round) ?? []), match]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [data?.matches]);

  const openStreamModal = () => {
    setStreamTitle((current) => current || `${data?.tournament.title ?? 'Tournament'} Live`);
    setStreamSetup(null);
    setShowStreamModal(true);
  };

  const handleJoin = async () => {
    setJoining(true);
    setActionFeedback({
      tone: 'loading',
      title:
        data?.tournament.entry_fee && data.tournament.entry_fee > 0
          ? 'Preparing secure checkout...'
          : 'Joining the bracket...',
      detail:
        data?.tournament.entry_fee && data.tournament.entry_fee > 0
          ? "We're reserving your slot and opening payment."
          : "We're locking your spot and refreshing the bracket.",
    });
    try {
      const res = await authFetch(`/api/tournaments/${slug}/join`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) {
        setActionFeedback({
          tone: 'error',
          title: 'Could not join this bracket.',
          detail: payload.error ?? 'Please fix the issue and try again.',
        });
        toast.error(payload.error ?? 'Could not join tournament');
        return;
      }
      if (payload.authorization_url) {
        setActionFeedback({
          tone: 'success',
          title: 'Slot reserved.',
          detail: 'Redirecting you to secure payment now.',
        });
        toast.success('Slot reserved. Redirecting to payment...');
        window.location.href = payload.authorization_url;
        return;
      }
      setActionFeedback({
        tone: 'success',
        title: 'You joined the bracket.',
        detail: 'Refreshing the tournament board with your confirmed slot.',
      });
      toast.success('You joined the bracket');
      await fetchTournament();
    } catch {
      setActionFeedback({
        tone: 'error',
        title: 'Could not join this bracket.',
        detail: 'We could not reach the server. Please try again.',
      });
      toast.error('Could not join tournament');
    } finally {
      setJoining(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setActionFeedback({
      tone: 'loading',
      title: 'Checking you in...',
      detail: "We're marking your confirmed slot as ready for tournament seeding.",
    });

    try {
      const isTeamTournament = data?.tournament.participant_mode === 'team';
      const res = await authFetch(
        `/api/tournaments/${slug}/${isTeamTournament ? 'check-in-team' : 'check-in'}`,
        {
          method: 'POST',
          ...(isTeamTournament
            ? {
                body: JSON.stringify({ team_id: data?.viewer.teamId }),
              }
            : {}),
        }
      );
      const payload = await res.json();
      if (!res.ok) {
        setActionFeedback({
          tone: 'error',
          title: 'Could not check in.',
          detail: payload.error ?? 'Please try again when check-in opens.',
        });
        toast.error(payload.error ?? 'Could not check in');
        return;
      }

      setActionFeedback({
        tone: 'success',
        title: 'You are checked in.',
        detail: 'Your slot is marked ready. Stay close for the bracket start.',
      });
      toast.success('Checked in');
      await fetchTournament();
    } catch {
      setActionFeedback({
        tone: 'error',
        title: 'Could not check in.',
        detail: 'We could not reach the server. Please try again.',
      });
      toast.error('Could not check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setActionFeedback({
      tone: 'loading',
      title: 'Starting the bracket...',
      detail: "We're generating the opening matches and refreshing the live bracket.",
    });
    try {
      const res = await authFetch(`/api/tournaments/${slug}/start`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) {
        setActionFeedback({
          tone: 'error',
          title: 'Could not start the tournament.',
          detail: payload.error ?? 'Please check the bracket and try again.',
        });
        toast.error(payload.error ?? 'Could not start tournament');
        return;
      }
      setActionFeedback({
        tone: 'success',
        title: 'Bracket started.',
        detail: 'Round one is live and the match path has been refreshed.',
      });
      toast.success('Bracket started');
      await fetchTournament();
    } catch {
      setActionFeedback({
        tone: 'error',
        title: 'Could not start the tournament.',
        detail: 'We could not reach the server. Please try again.',
      });
      toast.error('Could not start tournament');
    } finally {
      setStarting(false);
    }
  };

  const handleCreateStream = async () => {
    if (!data) return;

    setCreatingStream(true);
    try {
      const res = await authFetch('/api/streams/create', {
        method: 'POST',
        body: JSON.stringify({
          tournament_id: data.tournament.id,
          title: streamTitle.trim(),
        }),
      });
      const payload = (await res.json()) as
        | ({ error?: string } & StreamSetupState)
        | { error?: string };

      if (!res.ok || !('stream_id' in payload)) {
        toast.error(payload.error ?? 'Could not create the live stream');
        return;
      }

      setStreamSetup(payload);
      toast.success('Live stream created. Copy the ingest details into OBS or Larix.');
      await fetchTournament();
    } catch {
      toast.error('Could not create the live stream');
    } finally {
      setCreatingStream(false);
    }
  };

  const handleStopStream = async () => {
    if (!data?.stream) return;

    setStoppingStream(true);
    try {
      const res = await authFetch(`/api/streams/${data.stream.id}`, {
        method: 'DELETE',
      });
      const payload = (await res.json()) as { error?: string };

      if (!res.ok) {
        toast.error(payload.error ?? 'Could not stop the stream');
        return;
      }

      toast.success('Stream stopped');
      setStreamSetup(null);
      await fetchTournament();
    } catch {
      toast.error('Could not stop the stream');
    } finally {
      setStoppingStream(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="h-44 shimmer" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-48 shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { tournament, viewer, players } = data;
  const isTeamTournament = tournament.participant_mode === 'team';
  const game = GAMES[tournament.game as GameKey];
  const totalRounds = Math.log2(tournament.size);
  const hasActiveStream = Boolean(data.stream && data.stream.status !== 'ended');
  const scheduledKickoff = tournament.scheduled_for ?? tournament.started_at;
  const scheduledKickoffDate = parseTournamentSchedule(tournament.scheduled_for);
  const checkInOpensAt = getTournamentCheckInDate(scheduledKickoff);
  const checkInOpen = !checkInOpensAt || Date.now() >= checkInOpensAt.getTime();
  const canCheckIn =
    viewer.joined &&
    (!isTeamTournament || viewer.canManageTeamEntry) &&
    viewer.checkInStatus !== 'checked_in' &&
    ['open', 'full', 'active'].includes(tournament.status);
  const canStartTournament =
    !scheduledKickoffDate || scheduledKickoffDate.getTime() <= Date.now();
  const scheduleLabel = formatTournamentDateTime(scheduledKickoff, 'To be confirmed');
  const checkInLabel = formatTournamentDateTime(
    checkInOpensAt,
    '1 hour before kickoff'
  );
  const shareText = tournamentShareText(
    tournament.title,
    game?.label ?? tournament.game,
    tournament.entry_fee,
    tournament.slots_left,
    tournament.prize_pool
  );
  const checkedInCount = isTeamTournament
    ? data.teams.filter((team) => team.check_in_status === 'checked_in').length
    : players.filter((player) => player.check_in_status === 'checked_in').length;
  const fillRate = Math.round((tournament.confirmed_count / Math.max(1, tournament.size)) * 100);
  const checkInRate = Math.round((checkedInCount / Math.max(1, tournament.confirmed_count)) * 100);
  const completedMatchCount = data.matches.filter(
    (match) => match.status === 'completed' || match.match?.status === 'completed'
  ).length;
  const disputedMatchCount = data.matches.filter(
    (match) => match.match?.status === 'disputed'
  ).length;
  const matchCompletionRate = Math.round(
    (completedMatchCount / Math.max(1, data.matches.length)) * 100
  );

  return (
    <div className="page-container">
      <button onClick={() => router.back()} className="brand-link mb-5 inline-flex items-center gap-2 text-sm font-semibold">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="card circuit-panel mb-5 overflow-hidden">
        <div className="relative h-52 sm:h-64 lg:h-72">
          <GameCover
            gameKey={tournament.game as GameKey}
            className="h-full w-full"
            overlay
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/72 via-gray-950/28 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
            <div className="max-w-3xl">
              <p className="brand-kicker text-white/80">{game?.label ?? tournament.game}</p>
              <h1 className="mt-3 text-3xl font-black tracking-normal text-white sm:text-4xl">
                {tournament.title}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-white/86">
              <span className="rounded-full border border-white/16 bg-black/28 px-3 py-1">
                {PLATFORMS[tournament.platform ?? 'ps']?.label ?? tournament.platform}
              </span>
              <span className="rounded-full border border-white/16 bg-black/28 px-3 py-1">
                {tournament.region}
              </span>
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--border-color)] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Bracket Overview</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                {isTeamTournament
                  ? `Register a ${tournament.team_size}-player roster, lock it for competition, and check in as a team.`
                  : 'Join the bracket, check the slot pressure, and share the tournament with one clean hero image up top.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[var(--text-secondary)]">
                <span className="brand-chip px-3 py-1">
                  {formatTournamentStatusLabel(tournament.status)}
                </span>
                <span className="rounded-full border border-[var(--border-color)] px-3 py-1">
                  {PLATFORMS[tournament.platform ?? 'ps']?.label ?? tournament.platform}
                </span>
                <span className="rounded-full border border-[var(--border-color)] px-3 py-1">
                  {tournament.region}
                </span>
                <span className="rounded-full border border-[var(--border-color)] px-3 py-1">
                  {isTeamTournament
                    ? `${tournament.team_size ?? 2}v${tournament.team_size ?? 2} teams`
                    : 'Solo players'}
                </span>
              </div>
            </div>

            <ShareMenu
              variant="primary"
              title={tournament.title}
              text={shareText}
              url={getTournamentShareUrl(tournament.slug)}
              imageUrl={getTournamentOgImageUrl(tournament.slug)}
              imageFilename={`${tournament.slug}-mechi.png`}
            />
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-4 sm:p-6">
          <StatCard icon={<Users size={15} />} label="Players" value={`${tournament.confirmed_count}/${tournament.size}`} />
          <StatCard icon={<Swords size={15} />} label="Entry" value={tournament.entry_fee > 0 ? `KES ${tournament.entry_fee}` : 'Free'} />
          <StatCard
            icon={<Trophy size={15} />}
            label="Prize pool"
            value={getTournamentPrizePoolLabel({
              prizePool: tournament.prize_pool,
              entryFee: tournament.entry_fee,
              prizePoolMode: tournament.prize_pool_mode,
            })}
          />
          <StatCard
            icon={<Clock size={15} />}
            label={isTeamTournament ? 'Team slots left' : 'Slots left'}
            value={String(tournament.slots_left)}
          />
        </div>
      </div>

      {actionFeedback ? (
        <ActionFeedback
          tone={actionFeedback.tone}
          title={actionFeedback.title}
          detail={actionFeedback.detail}
          className="mb-3"
        />
      ) : null}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        {!viewer.joined && tournament.status === 'open' && !isTeamTournament && (
          <button onClick={handleJoin} disabled={joining} className="btn-primary flex-1">
            {joining
              ? 'Joining...'
              : tournament.entry_fee > 0
                ? `Join for KES ${tournament.entry_fee}`
                : 'Join Free'}
          </button>
        )}
        {!viewer.joined && tournament.status === 'open' && isTeamTournament && (
          <Link
            href={`/teams?tournament=${encodeURIComponent(tournament.slug)}`}
            className="btn-primary flex-1 justify-center"
          >
            Prepare and register a team
          </Link>
        )}
        {viewer.joined && (
          <div className="surface-live flex flex-1 items-center gap-2 rounded-2xl p-4 text-sm font-bold text-[var(--accent-secondary-text)]">
            <CheckCircle2 size={16} />
            {isTeamTournament ? 'Your team is' : 'You are'} in this bracket
            {viewer.paymentStatus ? ` / ${viewer.paymentStatus}` : ''}
            {viewer.checkInStatus ? ` / ${viewer.checkInStatus.replace('_', ' ')}` : ''}.
          </div>
        )}
        {canCheckIn && (
          <button
            onClick={handleCheckIn}
            disabled={checkingIn || !checkInOpen}
            className="btn-ghost flex-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={15} />
            {checkingIn ? 'Checking in...' : checkInOpen ? 'Check in' : 'Check-in locked'}
          </button>
        )}
        {viewer.isOrganizer && tournament.status === 'full' && !isTeamTournament && (
          <button
            onClick={handleStart}
            disabled={starting || !canStartTournament}
            className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {starting
              ? 'Starting...'
              : canStartTournament
                ? 'Start Tournament'
                : 'Scheduled start locked'}
          </button>
        )}
        {!hasActiveStream && viewer.canCreateStream && (
          <button onClick={openStreamModal} className="btn-ghost flex-1">
            <Video size={15} />
            Go Live
          </button>
        )}
        {data.stream && (
          <Link
            href={`/t/${tournament.slug}/live`}
            className={`${data.stream.status === 'active' ? 'btn-primary' : 'btn-ghost'} flex-1 justify-center`}
          >
            {data.stream.status === 'ended' ? 'Watch replay' : 'Open live stream'}
          </Link>
        )}
        {hasActiveStream && viewer.canManageStream && (
          <button
            onClick={handleStopStream}
            disabled={stoppingStream}
            className="btn-danger flex-1"
          >
            {stoppingStream ? 'Stopping...' : 'Stop Stream'}
          </button>
        )}
      </div>
      {viewer.isOrganizer && tournament.status === 'full' && !isTeamTournament && !canStartTournament ? (
        <p className="mb-5 text-xs leading-6 text-[var(--text-soft)]">
          Kickoff is set for {scheduleLabel}. Check-in opens {checkInLabel}.
        </p>
      ) : null}

      {data.stream ? (
        <section className="card mb-5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {data.stream.status === 'active' ? (
                  <LiveBadge viewerCount={data.stream.viewer_count} />
                ) : data.stream.status === 'idle' ? (
                  <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Stream queued
                  </span>
                ) : (
                  <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Replay ready
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-lg font-black text-[var(--text-primary)]">
                {data.stream.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Streamer: {data.stream.streamer?.username ?? 'Unknown'}
              </p>
            </div>
            <Link href={`/t/${tournament.slug}/live`} className="btn-ghost text-sm">
              {data.stream.status === 'ended' ? 'Open replay' : 'Open live page'}
            </Link>
          </div>
        </section>
      ) : null}

      {streamSetup ? (
        <section className="card mb-5 p-5">
          <p className="section-title">Ingest Details</p>
          <h2 className="mt-3 text-xl font-black text-[var(--text-primary)]">
            Copy these into OBS or Larix Broadcaster
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Keep this panel open while you set up your encoder. The stream key is shown once after
            creation for security.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CopyValueCard label="RTMPS URL" value={streamSetup.rtmp_url} />
            <CopyValueCard label="Stream key" value={streamSetup.stream_key} secret />
          </div>
        </section>
      ) : null}

      {showStreamModal ? (
        <StreamSetupModal
          title={streamTitle}
          onTitleChange={setStreamTitle}
          loading={creatingStream}
          onClose={() => setShowStreamModal(false)}
          onSubmit={handleCreateStream}
          setup={streamSetup}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="brand-kicker">Live Bracket</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Match path</h2>
            </div>
          </div>

          {rounds.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--text-soft)]">
              Bracket appears after the organizer starts the tournament.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {rounds.map(([round, matches]) => (
                <div key={round} className="space-y-3">
                  <p className="section-title">{getRoundLabel(round, totalRounds)}</p>
                  {matches.map((match) => (
                    <div key={match.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-3">
                      <PlayerLine name={match.player1?.username ?? 'TBD'} won={match.winner_id === match.player1_id} />
                      <div className="my-2 border-t border-[var(--border-color)]" />
                      <PlayerLine name={match.player2?.username ?? 'TBD'} won={match.winner_id === match.player2_id} />
                      {match.match?.player1_score !== null &&
                      match.match?.player1_score !== undefined &&
                      match.match?.player2_score !== null &&
                      match.match?.player2_score !== undefined ? (
                        <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-bold text-[var(--text-primary)]">
                          Final score: {match.match.player1_score} - {match.match.player2_score}
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                          {match.status}
                        </span>
                        {match.match_id && match.status !== 'completed' && (
                          <Link href={`/match/${match.match_id}`} className="brand-link text-xs font-black">
                            Open match
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="card p-5">
            <p className="section-title">Schedule</p>
            <div className="mt-4 space-y-3">
              <ScheduleRow
                icon={<CalendarClock size={14} />}
                label="Kickoff"
                value={scheduleLabel}
              />
              <ScheduleRow
                icon={<Clock size={14} />}
                label="Check-in opens"
                value={checkInLabel}
              />
            </div>
          </section>

          <section className="card p-5">
            <p className="section-title">{isTeamTournament ? 'Teams' : 'Players'}</p>
            <div className="mt-4 space-y-2">
              {isTeamTournament
                ? data.teams.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl bg-[var(--surface-strong)] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(50,224,196,0.12)] text-xs font-black text-[var(--brand-teal)]">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[var(--text-primary)]">
                            {entry.team?.name ?? entry.roster_snapshot.team_name ?? 'Team'}
                          </p>
                          <p className="text-xs text-[var(--text-soft)]">
                            {entry.payment_status} / {entry.check_in_status.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                        {(entry.roster_snapshot.players ?? [])
                          .filter((player) => player.roster_role === 'starter')
                          .map((player) => player.username ?? 'Player')
                          .join(', ')}
                      </p>
                    </div>
                  ))
                : players.map((player, index) => (
                <div key={player.id} className="flex items-center gap-3 rounded-2xl bg-[var(--surface-strong)] p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(50,224,196,0.12)] text-xs font-black text-[var(--brand-teal)]">
                    {player.seed ?? index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[var(--text-primary)]">
                      {player.user?.username ?? 'Player'}
                    </p>
                    <p className="text-xs text-[var(--text-soft)]">
                      {player.payment_status}
                      {player.check_in_status ? ` / ${player.check_in_status.replace('_', ' ')}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {Array.from({
                length: tournament.size - (isTeamTournament ? data.teams.length : players.length),
              }).map((_, index) => (
                <div key={`empty-${index}`} className="rounded-2xl border border-dashed border-[var(--border-color)] p-3 text-sm text-[var(--text-soft)]">
                  Open {isTeamTournament ? 'team ' : ''}slot
                </div>
              ))}
            </div>
          </section>

          {(viewer.isOrganizer || viewer.isPrimaryAdmin) && (
            <section className="card p-5">
              <p className="section-title">Ops metrics</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <OpsMetric label="Fill rate" value={`${fillRate}%`} detail={`${tournament.confirmed_count}/${tournament.size} ${isTeamTournament ? 'teams' : 'slots'}`} />
                <OpsMetric label="Check-ins" value={`${checkInRate}%`} detail={`${checkedInCount} ready ${isTeamTournament ? 'teams' : 'players'}`} />
                <OpsMetric label="Matches done" value={`${matchCompletionRate}%`} detail={`${completedMatchCount}/${data.matches.length || 0} matches`} />
                <OpsMetric label="Disputes" value={String(disputedMatchCount)} detail="Open match disputes" />
              </div>
            </section>
          )}

          <section className="card p-5">
            <p className="section-title">Trust desk</p>
            <div className="mt-4 space-y-3">
              <TrustRow
                icon={<ShieldCheck size={14} />}
                label="Result state"
                value={formatTournamentStatusLabel(tournament.status)}
                detail={getResultStatusDetail(tournament.status)}
              />
              <TrustRow
                icon={<Swords size={14} />}
                label="Disputes"
                value="Match-room proof"
                detail="Mismatched score reports move to dispute review, where players can upload screenshot proof."
              />
              <TrustRow
                icon={<Trophy size={14} />}
                label="Payout"
                value={formatPayoutStatusLabel(tournament.payout_status, tournament.prize_pool)}
                detail={getPayoutStatusDetail(tournament.payout_status, tournament.prize_pool)}
              />
            </div>
          </section>

          {tournament.rules && (
            <section className="card p-5">
              <p className="section-title">Rules</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                {tournament.rules}
              </p>
            </section>
          )}

          <button
            onClick={() => {
              navigator.clipboard.writeText(getTournamentShareUrl(tournament.slug));
              toast.success('Tournament link copied');
            }}
            className="btn-ghost w-full"
          >
            <Copy size={14} /> Copy share link
          </button>
        </aside>
      </div>
    </div>
  );
}

function OpsMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function TrustRow({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
      <div className="flex items-center gap-2 text-[var(--brand-teal)]">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-black text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
      <div className="mb-2 text-[var(--brand-teal)]">{icon}</div>
      <p className="text-lg font-black text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">{label}</p>
    </div>
  );
}

function ScheduleRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
      <div className="flex items-center gap-2 text-[var(--brand-teal)]">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function PlayerLine({ name, won }: { name: string; won: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`truncate text-sm font-bold ${won ? 'text-[var(--brand-teal)]' : 'text-[var(--text-primary)]'}`}>
        {name}
      </span>
      {won && <Trophy size={13} className="text-[var(--brand-coral)]" />}
    </div>
  );
}

function StreamSetupModal({
  title,
  onTitleChange,
  loading,
  onClose,
  onSubmit,
  setup,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  setup: StreamSetupState | null;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Close stream setup modal"
        className="absolute inset-0 bg-[rgba(11,17,33,0.72)] backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="card relative z-[1] w-full max-w-xl p-5 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="icon-button absolute right-4 top-4 h-9 w-9"
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]">
          <Video size={18} />
        </div>

        <h3 className="mt-4 text-xl font-black text-[var(--text-primary)]">Go Live</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Create the secure Mux stream for this tournament, then paste the RTMPS URL and stream key
          into OBS or Larix Broadcaster on mobile.
        </p>

        <label className="mt-5 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Stream title
          </span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Tournament Finals Live"
            className="mt-2 w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
          />
        </label>

        {setup ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <CopyValueCard label="RTMPS URL" value={setup.rtmp_url} />
            <CopyValueCard label="Stream key" value={setup.stream_key} secret />
          </div>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || title.trim().length < 3}
            className="btn-primary justify-center"
          >
            {loading ? 'Creating...' : 'Create stream'}
          </button>
          <button type="button" onClick={onClose} className="btn-outline justify-center">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyValueCard({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(`${label} copied`);
        }}
        className={`mt-3 ${secret ? 'btn-primary' : 'btn-ghost'} w-full justify-center text-sm`}
      >
        <Copy size={14} />
        Copy {label.toLowerCase()}
      </button>
    </div>
  );
}
