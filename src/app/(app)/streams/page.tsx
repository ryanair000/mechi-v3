import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink, MonitorPlay } from 'lucide-react';
import {
  ONLINE_TOURNAMENT_PUBLIC_PATH,
  ONLINE_TOURNAMENT_TITLE,
  ONLINE_TOURNAMENT_YOUTUBE_EMBED_URL,
  ONLINE_TOURNAMENT_YOUTUBE_URL,
} from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: 'Stream | Mechi',
};

export default function StreamsPage() {
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
              Live tournament stages and replays stay here.
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

      <section id="stage" className="space-y-3">
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
    </div>
  );
}
