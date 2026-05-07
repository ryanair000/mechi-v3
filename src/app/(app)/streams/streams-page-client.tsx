'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Copy,
  Crown,
  ExternalLink,
  MonitorPlay,
  RadioTower,
  ShieldCheck,
  StopCircle,
  Trophy,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { StreamPlayer } from '@/components/StreamPlayer';
import { LiveBadge } from '@/components/LiveBadge';
import { useAuthFetch } from '@/components/AuthProvider';
import { GAMES } from '@/lib/config';
import type { GameKey, LiveStreamStatus, Plan } from '@/types';

export interface StreamHubViewer {
  id: string;
  username: string;
  plan: Plan;
  isPrimaryAdmin: boolean;
  canBroadcast: boolean;
}

export interface StreamHubEntry {
  id: string;
  tournament_id: string | null;
  match_id: string | null;
  mux_playback_id: string;
  status: LiveStreamStatus;
  title: string;
  viewer_count: number;
  started_at: string | null;
  ended_at: string | null;
  recording_playback_id: string | null;
  created_at: string;
  updated_at: string;
  streamer: { id: string; username: string } | null;
  tournament: {
    id: string;
    slug: string;
    title: string;
    game: GameKey;
    is_featured?: boolean | null;
  } | null;
  match: {
    id: string;
    game: GameKey;
    status: string;
    player1: { id: string; username: string } | null;
    player2: { id: string; username: string } | null;
  } | null;
}

export interface StreamHubTarget {
  id: string;
  type: 'tournament' | 'match';
  title: string;
  subtitle: string;
  game: GameKey;
  href: string;
  defaultTitle: string;
  existingStreamId: string | null;
  existingStreamStatus: LiveStreamStatus | null;
}

interface StreamsPageClientProps {
  viewer: StreamHubViewer;
  liveNow: StreamHubEntry[];
  standby: StreamHubEntry[];
  replays: StreamHubEntry[];
  myStream: StreamHubEntry | null;
  tournamentTargets: StreamHubTarget[];
  matchTargets: StreamHubTarget[];
}

type StreamSetupState = {
  stream_id: string;
  rtmp_url: string;
  stream_key: string;
  playback_id: string;
};

function getDefaultStreamId({
  liveNow,
  myStream,
  replays,
  standby,
}: Pick<StreamsPageClientProps, 'liveNow' | 'standby' | 'replays' | 'myStream'>) {
  return myStream?.id ?? liveNow[0]?.id ?? standby[0]?.id ?? replays[0]?.id ?? null;
}

