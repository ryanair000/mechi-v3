import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  ExternalLink,
  MonitorPlay,
  RadioTower,
} from 'lucide-react';
import {
  ONLINE_TOURNAMENT_EVENT_DATES,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_PUBLIC_PATH,
  ONLINE_TOURNAMENT_STREAM_CHANNEL,
  ONLINE_TOURNAMENT_STREAM_DELAY_MINUTES,
  ONLINE_TOURNAMENT_STREAMER,
  ONLINE_TOURNAMENT_TITLE,
  ONLINE_TOURNAMENT_YOUTUBE_EMBED_URL,
  ONLINE_TOURNAMENT_YOUTUBE_URL,
} from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: 'Stream | Mechi',
};

const UPCOMING_STREAM_ID = 'playmechi-online-tournament';

type StreamsPageProps = {
  searchParams: Promise<{ watch?: string | string[] | undefined }>;
};

function getSelectedWatchId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StreamsPage({ searchParams }: StreamsPageProps) {
  const { watch } = await searchParams;
  const isUpcomingStreamSelected = getSelectedWatchId(watch) === UPCOMING_STREAM_ID;

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Stream</p>
            <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Watch Mechi tournaments live.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              The next PlayMechi broadcast is staged inside Mechi for the new tournament.
            </p>
          </div>

          <a
            href={ONLINE_TOURNAMENT_YOUTUBE_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-outline text-sm"
          >
            <ExternalLink size={14} />
            YouTube
          </a>
        </div>
      </section>

      <div
        className={
          isUpcomingStreamSelected
            ? 'grid gap-5 xl:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)] xl:items-start'
            : 'max-w-xl'
        }
      >
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Upcoming</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                Tournament stream
              </h2>
            </div>
            <span className="brand-chip px-2.5 py-1">8:00 PM EAT</span>
          </div>

          <Link
            href={`/streams?watch=${UPCOMING_STREAM_ID}#stage`}
            className={`group block overflow-hidden rounded-[var(--radius-panel)] border bg-[var(--surface)] shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-[rgba(50,224,196,0.32)] hover:bg-[var(--surface-elevated)] ${
              isUpcomingStreamSelected
                ? 'border-[rgba(50,224,196,0.32)] ring-1 ring-[rgba(50,224,196,0.18)]'
                : 'border-[var(--border-color)]'
            }`}
          >
            <div className="relative aspect-video overflow-hidden bg-[var(--surface-strong)]">
              <Image
                src="/game-artwork/codm-header.webp"
                alt="Call of Duty Mobile artwork for the upcoming PlayMechi stream"
                fill
                sizes="(min-width: 1280px) 34vw, (min-width: 768px) 520px, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/24 to-transparent" />
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                <RadioTower size={12} />
                Upcoming stream
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-lg font-black leading-tight text-white">
                  {ONLINE_TOURNAMENT_TITLE}
                </h3>
                <p className="mt-1 text-xs font-semibold text-white/74">
                  Live on {ONLINE_TOURNAMENT_STREAM_CHANNEL}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                {ONLINE_TOURNAMENT_GAMES.map((game) => (
                  <span key={game.game} className="brand-chip px-2 py-0.5">
                    {game.shortLabel}
                  </span>
                ))}
              </div>

              <div className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                <p className="flex items-center gap-2">
                  <CalendarClock size={14} className="shrink-0 text-[var(--brand-teal)]" />
                  {ONLINE_TOURNAMENT_EVENT_DATES} / 8:00 PM EAT
                </p>
                <p>
                  {ONLINE_TOURNAMENT_STREAMER} hosts the broadcast with a{' '}
                  {ONLINE_TOURNAMENT_STREAM_DELAY_MINUTES}-minute competitive delay for PUBG
                  Mobile and CODM.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] pt-4 text-sm font-black text-[var(--text-primary)]">
                <span>Open stream</span>
                <ArrowRight
                  size={15}
                  className="text-[var(--brand-teal)] transition-transform group-hover:translate-x-1"
                />
              </div>
            </div>
          </Link>
        </section>

        {isUpcomingStreamSelected ? (
          <section id="stage" className="scroll-mt-24 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-title">Mechi Live</p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  {ONLINE_TOURNAMENT_TITLE}
                </h2>
              </div>
              <Link href={ONLINE_TOURNAMENT_PUBLIC_PATH} className="btn-ghost text-sm">
                Tournament page
                <ArrowRight size={14} />
              </Link>
            </div>

            {ONLINE_TOURNAMENT_YOUTUBE_EMBED_URL ? (
              <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-black shadow-[var(--shadow-soft)]">
                <iframe
                  className="aspect-video w-full"
                  src={ONLINE_TOURNAMENT_YOUTUBE_EMBED_URL}
                  title={`${ONLINE_TOURNAMENT_TITLE} live stream`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-strong)_84%,transparent)] px-6 text-center">
                <div className="max-w-md">
                  <MonitorPlay size={32} className="mx-auto text-[var(--text-soft)]" />
                  <p className="mt-4 text-lg font-black text-[var(--text-primary)]">
                    YouTube stage reserved
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    The in-app player appears here once the PlayMechi live room is attached.
                  </p>
                  <a
                    href={ONLINE_TOURNAMENT_YOUTUBE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary mt-5 inline-flex text-sm"
                  >
                    Open YouTube
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
