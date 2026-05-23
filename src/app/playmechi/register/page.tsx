import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, Trophy } from 'lucide-react';
import FooterSection from '@/components/footer';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import {
  WEEKEND_CUP_EVENT_DATES,
  WEEKEND_CUP_PRIZE_POOL_LABEL,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';
import { ONLINE_TOURNAMENT_TITLE } from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: `Registration Closed | ${ONLINE_TOURNAMENT_TITLE}`,
  description:
    `Registration for ${ONLINE_TOURNAMENT_TITLE} is closed. Join the current ${WEEKEND_CUP_TITLE} event instead.`,
  alternates: {
    canonical: '/playmechi/register',
  },
};

const NAV_ITEMS = [
  { href: '/', label: 'HOME' },
  { href: WEEKEND_CUP_PUBLIC_PATH, label: 'WEEKEND CUP' },
  { href: '/tournaments', label: 'TOURNAMENTS' },
  { href: '/support', label: 'SUPPORT' },
];

export default function PlayMechiRegisterClosedPage() {
  return (
    <div className="page-base marketing-prototype-shell flex min-h-screen flex-col">
      <HomeFloatingHeader navItems={NAV_ITEMS} compact />

      <main className="landing-shell flex flex-1 items-center py-16">
        <section className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <div className="brand-kicker">
              <Clock size={12} aria-hidden="true" />
              Previous event
            </div>
            <h1 className="mt-5 max-w-3xl text-[2.2rem] font-black leading-tight text-[var(--text-primary)] sm:text-[4rem]">
              PlayMechi Launch registration is closed.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              The older PlayMechi Launch tournament has moved into archive mode. The current
              player lane is {WEEKEND_CUP_TITLE}, running {WEEKEND_CUP_EVENT_DATES}.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={WEEKEND_CUP_REGISTRATION_PATH} className="btn-primary">
                Register for Weekend Cup
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href={WEEKEND_CUP_PUBLIC_PATH} className="btn-outline">
                See Weekend Cup details
              </Link>
            </div>
          </div>

          <aside className="card p-5">
            <Trophy size={24} className="text-[var(--accent-secondary-text)]" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-black text-[var(--text-primary)]">
              Current event
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {WEEKEND_CUP_TITLE}. PUBG Mobile, CODM, eFootball, and Free Fire. {WEEKEND_CUP_PRIZE_POOL_LABEL}.
            </p>
            <Link href={WEEKEND_CUP_PUBLIC_PATH} className="brand-link mt-5 inline-flex text-sm font-bold">
              Open current tournament
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </aside>
        </section>
      </main>

      <FooterSection className="!pt-8 md:!pt-16" />
    </div>
  );
}
