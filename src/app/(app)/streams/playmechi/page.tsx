import type { Metadata } from 'next';
import { ExternalLink, MonitorPlay } from 'lucide-react';
import {
  ONLINE_TOURNAMENT_TITLE,
  ONLINE_TOURNAMENT_YOUTUBE_EMBED_URL,
  ONLINE_TOURNAMENT_YOUTUBE_URL,
} from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: 'PlayMechi Stream | Mechi',
};

export default function PlayMechiStreamPage() {
  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-3 py-4 sm:px-5 lg:px-7">
      <h1 className="sr-only">{ONLINE_TOURNAMENT_TITLE} stream</h1>
      {ONLINE_TOURNAMENT_YOUTUBE_EMBED_URL ? (
        <div className="w-full max-w-7xl overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-black shadow-[var(--shadow-soft)]">
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
        <div className="flex aspect-video w-full max-w-7xl items-center justify-center rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-strong)_84%,transparent)] px-6 text-center">
          <div className="max-w-md">
            <MonitorPlay size={32} className="mx-auto text-[var(--text-soft)]" />
            <p className="mt-4 text-lg font-black text-[var(--text-primary)]">
              YouTube stage reserved
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
    </main>
  );
}
