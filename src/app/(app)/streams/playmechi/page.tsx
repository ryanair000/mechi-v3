import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ExternalLink,
  MonitorPlay,
  ShieldCheck,
} from 'lucide-react';
import type { IconType } from 'react-icons';
import { SiInstagram, SiTiktok, SiYoutube } from 'react-icons/si';
import {
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_STREAM_PLATFORMS,
  ONLINE_TOURNAMENT_STREAMER,
  ONLINE_TOURNAMENT_TITLE,
} from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: 'PlayMechi Stream | Mechi',
};

const platformIcons: Record<string, IconType> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
};

export default function PlayMechiStreamPage() {
  return (
    <main className="page-container max-w-6xl space-y-5 py-6">
      <section className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[var(--accent-secondary-text)]">
              <MonitorPlay size={20} />
            </div>
            <p className="section-title mt-5">PlayMechi live</p>
            <h1 className="mt-2 text-[2rem] font-black leading-none text-[var(--text-primary)] sm:text-[2.75rem]">
              {ONLINE_TOURNAMENT_TITLE} streams on social.
            </h1>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Mechi.club is the tournament desk. The live video is handled by {ONLINE_TOURNAMENT_STREAMER}
              on Instagram, TikTok, and YouTube so players can watch and share from their usual apps.
            </p>
          </div>

          <Link href="/streams/dashboard" className="btn-outline text-sm">
            Streamer dashboard
            <ArrowRight size={14} />
          </Link>
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
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-[var(--accent-secondary-text)]">
                  <Icon size={18} />
                </span>
                <ExternalLink
                  size={16}
                  className="text-[var(--text-soft)] transition group-hover:text-[var(--brand-teal)]"
                />
              </div>
              <h2 className="mt-4 text-lg font-black text-[var(--text-primary)]">
                Watch on {platform.label}
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

      <section className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="section-title">Tournament desk</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
              Keep scores and rules on Mechi.
            </h2>
          </div>
          <Link href="/playmechi/tournament?game=codm" className="btn-primary text-sm">
            Open CODM desk
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {ONLINE_TOURNAMENT_GAMES.map((game) => (
            <div
              key={game.game}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-black text-[var(--text-primary)]">{game.shortLabel}</h3>
                <ShieldCheck size={16} className="text-[var(--brand-teal)]" />
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {game.dateLabel} at {game.timeLabel}. {game.format}.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
