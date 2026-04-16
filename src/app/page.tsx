import Link from 'next/link';
import { ArrowRight, Shield, Swords, Users } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { GameCarousel } from '@/components/GameCarousel';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { PlatformLogo } from '@/components/PlatformLogo';
import { TierMedal } from '@/components/TierMedal';
import { PLANS } from '@/lib/plans';
import type { PlatformKey } from '@/types';

const HERO_STATS = [
  { value: '16+', label: 'Supported titles' },
  { value: '6', label: 'Rank tiers' },
  { value: '24/7', label: 'Queue access' },
  { value: '1', label: 'Clean profile across games' },
];

const TIERS = [
  { name: 'Bronze', note: 'First tier', range: 'III / II / I', rating: 1000 },
  { name: 'Silver', note: 'Next tier up', range: 'III / II / I', rating: 1120 },
  { name: 'Gold', note: 'Mid climb', range: 'III / II / I', rating: 1320 },
  { name: 'Platinum', note: 'Upper climb', range: 'III / II / I', rating: 1520 },
  { name: 'Diamond', note: 'Near the top', range: 'III / II / I', rating: 1720 },
  { name: 'Legend', note: 'Top rank', range: 'No divisions', rating: 1900 },
];

const RANK_STEPS = [
  {
    step: 'III',
    title: 'Entry step',
    desc: 'You just landed in that tier.',
  },
  {
    step: 'II',
    title: 'Middle step',
    desc: 'You are moving through the tier.',
  },
  {
    step: 'I',
    title: 'Top step',
    desc: 'You are closest to the next tier.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Set your profile',
    desc: 'Choose your region, platforms, and games once so every queue starts with the right context.',
  },
  {
    step: '02',
    title: 'Queue with intent',
    desc: 'Join a 1v1 queue or open a lobby without chasing players across chats and side groups.',
  },
  {
    step: '03',
    title: 'Lock results and rise',
    desc: 'Report the outcome, keep the match protected, and move forward with visible progression.',
  },
];

