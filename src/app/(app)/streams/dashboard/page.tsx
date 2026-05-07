import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  RadioTower,
} from 'lucide-react';
import type { IconType } from 'react-icons';
import { SiInstagram, SiTiktok, SiYoutube } from 'react-icons/si';
import { StreamCopyButton } from '../stream-copy-button';
import {
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_STREAM_PLATFORMS,
  ONLINE_TOURNAMENT_STREAMER,
  ONLINE_TOURNAMENT_TITLE,
} from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: 'Streamer Dashboard | Mechi',
};

const platformIcons: Record<string, IconType> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
};

const liveTitle = `${ONLINE_TOURNAMENT_TITLE} live with ${ONLINE_TOURNAMENT_STREAMER}`;
const streamCaption = `PlayMechi Launch is live. Join the tournament desk at https://mechi.club/playmechi/tournament and follow @playmechi for updates.`;

const checklist = [
  'Open YouTube, TikTok, and Instagram broadcast surfaces.',
  'Confirm audio, game capture, and network before the room opens.',
  'Keep the CODM moderator desk open for check-ins, no-shows, bans, and lobby state.',
  'Call match starts, rule breaks, and standings from the tournament desk only.',
];

export default function StreamerDashboardPage() {
  return (
    <div className="page-container max-w-7xl space-y-5 py-6">
      <section className="border-b border-[var(--border-color)] pb-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="section-title">Streamer dashboard</p>
            <h1 className="mt-3 text-[2rem] font-black leading-none text-[var(--text-primary)] sm:text-[3rem]">
              Run the external stream from one quiet desk.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Open the social platforms, keep match ops close, and copy the short stream text
              without adding a video player to Mechi.club.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/streams/playmechi" className="btn-outline text-sm">
              Public watch page
              <ArrowRight size={14} />
            </Link>
            <Link href="/moderators" className="btn-primary text-sm">
              Moderator desk
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {ONLINE_TOURNAMENT_STREAM_PLATFORMS.map((platform) => {
          const Icon = platformIcons[platform.key];

          return (
            <a
              key={platform.key}
              href={platform.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 transition hover:border-[rgba(50,224,196,0.3)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[var(--accent-secondary-text)]">
                  <Icon size={18} />
                </span>
                <ExternalLink
                  size={16}
                  className="text-[var(--text-soft)] transition group-hover:text-[var(--brand-teal)]"
                />
              </div>
              <h2 className="mt-4 text-lg font-black text-[var(--text-primary)]">
                {platform.label}
              </h2>
              <p className="mt-1 text-sm font-bold text-[var(--text-secondary)]">
                {platform.handle}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {platform.role}
              </p>
            </a>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[var(--brand-coral)]">
                <RadioTower size={18} />
              </span>
              <div>
                <p className="text-xs font-bold text-[var(--text-soft)]">Live title</p>
                <h2 className="text-xl font-black text-[var(--text-primary)]">{liveTitle}</h2>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StreamCopyButton label="Stream title" text={liveTitle} />
              <StreamCopyButton label="Stream caption" text={streamCaption} />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[var(--accent-secondary-text)]">
                <CheckCircle2 size={18} />
              </span>
              <h2 className="text-xl font-black text-[var(--text-primary)]">Live checklist</h2>
            </div>
            <div className="mt-5 divide-y divide-[var(--border-color)] border-y border-[var(--border-color)]">
              {checklist.map((item) => (
                <div key={item} className="flex gap-3 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                  <CheckCircle2 size={16} className="mt-1 shrink-0 text-[var(--brand-teal)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[var(--brand-coral)]">
              <CalendarClock size={18} />
            </span>
            <h2 className="text-xl font-black text-[var(--text-primary)]">Run sheet</h2>
          </div>

          <div className="mt-5 divide-y divide-[var(--border-color)] border-y border-[var(--border-color)]">
            {ONLINE_TOURNAMENT_GAMES.map((game) => (
              <div key={game.game} className="grid gap-3 py-4 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-center">
                <div>
                  <p className="font-black text-[var(--text-primary)]">{game.shortLabel}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{game.timeLabel}</p>
                </div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  {game.dateLabel}. {game.matchCount}. {game.format}.
                </p>
                <Link
                  href={`/playmechi/tournament?game=${encodeURIComponent(game.game)}`}
                  className="btn-ghost justify-center text-sm"
                >
                  Desk
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
