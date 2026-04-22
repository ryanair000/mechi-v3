import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Clock3, Video } from 'lucide-react';
import { LiveBadge } from '@/components/LiveBadge';
import { StreamPlayer } from '@/components/StreamPlayer';
import { isE2ETournamentFixture, shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { verifyToken } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { firstRelation } from '@/lib/tournaments';
import type { LiveStream } from '@/types';

const TOURNAMENT_STREAM_SELECT =
  'id, tournament_id, match_id, streamer_id, mux_stream_id, mux_playback_id, status, title, viewer_count, started_at, ended_at, recording_playback_id, created_at, updated_at, streamer:streamer_id(id, username)';

type StreamerRelation =
  | { id: string; username: string }
  | Array<{ id: string; username: string }>
  | null
  | undefined;

export default async function TournamentLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  let tournamentQuery = supabase
    .from('tournaments')
    .select('id, slug, title, status, organizer:organizer_id(id, username)')
    .eq('slug', slug);

  if (shouldHideE2EFixtures()) {
    tournamentQuery = tournamentQuery.not('title', 'ilike', '%e2e%').not('slug', 'ilike', '%e2e%');
  }

  const { data: tournamentRaw } = await tournamentQuery.maybeSingle();

  const tournament = tournamentRaw as
    | {
        id: string;
        slug: string;
        title: string;
        status: string;
        organizer?: StreamerRelation;
      }
    | null;

  if (!tournament || isE2ETournamentFixture(tournament)) {
    notFound();
  }

  const { data: liveStreamRaw } = await supabase
    .from('live_streams')
    .select(TOURNAMENT_STREAM_SELECT)
    .eq('tournament_id', tournament.id)
    .in('status', ['idle', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: endedStreamRaw } = liveStreamRaw
    ? { data: null }
    : await supabase
        .from('live_streams')
        .select(TOURNAMENT_STREAM_SELECT)
        .eq('tournament_id', tournament.id)
        .eq('status', 'ended')
        .not('recording_playback_id', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle();

  const streamRaw = (liveStreamRaw ?? endedStreamRaw) as
    | (LiveStream & {
        streamer?: StreamerRelation;
      })
    | null;
  const stream = streamRaw
    ? {
        ...streamRaw,
        streamer: firstRelation(streamRaw.streamer as StreamerRelation),
      }
    : null;

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Tournament Live</p>
            <h1 className="mt-3 text-[1.6rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2.2rem]">
              {tournament.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Watch the live bracket feed when the broadcaster is on air, or catch the replay once
              the stream wraps.
            </p>
          </div>

          <Link href={`/t/${tournament.slug}`} className="btn-ghost text-sm">
            <ArrowLeft size={14} />
            Back to tournament
          </Link>
        </div>
      </section>

      {!stream ? (
        <section className="card p-8 text-center">
          <Video size={34} className="mx-auto text-[var(--text-soft)] opacity-70" />
          <p className="mt-4 text-lg font-black text-[var(--text-primary)]">
            No live stream for this tournament
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            The organizer has not gone live yet. Check back from the tournament page later.
          </p>
        </section>
      ) : stream.status === 'idle' ? (
        <section className="card p-8">
          <div className="flex flex-wrap items-center gap-3">
            <LiveBadge viewerCount={stream.viewer_count} />
            <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              Stand by
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-black text-[var(--text-primary)]">
            Stream starting soon...
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {stream.streamer?.username ?? 'The streamer'} has queued the broadcast. Open this page
            again in a moment and the player will switch live automatically once the encoder starts.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">
            <Clock3 size={15} />
            Streamer: {stream.streamer?.username ?? 'Unknown'}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="card overflow-hidden p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {stream.status === 'active' ? (
                    <LiveBadge viewerCount={stream.viewer_count} />
                  ) : (
                    <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      Replay
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-xl font-black text-[var(--text-primary)]">
                  {stream.title}
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Streamer: {stream.streamer?.username ?? 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          <StreamPlayer stream={stream} />
        </section>
      )}
    </div>
  );
}