const TRUST_PILLARS = [
  {
    icon: Swords,
    title: 'Straight to the match',
    desc: 'Less side noise, less back-and-forth, more time actually getting into the game.',
  },
  {
    icon: Shield,
    title: 'Wins that feel legit',
    desc: 'Scores get confirmed, disputes can be handled, and your results do not feel random.',
  },
  {
    icon: Users,
    title: 'Your people in one place',
    desc: 'Profiles, queues, and shares keep your scene connected without turning everything into a mess.',
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
    description: 'Build your profile, queue your main game, and get into ranked play without paying to enter.',
    href: '/register',
    cta: 'START FREE',
    featured: false,
  },
  {
    key: 'pro',
    kicker: 'MOST POPULAR',
    description: 'Unlimited ranked play, more game slots, and a cleaner competitive grind for regular players.',
    href: '/pricing',
    cta: 'SEE PRO',
    featured: true,
  },
] as const;

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

              <h1 className="mt-6 max-w-2xl text-[2.05rem] font-black leading-[1.04] tracking-normal text-[var(--text-primary)] sm:text-[3.2rem] sm:leading-[1.02] lg:text-[3.8rem]">
                Find the lobby. Lock the 1v1. Run the bracket.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                Mechi cuts the WhatsApp chaos for Kenyan players. Build your profile,
                queue clean 1v1s, spin up proper lobbies, host tournaments fast, and
                let players grow the prize pool while Mechi handles results, rankings,
                and automatic winner payouts.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-primary shadow-none">
                  Start competing
                  <ArrowRight size={16} />
                </Link>
                <Link href="#how-it-works" className="btn-ghost">
                  See how it works
                </Link>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[rgba(10,18,31,0.22)] p-4 sm:p-5 lg:mt-3">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="section-title">Quick read</p>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
                    One side of the hero should tell the whole story fast: supported titles, ranked structure, always-on queueing, and where players can show up.
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
              <h2 className="mt-3 max-w-xl text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                Set up quick. Get matched. Start climbing.
              </h2>
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {STEPS.map((item) => (
              <div key={item.step} className="card p-5">
                <div className="section-title">{item.step}</div>
                <h3 className="mt-3 text-base font-black text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="landing-section">
        <div className="landing-shell grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <p className="section-title">Why it works</p>
            <h2 className="mt-3 max-w-lg text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
              No chaos. Just good matches.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              You should know where to tap, get into a match fast, and trust the result after.
              That is the whole point.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { value: 'Clean', label: 'Match flow' },
                { value: 'Quick', label: 'Queue up' },
                { value: 'Real', label: 'Progress' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3"
                >
                  <div className="text-sm font-black text-[var(--text-primary)]">{item.value}</div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            {TRUST_PILLARS.map((item, index) => (
              <div
                key={item.title}
                className={`flex gap-4 px-5 py-4 sm:px-6 ${
                  index !== TRUST_PILLARS.length - 1 ? 'border-b border-[var(--border-color)]' : ''
                }`}
              >
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    index === 1
                      ? 'bg-[rgba(255,107,107,0.14)] text-[#c95252]'
                      : 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                  }`}
                >
                  <item.icon size={17} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.desc}</p>
                </div>
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
                  Keep the spotlight on the titles you actually play.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                  Football, fighters, sports, and mobile play can live under one cleaner identity
                  without turning your profile into a cluttered wall of disconnected records.
                </p>

                <div className="mt-5">
                  <GameCarousel />
                  <p className="mt-3 text-xs text-[var(--text-soft)]">
                    Plus Mario Kart, Smash Bros, Free Fire, PUBG Mobile and more.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  {
                    label: 'Focused setup',
                    value: 'Up to 3 mains',
                    tone: 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]',
                  },
                  {
                    label: 'Cross-title identity',
                    value: '1 clean profile',
                    tone: 'bg-[rgba(96,165,250,0.14)] text-[#60a5fa]',
                  },
                  {
                    label: 'Queue ready',
                    value: 'Console, PC, mobile',
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
                Start free now. Grow into more when your scene needs it.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              The core Mechi experience stays open for players. Bigger community setups and extra
              polish can layer on top without slowing down the main grind.
            </p>
          </div>

          <div className="mt-7 grid gap-3 lg:grid-cols-2">
            {PRICING_PLANS.map((plan) => {
              const config = PLANS[plan.key];

              return (
                <div
                  key={plan.key}
                  className={`card flex h-full flex-col p-5 sm:p-6 ${
                    plan.featured ? 'circuit-panel border-[rgba(50,224,196,0.26)]' : ''
                  }`}
                >
                  <span
                    className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      plan.featured
                        ? 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
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
                    {config.features.slice(0, 3).map((feature) => (
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
                      className={plan.featured ? 'btn-primary w-full justify-center' : 'btn-outline w-full justify-center'}
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
            <div>
              <p className="section-title">Ranks</p>
              <h2 className="mt-3 max-w-lg text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                A climb you can read instantly.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                No hidden math on the surface. Every badge shows your tier plus your step inside
                that tier. Bronze II means Bronze tier, middle step. Gold I means top step in Gold.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { value: '6', label: 'Main tiers' },
                  { value: 'III / II / I', label: 'Steps per tier' },
                  { value: 'Legend', label: 'Top rank' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3"
                  >
                    <div className="text-sm font-black text-[var(--text-primary)]">{item.value}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card overflow-hidden p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-md">
                  <p className="section-title">How the climb works</p>
                  <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
                    Tier + step = your rank
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Learn the pattern once and every badge makes sense fast. The tier tells you the
                    league you are in. The Roman numeral tells you how close you are to the next tier.
                  </p>
                </div>
                <div className="brand-chip-coral gap-2 self-start">
                  <TierMedal rating={1900} size="sm" />
                  <span>Legend is the top</span>
                </div>
              </div>

              <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
                {RANK_STEPS.map((item) => (
                  <div
                    key={item.step}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)] text-sm font-black text-[var(--accent-secondary-text)]">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-2.5">
                {TIERS.map((tier) => (
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
                    <span className="text-xs font-medium text-[var(--text-soft)]">{tier.range}</span>
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
              <p className="section-title">Ready to jump in</p>
              <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-[2.2rem]">
                Pick your games. Queue up. Start climbing.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Set up your profile and get into matches that feel clean,
                competitive, and easy to follow.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:mt-0 lg:items-end">
              <Link href="/register" className="btn-primary shadow-none">
                Start free
                <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="brand-link inline-flex min-h-11 items-center text-sm font-semibold">
                Already on Mechi? Jump back in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border-color)] py-7">
        <div className="landing-shell flex flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandLogo size="xs" />
          <p className="text-center text-xs text-[var(--text-soft)]">
            Copyright {new Date().getFullYear()} Mechi. Competitive gaming for players who want organized play.
          </p>
          <div className="flex gap-5">
            <Link href="/login" className="brand-link inline-flex min-h-11 min-w-11 items-center justify-center text-xs font-semibold">
              Sign in
            </Link>
            <Link href="/register" className="brand-link inline-flex min-h-11 min-w-11 items-center justify-center text-xs font-semibold">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
