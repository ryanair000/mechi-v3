import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  Gamepad2,
  MessageCircle,
  ShieldCheck,
  Trophy,
  UserRoundCheck,
} from 'lucide-react';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import FooterSection from '@/components/footer';

export const metadata: Metadata = {
  title: 'How PlayMechi Works | PlayMechi',
  description:
    'A clear guide to using PlayMechi for profiles, games, tournaments, match rooms, payments, results, rewards, and support.',
};

const NAV_ITEMS = [
  { href: '/', label: 'HOME' },
  { href: '/weekendcup', label: 'WEEKEND CUP' },
  { href: '/pricing', label: 'PRICING' },
  { href: '/support', label: 'SUPPORT' },
];

const PLAYER_STEPS = [
  {
    icon: UserRoundCheck,
    title: 'Create your PlayMechi account',
    copy:
      'Sign up, set your display name, and keep your player details accurate so organizers can match your tournament entry to the right gamer.',
  },
  {
    icon: Gamepad2,
    title: 'Add your games and IDs',
    copy:
      'Choose the games you play, add the correct in-game IDs, and keep the same details you will use on match day.',
  },
  {
    icon: Trophy,
    title: 'Join events or play the ladder',
    copy:
      'Enter open tournaments, queue for supported games, join lobbies, or challenge another player when the flow is available for your game.',
  },
  {
    icon: BadgeCheck,
    title: 'Check in and follow the room',
    copy:
      'Use the event page, dashboard, match room, and official PlayMechi updates for schedules, lobby details, rules, and next steps.',
  },
];

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Rules stay on the event page',
    copy:
      'Each tournament carries its own schedule, entry details, prize information, and eligibility rules before you commit.',
  },
  {
    icon: CircleDollarSign,
    title: 'Payments confirm paid slots',
    copy:
      'If an event has an entry fee, payment confirmation is what locks your slot. Never assume paid status until PlayMechi confirms it.',
  },
  {
    icon: MessageCircle,
    title: 'Support handles unclear cases',
    copy:
      'If your payment, registration, match result, or account state looks wrong, contact support with your registered details.',
  },
];

const TOURNAMENT_FLOW = [
  'Pick the tournament or weekly event you want to enter.',
  'Read the game, fee, deadline, schedule, rules, and reward eligibility.',
  'Register with the same player details you will use in-game.',
  'Pay the entry fee when the event requires payment.',
  'Watch the event page or official PlayMechi channels for room details.',
  'Play, report results when asked, and wait for organizer verification.',
];

const QUICK_LINKS = [
  {
    title: 'Weekend Cup',
    copy: 'Current featured tournament lane with game-specific registration.',
    href: '/weekendcup',
  },
  {
    title: 'Create Account',
    copy: 'Start your player profile before joining events or queues.',
    href: '/register',
  },
  {
    title: 'Pricing',
    copy: 'Compare Free, Pro, and Elite before upgrading.',
    href: '/pricing',
  },
];

export default function HowMechiWorksPage() {
  return (
    <div className="page-base marketing-prototype-shell flex min-h-screen flex-col">
      <HomeFloatingHeader navItems={NAV_ITEMS} compact />

      <main className="flex-1">
        <section className="relative min-h-[calc(100svh-7rem)] overflow-hidden">
          <Image
            src="/images/playmechi/weekend-cup-poster.png"
            alt="PlayMechi Weekend Cup poster"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-[0.42]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,17,33,0.96)_0%,rgba(11,17,33,0.86)_44%,rgba(11,17,33,0.58)_100%)]" />

          <div className="landing-shell relative flex min-h-[calc(100svh-7rem)] items-center py-16">
            <div className="max-w-3xl">
              <div className="brand-kicker">PlayMechi explained</div>
              <h1 className="mt-5 max-w-3xl text-[2.15rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[3.7rem] lg:text-[4.4rem]">
                How PlayMechi Works
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                PlayMechi is the gaming hub for player profiles, tournaments, lobbies, rewards,
                payments, results, and support. The simple version: create your account, add your
                game details, join the right event, follow the match room, and let PlayMechi keep the
                competition organized.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-primary shadow-none">
                  Create account
                  <ArrowRight size={16} />
                </Link>
                <Link href="/weekendcup" className="btn-ghost">
                  View current event
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-shell">
            <div className="max-w-2xl">
              <p className="section-title">Player flow</p>
              <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-[2.4rem]">
                Four steps from signup to match day.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                This is the clean path every player should understand before asking support,
                joining a tournament, or paying for a slot.
              </p>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-2">
              {PLAYER_STEPS.map((step, index) => {
                const Icon = step.icon;

                return (
                  <article key={step.title} className="card p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]">
                        <Icon size={20} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--accent-secondary-text)]">
                          Step {index + 1}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-[var(--text-primary)]">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {step.copy}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section pt-0">
          <div className="landing-shell">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              <div>
                <p className="section-title">Tournaments</p>
                <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-[2.3rem]">
                  What happens when you enter an event.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  PlayMechi tournaments can be free or paid. The exact games, prices, timing, prizes,
                  and eligibility rules live on the event page, so always treat that page as the
                  source of truth before you register.
                </p>
                <div className="mt-5">
                  <Link href="/weekendcup" className="brand-link inline-flex min-h-11 items-center text-sm font-semibold">
                    Open the current tournament lane
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>

              <ol className="grid gap-2.5">
                {TOURNAMENT_FLOW.map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent-primary-soft)] text-sm font-black text-[var(--brand-coral)]">
                      {index + 1}
                    </span>
                    <span className="pt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="landing-section pt-0">
          <div className="landing-shell">
            <div className="grid gap-3 lg:grid-cols-3">
              {TRUST_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.title} className="card p-5">
                    <Icon size={22} className="text-[var(--accent-secondary-text)]" aria-hidden="true" />
                    <h3 className="mt-4 text-lg font-black text-[var(--text-primary)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {item.copy}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="landing-section pt-0">
          <div className="landing-shell">
            <div className="grid gap-4 lg:grid-cols-3">
              {QUICK_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="card-hover block p-5">
                  <h3 className="text-lg font-black text-[var(--text-primary)]">{link.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{link.copy}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-secondary-text)]">
                    Open
                    <ArrowRight size={15} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterSection className="!pt-8 md:!pt-16" />
    </div>
  );
}
