import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MonitorPlay } from 'lucide-react';
import {
  ONLINE_TOURNAMENT_EVENT_DATES,
  ONLINE_TOURNAMENT_GAME_LIST_LABEL,
  ONLINE_TOURNAMENT_TITLE,
} from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: 'Stream | Mechi',
};

export default function StreamsPage() {
  return (
    <div className="page-container flex min-h-[calc(100vh-5rem)] items-center">
      <Link
        href="/streams/playmechi"
        className="group relative block min-h-[28rem] w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-cover bg-center text-white shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(50,224,196,0.28)] hover:shadow-[0_28px_80px_rgba(0,0,0,0.34)]"
        style={{ backgroundImage: "url('/dashboard-promos/playmechi-upcoming-stream.jpg')" }}
        aria-label="Open PlayMechi stream"
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.9),rgba(3,7,18,0.58)_46%,rgba(3,7,18,0.18))]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

        <div className="relative z-10 flex min-h-[28rem] flex-col justify-between p-5 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="brand-chip px-2.5 py-1 text-[10px]">PlayMechi live</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/80 backdrop-blur-md">
              {ONLINE_TOURNAMENT_EVENT_DATES}
            </span>
          </div>

          <div className="max-w-2xl">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-md">
              <MonitorPlay size={22} />
            </div>
            <p className="section-title text-white/70">Stream</p>
            <h1 className="mt-3 text-[2.2rem] font-black leading-[0.98] text-white sm:text-[3.2rem]">
              {ONLINE_TOURNAMENT_TITLE}
            </h1>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/78 sm:text-base">
              {ONLINE_TOURNAMENT_GAME_LIST_LABEL} go live from the PlayMechi stage at 8:00 PM EAT.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/70">
              Open stream
            </span>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition group-hover:translate-x-1 group-hover:border-[var(--brand-teal)] group-hover:text-[var(--brand-teal)]">
              <ArrowRight size={20} />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
