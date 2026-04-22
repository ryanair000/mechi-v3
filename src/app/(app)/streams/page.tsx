import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight, Clock3, RadioTower, Video } from 'lucide-react';
import { LiveBadge } from '@/components/LiveBadge';
import { GAMES } from '@/lib/config';
import { verifyToken } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { firstRelation } from '@/lib/tournaments';
import type { GameKey, LiveStream } from '@/types';

const STREAM_SELECT =
  'id, tournament_id, title, status, viewer_count, started_at, ended_at, created_at, recording_playback_id, streamer:streamer_id(id, username), tournament:tournament_id(id, slug, title, game, is_featured)';

type StreamerRelation =
  | { id: string; username: string }
  | Array<{ id: string; username: string }>
  | null
  | undefined;

type TournamentRelation =
  | { id: string; slug: string; title: string; game: GameKey; is_featured?: boolean | null }
  | Array<{ id: string; slug: string; title: string; game: GameKey; is_featured?: boolean | null }>
  | null
  | undefined;

type StreamDirectoryRow = Pick<
  LiveStream,
  | 'id'
  | 'title'
  | 'status'
  | 'viewer_count'
  | 'started_at'
  | 'ended_at'
  | 'created_at'
  | 'recording_playback_id'
> & {
  streamer?: StreamerRelation;
  tournament?: TournamentRelation;
};

type StreamDirectoryEntry = StreamDirectoryRow & {
  streamer: { id: string; username: string } | null;
  tournament: { id: string; slug: string; title: string; game: GameKey; is_featured?: boolean | null } | null;
};

function formatStreamTime(value: string | null | undefined, fallback: string) {
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

function StreamSection({
  emptyCopy,
  items,
  title,
}: {
  emptyCopy: string;
  items: StreamDirectoryEntry[];
  title: string;
}) {
  if (items.length === 0) {
    return (
      <section className="card p-5">
        <div className="flex items-center gap-3">
          <div className="h-4 w-[3px] rounded-full bg-[var(--brand-teal)]" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
            {title}
          </h2>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{emptyCopy}</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-4 w-[3px] rounded-full bg-[var(--brand-teal)]" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
          {title}
        </h2>
        <div className="h-px flex-1 bg-[var(--border-color)]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((stream) => {
          const tournament = stream.tournament;
          if (!tournament) {
            return null;
          }

          const gameLabel = GAMES[tournament.game]?.label ?? tournament.game;
          const streamHref = `/t/${tournament.slug}/live`;
          const isLive = stream.status === 'active';
          const isReplay = stream.status === 'ended';
          const statusLabel = isLive ? 'Watch live' : isReplay ? 'Watch replay' : 'Open standby';
          const statusTone = isReplay
            ? 'border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.08)] text-[var(--brand-coral)]'
            : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
          const scheduleLabel = isReplay
            ? `Ended ${formatStreamTime(stream.ended_at, 'recently')}`
            : stream.status === 'idle'
              ? `Queued ${formatStreamTime(stream.created_at, 'recently')}`
              : `Started ${formatStreamTime(stream.started_at, 'recently')}`;

          return (
            <Link
              key={stream.id}
              href={streamHref}
              className="group rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-5 transition-all hover:border-[rgba(50,224,196,0.3)] hover:bg-[var(--surface-elevated)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isLive ? (
                      <LiveBadge viewerCount={stream.viewer_count} />
                    ) : (
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone}`}>
                        {isReplay ? 'Replay' : 'Stand by'}
                      </span>
                    )}
                    <span className="brand-chip px-2 py-0.5 text-[10px]">{gameLabel}</span>
                    {tournament.is_featured ? (
                      <span className="brand-chip-coral px-2 py-0.5 text-[10px]">Featured</span>
                    ) : null}
                  </div>

                  <h3 className="mt-3 text-lg font-black text-[var(--text-primary)]">
                    {stream.title}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">
                    {tournament.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                    Streamer: {stream.streamer?.username ?? 'Unknown'} · {scheduleLabel}
                  </p>
                </div>

                <ArrowRight
                  size={18}
                  className="mt-1 shrink-0 text-[var(--text-soft)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--brand-teal)]"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-soft)]">
                <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1">
                  {statusLabel}
                </span>
                {isLive ? (
                  <span className="rounded-full border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.08)] px-2.5 py-1 text-[var(--accent-secondary-text)]">
                    {stream.viewer_count} watching
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default async function StreamsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload?.sub) {
    redirect('/login');
  }

  const supabase = createServiceClient();
  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('id, is_banned')
    .eq('id', payload.sub)
    .maybeSingle();

  if (!viewerProfile || viewerProfile.is_banned) {
    redirect('/login');
  }

  const [{ data: liveAndStandbyRaw }, { data: replayRaw }] = await Promise.all([
    supabase
      .from('live_streams')
      .select(STREAM_SELECT)
      .not('tournament_id', 'is', null)
      .in('status', ['idle', 'active'])
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('live_streams')
      .select(STREAM_SELECT)
      .not('tournament_id', 'is', null)
      .eq('status', 'ended')
      .not('recording_playback_id', 'is', null)
      .order('ended_at', { ascending: false })
      .limit(12),
  ]);

  const mapEntry = (row: StreamDirectoryRow): StreamDirectoryEntry => ({
    ...row,
    streamer: firstRelation(row.streamer) as StreamDirectoryEntry['streamer'],
    tournament: firstRelation(row.tournament) as StreamDirectoryEntry['tournament'],
  });

  const liveAndStandby = ((liveAndStandbyRaw ?? []) as StreamDirectoryRow[])
    .map(mapEntry)
    .filter((stream) => Boolean(stream.tournament));
  const replays = ((replayRaw ?? []) as StreamDirectoryRow[])
    .map(mapEntry)
    .filter((stream) => Boolean(stream.tournament));

  const liveNow = liveAndStandby.filter((stream) => stream.status === 'active');
  const standby = liveAndStandby.filter((stream) => stream.status === 'idle');

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Streams</p>
            <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Follow live brackets without hunting through every tournament.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              This is the missing index for streaming. Live broadcasts, queued streams, and recent
              replays now have one clear home in the app shell.
            </p>
          </div>

          <Link href="/tournaments" className="btn-primary text-sm">
            Open tournaments
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: RadioTower,
              title: 'Live now',
              value: liveNow.length,
              copy: 'Broadcasts already on air and taking viewers.',
            },
            {
              icon: Clock3,
              title: 'Stand by',
              value: standby.length,
              copy: 'Streams created by organizers and waiting for the encoder.',
            },
            {
              icon: Video,
              title: 'Replays',
              value: replays.length,
              copy: 'Ended streams with a recording ready to open again.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.copy}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <StreamSection
        title="Live Now"
        items={liveNow}
        emptyCopy="No tournament stream is live right now. When an organizer goes on air, it will land here first."
      />

      <StreamSection
        title="Stand By"
        items={standby}
        emptyCopy="No queued broadcasts yet. Standby streams will appear here as soon as organizers create them."
      />

      <StreamSection
        title="Recent Replays"
        items={replays}
        emptyCopy="No finished tournament replay is available yet."
      />
    </div>
  );
}
