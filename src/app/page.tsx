import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import FooterSection from '@/components/footer';
import { GameCarousel } from '@/components/GameCarousel';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { PlatformLogo } from '@/components/PlatformLogo';
import { TierMedal } from '@/components/TierMedal';
import { PLANS } from '@/lib/plans';
import type { PlatformKey } from '@/types';

const HERO_STATS = [
  { value: '16+', label: 'Supported titles' },
  { value: '1v1', label: 'Ranked direct challenges' },
  { value: '24/7', label: 'Queue access' },
  { value: 'KES 299', label: 'Pro monthly' },
];

const LAUNCH_CHIPS = [
  'Open to first 100 players',
  '50 more players to close registration',
  'Registration closes in 20 days',
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Build one clean setup',
    desc: 'Pick your games, link your platform IDs, and let Mechi keep your profile ready for queues, direct challenges, and brackets.',
  },
  {
    step: '02',
    title: 'Queue or call someone out',
    desc: 'Run ranked matchmaking when you want a fast lobby, or challenge any player directly without waiting on random pairing.',
  },
  {
    step: '03',
    title: 'Create smarter tournaments',
    desc: 'Host paid or free-entry brackets, keep players informed, and let the bracket update itself as results come in.',
  },
  {
    step: '04',
    title: 'Lock scores and keep moving',
    desc: 'Football titles use scorelines, disputes stay visible, and every completed match feeds the same climb and notification system.',
  },
];

const PLATFORM_CHIPS: Array<{ platform: PlatformKey; label: string }> = [
  { platform: 'ps', label: 'PlayStation' },
  { platform: 'xbox', label: 'Xbox' },
  { platform: 'nintendo', label: 'Nintendo' },
  { platform: 'pc', label: 'PC' },
  { platform: 'mobile', label: 'Mobile' },
];

const PRICING_PLANS = [
  {
    key: 'free',
    kicker: 'START HERE',
    description:
      'Keep the core open with ranked runs, tournament joins, and direct 1-on-1 challenges while you test the waters.',
    href: '/register',
    cta: 'JOIN FREE',
    featured: false,
  },
  {
    key: 'pro',
    kicker: 'MOST POPULAR',
    description:
      'KES 299/month after the 1-month trial. Unlimited ranked play, 3 saved games, direct challenges, and free-entry tournament hosting.',
    href: '/pricing',
    cta: 'SEE PRO',
    featured: true,
  },
  {
    key: 'elite',
    kicker: 'ALL ACCESS',
    description:
      'KES 999/month for players who want the full stack: zero tournament fee, a gold badge, early access, and streaming feature access.',
    href: '/pricing',
    cta: 'SEE ELITE',
    featured: false,
  },
] as const;

const RANK_GUIDE = [
  {
    title: 'See your main tier first',
    copy: 'Bronze, Silver, Gold, Platinum, Diamond, and Legend tell you where you sit at a glance.',
  },
  {
    title: 'Use III / II / I as progress steps',
    copy: 'III means you just landed there. I means you are one clean push away from the next tier.',
  },
  {
    title: 'Legend stays the finish line',
    copy: 'No extra step math there. If you hit Legend, everyone knows exactly what that means.',
  },
];

const RANK_TIERS = [
  { name: 'Bronze', note: 'Starting climb', rating: 1000 },
  { name: 'Silver', note: 'Settling in', rating: 1120 },
  { name: 'Gold', note: 'Momentum tier', rating: 1320 },
  { name: 'Platinum', note: 'Sharp players', rating: 1520 },
  { name: 'Diamond', note: 'Near the top', rating: 1720 },
  { name: 'Legend', note: 'Top ladder', rating: 1900 },
];

const COUNTDOWN_BLOCKS = [
  { value: '20', label: 'Days left' },
  { value: '50', label: 'Spots left' },
  { value: '100', label: 'Player cap' },
];