function formatMoment(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getStreamMeta(stream: StreamHubEntry) {
  if (stream.tournament) {
    return `${stream.tournament.title} / ${GAMES[stream.tournament.game]?.label ?? stream.tournament.game}`;
  }

  if (stream.match) {
    const player1 = stream.match.player1?.username ?? 'Player 1';
    const player2 = stream.match.player2?.username ?? 'Player 2';
    return `${GAMES[stream.match.game]?.label ?? stream.match.game} / ${player1} vs ${player2}`;
  }

  return stream.streamer?.username ?? 'Gameplay stream';
}

function getStreamTimeLabel(stream: StreamHubEntry) {
  if (stream.status === 'active') {
    return `Started ${formatMoment(stream.started_at, 'recently')}`;
  }

  if (stream.status === 'idle') {
    return `Queued ${formatMoment(stream.created_at, 'recently')}`;
  }

  return `Replay from ${formatMoment(stream.ended_at, 'recently')}`;
}

function getPlanLabel(viewer: StreamHubViewer) {
  if (viewer.isPrimaryAdmin) {
    return 'Admin broadcast access';
  }

  if (viewer.plan === 'elite') {
    return 'Elite broadcasting unlocked';
  }

  if (viewer.plan === 'pro') {
    return 'Pro viewer access';
  }

  return 'Free viewer access';
}

function getTargetButtonLabel(target: StreamHubTarget) {
  if (target.existingStreamStatus === 'active') {
    return 'Open live';
  }

  if (target.existingStreamStatus === 'idle') {
    return 'Open standby';
  }

  return 'Create stream';
}

export function StreamsPageClient({
  viewer,
  liveNow,
  standby,
  replays,
  myStream,
  tournamentTargets,
  matchTargets,
}: StreamsPageClientProps) {
  const authFetch = useAuthFetch();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(() =>
    getDefaultStreamId({ liveNow, standby, replays, myStream })
  );
  const [streamTitle, setStreamTitle] = useState(myStream?.title ?? '');
  const [streamSetup, setStreamSetup] = useState<StreamSetupState | null>(null);
  const [creatingTargetId, setCreatingTargetId] = useState<string | null>(null);
  const [stoppingStream, setStoppingStream] = useState(false);

  const allStreams = [...liveNow, ...standby, ...replays];
  const selectedStream = allStreams.find((stream) => stream.id === selectedStreamId) ?? null;
  const selectedStreamIds = allStreams.map((stream) => stream.id).join('|');
  const defaultStreamId = getDefaultStreamId({ liveNow, standby, replays, myStream });
  const canCreateAnyTarget = tournamentTargets.length > 0 || matchTargets.length > 0;

  useEffect(() => {
    if (!selectedStreamIds) {
      if (selectedStreamId) {
        setSelectedStreamId(null);
      }
      return;
    }

    const streamIds = selectedStreamIds.split('|');
    if (!streamIds.includes(selectedStreamId ?? '')) {
      setSelectedStreamId(defaultStreamId);
    }
  }, [defaultStreamId, selectedStreamId, selectedStreamIds]);

  const handleCreateStream = async (target: StreamHubTarget) => {
    if (target.existingStreamId) {
      setSelectedStreamId(target.existingStreamId);
      return;
    }

    setCreatingTargetId(target.id);

    try {
      const response = await authFetch('/api/streams/create', {
        method: 'POST',
        body: JSON.stringify(
          target.type === 'tournament'
            ? {
                tournament_id: target.id,
                title: streamTitle.trim() || target.defaultTitle,
              }
            : {
                match_id: target.id,
                title: streamTitle.trim() || target.defaultTitle,
              }
        ),
      });

      const payload = (await response.json()) as
        | ({ error?: string } & StreamSetupState)
        | { error?: string };

      if (!response.ok || !('stream_id' in payload)) {
        toast.error(payload.error ?? 'Could not create the live stream');
        return;
      }

      setStreamSetup(payload);
      setSelectedStreamId(payload.stream_id);
      toast.success('Secure ingest is ready. Paste the RTMPS URL and key into OBS or Larix.');
      startRefresh(() => router.refresh());
    } catch {
      toast.error('Could not create the live stream');
    } finally {
      setCreatingTargetId(null);
    }
  };

  const handleStopStream = async () => {
    if (!myStream) {
      return;
    }

    setStoppingStream(true);

    try {
      const response = await authFetch(`/api/streams/${myStream.id}`, {
        method: 'DELETE',
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? 'Could not stop the stream');
        return;
      }

      setStreamSetup(null);
      toast.success('Stream stopped');
      startRefresh(() => router.refresh());
    } catch {
      toast.error('Could not stop the stream');
    } finally {
      setStoppingStream(false);
    }
  };

  return (
    <div className="page-container space-y-10">
      <section className="border-b border-[var(--border-color)] pb-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="section-title">Streams</p>
            <h1 className="mt-3 text-[2rem] font-black leading-[0.98] text-[var(--text-primary)] sm:text-[2.9rem]">
              Elite players can broadcast gameplay without leaving the app shell.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              One quieter stream page for going live, jumping into the stage, and scanning what is
              on air right now. Less chrome, fewer stacked containers, faster decisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            <span className="rounded-full border border-[var(--border-color)] px-3 py-1.5">
              {liveNow.length} live
            </span>
            <span className="rounded-full border border-[var(--border-color)] px-3 py-1.5">
              {standby.length} standby
            </span>
            <span className="rounded-full border border-[var(--border-color)] px-3 py-1.5">
              {replays.length} replays
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-5 border-b border-[var(--border-color)] pb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="brand-chip px-2.5 py-1 text-[10px]">{getPlanLabel(viewer)}</span>
              {myStream ? (
                myStream.status === 'active' ? (
                  <LiveBadge viewerCount={myStream.viewer_count} />
                ) : (
                  <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Standby stream
                  </span>
                )
              ) : null}
            </div>

            <h2 className="mt-3 text-2xl font-black text-[var(--text-primary)]">Studio</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Create a secure Mux stream from an active tournament or current match, then copy the
              ingest details straight into OBS or Larix.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/tournaments" className="btn-outline text-sm">
              <Trophy size={14} />
              Open tournaments
            </Link>
            <Link href="/matches" className="btn-ghost text-sm">
              <MonitorPlay size={14} />
              Open matches
            </Link>
          </div>
        </div>

        {viewer.canBroadcast ? (
          <>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Stream title
                </span>
                <input
                  value={streamTitle}
                  onChange={(event) => setStreamTitle(event.target.value)}
                  placeholder={`${viewer.username} Live`}
                  className="input-field"
                />
              </label>

              {myStream ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStreamId(myStream.id)}
                    className="btn-ghost text-sm"
                  >
                    <Video size={14} />
                    Open stage
                  </button>
                  <button
                    type="button"
                    onClick={handleStopStream}
                    disabled={stoppingStream || isRefreshing}
                    className="btn-danger text-sm"
                  >
                    <StopCircle size={14} />
                    {stoppingStream ? 'Stopping...' : 'Stop stream'}
                  </button>
                </div>
              ) : null}
            </div>

            {streamSetup ? (
              <div className="grid gap-3 border-t border-[var(--border-color)] pt-5 md:grid-cols-2">
                <CopyValueField label="RTMPS URL" value={streamSetup.rtmp_url} />
                <CopyValueField label="Stream key" value={streamSetup.stream_key} />
              </div>
            ) : null}

            <div className="grid gap-8 xl:grid-cols-2">
              <TargetGroup
                title="Tournament slots"
                emptyCopy="You can go live from any active tournament you organize or have joined."
                targets={tournamentTargets}
                busyTargetId={creatingTargetId}
                onAction={handleCreateStream}
              />
              <TargetGroup
                title="Match slots"
                emptyCopy="When you are in a current match, it will show up here as a direct gameplay stream target."
                targets={matchTargets}
                busyTargetId={creatingTargetId}
                onAction={handleCreateStream}
              />
            </div>

            {!canCreateAnyTarget ? (
              <p className="rounded-[0.65rem] border border-dashed border-[var(--border-color)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                Your broadcast access is ready, but you need an active tournament or a pending match
                before a stream target can be created.
              </p>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col gap-4 rounded-[0.7rem] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-strong)_78%,transparent)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Crown size={15} className="text-[var(--brand-coral)]" />
                <p className="text-sm font-black">Upgrade to Elite to go live</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                You can still watch every live stage here. Elite unlocks secure broadcast creation
                from active brackets and live match slots.
              </p>
            </div>

            <Link href="/pricing" className="btn-primary text-sm">
              <ShieldCheck size={14} />
              See Elite plans
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.82fr)] xl:items-start">
        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-title">Stage</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                {selectedStream ? selectedStream.title : 'No stream selected'}
              </h2>
            </div>

            {selectedStream ? (
              <div className="flex flex-wrap gap-2">
                {selectedStream.tournament ? (
                  <Link
                    href={`/t/${selectedStream.tournament.slug}/live`}
                    className="btn-outline text-sm"
                  >
                    <ExternalLink size={14} />
                    Open live page
                  </Link>
                ) : null}
                {selectedStream.tournament ? (
                  <Link href={`/t/${selectedStream.tournament.slug}`} className="btn-ghost text-sm">
                    <ArrowRight size={14} />
                    Open tournament
                  </Link>
                ) : selectedStream.match ? (
                  <Link href={`/match/${selectedStream.match.id}`} className="btn-ghost text-sm">
                    <ArrowRight size={14} />
                    Open match
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          {selectedStream ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {selectedStream.status === 'active' ? (
                  <LiveBadge viewerCount={selectedStream.viewer_count} />
                ) : selectedStream.status === 'idle' ? (
                  <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    Standby
                  </span>
                ) : (
                  <span className="rounded-full border border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.08)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff9a9a]">
                    Replay
                  </span>
                )}
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  {getStreamTimeLabel(selectedStream)}
                </span>
              </div>

              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                {getStreamMeta(selectedStream)}
                {selectedStream.streamer ? ` / Streamer: ${selectedStream.streamer.username}` : ''}
              </p>

              {selectedStream.status === 'idle' ? (
                <div className="flex aspect-video items-center justify-center rounded-[0.7rem] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-strong)_84%,transparent)] px-6 text-center">
                  <div className="max-w-md">
                    <RadioTower size={30} className="mx-auto text-[var(--text-soft)]" />
                    <p className="mt-4 text-lg font-black text-[var(--text-primary)]">
                      Encoder waiting in the wings
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      This stage is queued and will switch live once the broadcaster starts sending
                      video from OBS or Larix.
                    </p>
                  </div>
                </div>
              ) : (
                <StreamPlayer stream={selectedStream} />
              )}
            </>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-[0.7rem] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-strong)_84%,transparent)] px-6 text-center">
              <div className="max-w-md">
                <Video size={30} className="mx-auto text-[var(--text-soft)]" />
                <p className="mt-4 text-lg font-black text-[var(--text-primary)]">
                  Nothing is selected yet
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Pick a live stream, standby slot, or replay from the directory to the right.
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-8 border-t border-[var(--border-color)] pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <div>
            <p className="section-title">Directory</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
              What is on air
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Tap a row to move the stage instantly. Live, standby, and replay stay in one cleaner
              list instead of multiple heavy cards.
            </p>
          </div>

          <StreamListSection
            title="Live now"
            emptyCopy="No one is broadcasting at the moment."
            items={liveNow}
            selectedStreamId={selectedStreamId}
            onSelect={setSelectedStreamId}
          />
          <StreamListSection
            title="Standby"
            emptyCopy="No queued stages yet."
            items={standby}
            selectedStreamId={selectedStreamId}
            onSelect={setSelectedStreamId}
          />
          <StreamListSection
            title="Replays"
            emptyCopy="No recent replays are ready yet."
            items={replays}
            selectedStreamId={selectedStreamId}
            onSelect={setSelectedStreamId}
          />
        </aside>
      </div>
    </div>
  );
}

function TargetGroup({
  title,
  emptyCopy,
  targets,
  busyTargetId,
  onAction,
}: {
  title: string;
  emptyCopy: string;
  targets: StreamHubTarget[];
  busyTargetId: string | null;
  onAction: (target: StreamHubTarget) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--text-primary)]">
          {title}
        </h3>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
          {targets.length}
        </span>
      </div>

      {targets.length === 0 ? (
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{emptyCopy}</p>
      ) : (
        <div className="divide-y divide-[var(--border-color)] border-y border-[var(--border-color)]">
          {targets.map((target) => (
            <div
              key={`${target.type}-${target.id}`}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black text-[var(--text-primary)]">
                    {target.title}
                  </p>
                  {target.existingStreamStatus === 'active' ? (
                    <span className="brand-chip-coral px-2 py-0.5 text-[10px]">Live now</span>
                  ) : target.existingStreamStatus === 'idle' ? (
                    <span className="brand-chip px-2 py-0.5 text-[10px]">Standby</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {target.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={target.href} className="btn-outline text-sm">
                  <ExternalLink size={14} />
                  Open source
                </Link>
                <button
                  type="button"
                  onClick={() => void onAction(target)}
                  disabled={busyTargetId === target.id}
                  className={`${target.existingStreamId ? 'btn-ghost' : 'btn-primary'} text-sm`}
                >
                  <Video size={14} />
                  {busyTargetId === target.id ? 'Working...' : getTargetButtonLabel(target)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StreamListSection({
  title,
  emptyCopy,
  items,
  selectedStreamId,
  onSelect,
}: {
  title: string;
  emptyCopy: string;
  items: StreamHubEntry[];
  selectedStreamId: string | null;
  onSelect: (streamId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--text-primary)]">
          {title}
        </h3>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{emptyCopy}</p>
      ) : (
        <div className="divide-y divide-[var(--border-color)] border-y border-[var(--border-color)]">
          {items.map((stream) => {
            const isSelected = stream.id === selectedStreamId;

            return (
              <button
                key={stream.id}
                type="button"
                onClick={() => onSelect(stream.id)}
                className={`group flex w-full items-start gap-3 py-4 text-left transition ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
              >
                <div
                  className={`mt-0.5 h-10 w-1 shrink-0 rounded-full transition ${
                    isSelected
                      ? 'bg-[var(--brand-teal)]'
                      : 'bg-transparent group-hover:bg-[rgba(50,224,196,0.24)]'
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {stream.status === 'active' ? (
                      <LiveBadge viewerCount={stream.viewer_count} className="shrink-0" />
                    ) : stream.status === 'idle' ? (
                      <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        Standby
                      </span>
                    ) : (
                      <span className="rounded-full border border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.08)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff9a9a]">
                        Replay
                      </span>
                    )}
                  </div>

                  <p className="mt-3 truncate text-sm font-black text-[var(--text-primary)]">
                    {stream.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    {getStreamMeta(stream)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    <span>{getStreamTimeLabel(stream)}</span>
                    {stream.streamer ? <span>/ {stream.streamer.username}</span> : null}
                  </div>
                </div>

                <ArrowRight
                  size={16}
                  className={`mt-1 shrink-0 transition ${
                    isSelected
                      ? 'text-[var(--brand-teal)]'
                      : 'text-[var(--text-soft)] group-hover:text-[var(--brand-teal)]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CopyValueField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.7rem] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-strong)_84%,transparent)] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-semibold text-[var(--text-primary)]">{value}</p>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success(`${label} copied`);
        }}
        className="btn-ghost mt-3 text-sm"
      >
        <Copy size={14} />
        Copy {label.toLowerCase()}
      </button>
    </div>
  );
}
