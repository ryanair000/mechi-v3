import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  ExternalLink,
  MonitorPlay,
  RadioTower,
} from 'lucide-react';
import type { IconType } from 'react-icons';
import { SiInstagram, SiTiktok, SiYoutube } from 'react-icons/si';
import {
  ONLINE_TOURNAMENT_EVENT_DATES,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_STREAM_PLATFORMS,
  ONLINE_TOURNAMENT_STREAMER,
} from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: 'Stream | Mechi',
};

const platformIcons: Record<string, IconType> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
};

export default function StreamsPage() {
  const nextGame = ONLINE_TOURNAMENT_GAMES[0];

  return (
    <div className="page-container max-w-7xl space-y-5 py-6">
      <section className="border-b border-[var(--border-color)] pb-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-title">Stream</p>
            <h1 className="mt-3 text-[2rem] font-black leading-none text-[var(--text-primary)] sm:text-[3rem]">
              Watch PlayMechi where the audience already is.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              The tournament will stream on Instagram, TikTok, and YouTube. Mechi.club keeps the
              tournament desk, schedule, rules, and streamer tools clean instead of hosting the
              video player directly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/streams/playmechi" className="btn-primary text-sm">
              <MonitorPlay size={15} />
              Watch links
            </Link>
            <Link href="/streams/dashboard" className="btn-outline text-sm">
              <RadioTower size={15} />
              Streamer dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {ONLINE_TOURNAMENT_STREAM_PLATFORMS.map((platform) => {
          const Icon = platformIcons[platform.key];

          return (
            <a
              key={platform.key}
              href={platform.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 transition hover:border-[rgba(50,224,196,0.3)] hover:bg-[color-mix(in_srgb,var(--surface-elevated)_78%,rgba(50,224,196,0.08))]"
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
              <h2 className="mt-4 text-xl font-black text-[var(--text-primary)]">
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

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[var(--brand-coral)]">
              <CalendarClock size={18} />
            </span>
            <div>
              <p className="text-xs font-bold text-[var(--text-soft)]">Launch window</p>
              <h2 className="text-xl font-black text-[var(--text-primary)]">
                {ONLINE_TOURNAMENT_EVENT_DATES}
              </h2>
            </div>
          </div>
          <div className="mt-5 divide-y divide-[var(--border-color)] border-y border-[var(--border-color)]">
            {ONLINE_TOURNAMENT_GAMES.map((game) => (
              <div key={game.game} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-black text-[var(--text-primary)]">{game.label}</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {game.dateLabel} / {game.timeLabel}
                  </p>
                </div>
                <span className="rounded-md border border-[var(--border-color)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">
                  {game.matchCount}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
          <p className="section-title">Tonight</p>
          <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
            {nextGame.label} is the next stage.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Streamer: {ONLINE_TOURNAMENT_STREAMER}. Start the external broadcast first, then keep
            Mechi.club open for tournament desk status, player check-in, rules, and moderator
            updates.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/playmechi/tournament?game=codm" className="btn-outline text-sm">
              Tournament desk
              <ArrowRight size={14} />
            </Link>
            <Link href="/moderators" className="btn-ghost text-sm">
              Moderator desk
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