export default function LandingPage() {
  return (
    <div className="page-base">
      <HomeFloatingHeader />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-[10%] top-10 hidden h-56 w-56 rounded-full bg-[rgba(50,224,196,0.1)] blur-[110px] sm:block" />
        <div className="pointer-events-none absolute right-[12%] top-14 hidden h-52 w-52 rounded-full bg-[rgba(255,107,107,0.1)] blur-[96px] sm:block" />

        <div className="landing-shell relative pb-10 pt-6 sm:pb-14 sm:pt-12 lg:pb-18 lg:pt-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] lg:items-start lg:gap-10">
            <div className="max-w-2xl">
              <BrandLogo size="lg" showTagline />

              <div className="mt-6 brand-kicker">
                <Zap size={12} />
                Beta V3
              </div>

              <h1 className="mt-6 max-w-2xl text-[2.05rem] font-black leading-[1.04] tracking-normal text-[var(--text-primary)] sm:text-[3.2rem] sm:leading-[1.02] lg:text-[3.8rem]">
                Find the lobby. Start competing. Lock the 1-on-1.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                Mechi V3 cuts the WhatsApp chaos for players who want cleaner queues, direct challenges,
                real tournament flow, confirmed scorelines, and updates that actually tell you what is going on.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-primary shadow-none">
                  Start competing
                  <ArrowRight size={16} />
                </Link>
                <Link href="/pricing" className="btn-ghost">
                  See pricing
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {LAUNCH_CHIPS.map((chip) => (
                  <span key={chip} className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[rgba(10,18,31,0.22)] p-4 sm:p-5 lg:mt-3">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="section-title">Quick read</p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
                    Beta V3 is built for players who want to queue, challenge, host, report, and keep moving without guessing what happens next.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {HERO_STATS.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3 sm:px-4 sm:py-4"
                    >
                      <div className="text-lg font-black text-[var(--text-primary)] sm:text-[1.75rem]">
                        {item.value}
                      </div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)] sm:text-[11px]">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
                    Platforms live
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {PLATFORM_CHIPS.map((platform) => (
                      <div
                        key={platform.label}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]"
                      >
                        <PlatformLogo platform={platform.platform} size={13} />
                        {platform.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="landing-section">
        <div className="landing-shell">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-title">How it works</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                V3 keeps every competitive move in one cleaner loop.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Set up once, play how you want, and stay informed at every step instead of chasing updates across chats.
            </p>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="card p-5">
                <div className="section-title">{item.step}</div>
                <h3 className="mt-3 text-base font-black text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="supported" className="landing-section">
        <div className="landing-shell">
          <div className="card circuit-panel p-6 sm:p-7">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div>
                <p className="section-title">Games only</p>
                <h2 className="mt-3 max-w-lg text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                  Keep the spotlight on the titles you actually grind.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                  Football, fighters, sports, and mobile play can sit under one cleaner identity without turning your profile into a cluttered wall.
                </p>

                <div className="mt-5">
                  <GameCarousel />
                  <p className="mt-3 text-xs text-[var(--text-soft)]">
                    Plus Fortnite, Mario Kart, Smash Bros, Free Fire, PUBG Mobile and more.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  {
                    label: 'Direct calls',
                    value: 'Challenge any player',
                    tone: 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]',
                  },
                  {
                    label: 'Tournament flow',
                    value: 'Paid or free entry',
                    tone: 'bg-[rgba(96,165,250,0.14)] text-[#60a5fa]',
                  },
                  {
                    label: 'Result lock',
                    value: 'Scorelines + disputes',
                    tone: 'bg-[rgba(255,107,107,0.14)] text-[#ff8a8a]',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4 sm:p-5"
                  >
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${item.tone}`}>
                      {item.label}
                    </span>
                    <p className="mt-4 text-lg font-black text-[var(--text-primary)]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="landing-section">
        <div className="landing-shell">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-title">Pricing</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                Start free now. Move into Pro or Elite when the grind gets serious.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              New signups begin with a 1-month Pro trial. After that, Pro keeps the regular climb moving at KES 299, and Elite opens the all-access lane at KES 999.
            </p>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-3">
            {PRICING_PLANS.map((plan) => {
              const config = PLANS[plan.key];

              return (
                <div
                  key={plan.key}
                  className={`card flex h-full flex-col p-5 sm:p-6 ${
                    plan.featured
                      ? 'circuit-panel border-[rgba(50,224,196,0.26)]'
                      : plan.key === 'elite'
                        ? 'border-[rgba(246,196,83,0.28)]'
                        : ''
                  }`}
                >
                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      plan.featured
                        ? 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                        : plan.key === 'elite'
                          ? 'bg-[rgba(246,196,83,0.14)] text-[#b88919]'
                          : 'bg-[var(--surface-strong)] text-[var(--text-soft)]'
                    }`}
                  >
                    {plan.kicker}
                  </span>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-[var(--text-primary)]">{config.name}</h3>
                      <p className="mt-1 text-3xl font-black text-[var(--text-primary)]">
                        {config.monthlyKes === 0 ? 'FREE' : `KSH ${config.monthlyKes}`}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        {config.monthlyKes === 0 ? 'No payment needed' : 'per month'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{plan.description}</p>

                  <div className="mt-5 grid gap-2.5">
                    {config.features.slice(0, 4).map((feature) => (
                      <div
                        key={feature}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)]"
                      >
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Link
                      href={plan.href}
                      className={
                        plan.featured
                          ? 'btn-primary w-full justify-center'
                          : plan.key === 'elite'
                            ? 'btn-ghost w-full justify-center'
                            : 'btn-outline w-full justify-center'
                      }
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="ranks" className="landing-section">
        <div className="landing-shell">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
            <div>
              <p className="section-title">Ranks</p>
              <h2 className="mt-3 max-w-lg text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                A climb you can read instantly.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                No hidden math on the surface. The big tier tells you the league. The Roman numeral tells you how close you are to the next jump.
              </p>

              <div className="mt-5 space-y-3">
                {RANK_GUIDE.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
                    <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card overflow-hidden p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-title">Tier ladder</p>
                  <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
                    Bronze to Legend
                  </h3>
                </div>
                <div className="brand-chip-coral gap-2 self-start">
                  <TierMedal rating={1900} size="sm" />
                  <span>Legend is the top</span>
                </div>
              </div>

              <div className="mt-5 grid gap-2.5">
                {RANK_TIERS.map((tier) => (
                  <div
                    key={tier.name}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <TierMedal rating={tier.rating} size="sm" />
                      <div>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{tier.name}</span>
                        <p className="text-[11px] text-[var(--text-soft)]">{tier.note}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[var(--text-soft)]">
                      {tier.name === 'Legend' ? 'Top rank' : 'III / II / I'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-shell">
          <div className="card circuit-panel p-6 sm:p-7 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div className="max-w-2xl">
              <p className="section-title">Countdown</p>
              <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                Beta V3 registration closes May 7, 2026.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Open to the first 100 players. Right now there are 50 spots left before the gate shuts on this beta run.
              </p>
            </div>

            <div className="mt-5 grid flex-1 gap-3 sm:grid-cols-3 lg:mt-0 lg:max-w-xl">
              {COUNTDOWN_BLOCKS.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-4 text-center">
                  <p className="text-3xl font-black text-[var(--text-primary)]">{item.value}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section pt-0">
        <div className="landing-shell">
          <div className="card circuit-panel p-6 sm:p-7 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div className="max-w-2xl">
              <p className="section-title">Ready to jump in</p>
              <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                Pick your games. Queue up. Start climbing.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Set up your profile, take the 1-month Pro trial, and see how clean V3 feels when the flow actually keeps you informed.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:mt-0 lg:items-end">
              <Link href="/register" className="btn-primary shadow-none">
                Start free
                <ArrowRight size={16} />
              </Link>
              <Link href="/pricing" className="brand-link inline-flex min-h-11 items-center text-sm font-semibold">
                Compare Free, Pro, and Elite
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
