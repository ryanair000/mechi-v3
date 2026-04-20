import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import FooterSection from '@/components/footer';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { PlatformLogo } from '@/components/PlatformLogo';
import { GAMES, PLATFORMS, getGameImage } from '@/lib/config';
import { PLANS, type Plan } from '@/lib/plans';
import type { GameKey, PlatformKey } from '@/types';

const HERO_CHIPS = [
  'Ranked matchmaking',
  'Direct challenges',
  'Multiplayer lobbies',
  'Tournament hosting',
  'Score reporting',
];

const HERO_METRICS = [
  { value: '16+', label: 'Games ready' },
  { value: '5', label: 'Platform lanes' },
  { value: '1v1 + lobby', label: 'Ways to play' },
];

const HERO_LANES = [
  {
    title: 'Ranked queue',
    copy: 'Enter the ladder fast, get matched cleanly, and keep your next step visible.',
    icon: Swords,
    tone: 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]',
  },
  {
    title: 'Direct challenges',
    copy: 'Call out another player and settle the matchup without drowning in chat threads.',
    icon: ShieldCheck,
    tone: 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]',
  },
  {
    title: 'Brackets and lobbies',
    copy: 'Host tournament runs and multiplayer rooms with updates that stay readable.',
    icon: Trophy,
    tone: 'bg-[rgba(96,165,250,0.14)] text-[#8ec5ff]',
  },
];

const EXPERIENCE_STEPS = [
  {
    step: '01',
    title: 'Build one clean profile',
    copy: 'Pick your main games, add the right platform IDs, and keep one setup ready for every competitive lane.',
    signal: 'Profile ready',
    icon: Gamepad2,
    tone: 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]',
  },
  {
    step: '02',
    title: 'Queue or challenge on demand',
    copy: 'Jump into ranked matchmaking or send a direct challenge when you already know the player you want.',
    signal: 'Match flow live',
    icon: Swords,
    tone: 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]',
  },
  {
    step: '03',
    title: 'Run cleaner group play',
    copy: 'Open lobbies and tournament brackets without turning the whole experience into a WhatsApp chase.',
    signal: 'Group play stable',
    icon: Users,
    tone: 'bg-[rgba(96,165,250,0.14)] text-[#8ec5ff]',
  },
  {
    step: '04',
    title: 'Report scores and keep climbing',
    copy: 'Lock results, surface disputes clearly, and push every completed match back into the same visible ladder.',
    signal: 'Results locked',
    icon: ShieldCheck,
    tone: 'bg-[rgba(246,196,83,0.16)] text-[#f6c453]',
  },
];

const PLATFORM_CHIPS: Array<{ platform: PlatformKey; label: string }> = [
  { platform: 'ps', label: 'PlayStation' },
  { platform: 'xbox', label: 'Xbox' },
  { platform: 'nintendo', label: 'Nintendo' },
  { platform: 'pc', label: 'PC' },
  { platform: 'mobile', label: 'Mobile' },
];

const GAME_SPOTLIGHT_KEYS: GameKey[] = [
  'efootball',
  'fc26',
  'tekken8',
  'codm',
  'pubgm',
  'valorant',
];

const PLAN_PREVIEW: Array<{
  key: Plan;
  kicker: string;
  copy: string;
  href: string;
  cta: string;
  featured?: boolean;
}> = [
  {
    key: 'free',
    kicker: 'Start the climb',
    copy: 'Open the core Mechi loop with ranked runs, tournament joins, and direct challenges.',
    href: '/register',
    cta: 'Join Free',
  },
  {
    key: 'pro',
    kicker: 'Most players will want this',
    copy: 'Unlock the regular competitive lane with more games, cleaner control, and tournament hosting.',
    href: '/pricing',
    cta: 'See Pro',
    featured: true,
  },
  {
    key: 'elite',
    kicker: 'Full access lane',
    copy: 'Go all in with priority matchmaking, zero tournament platform fee, and the strongest profile presence.',
    href: '/pricing',
    cta: 'See Elite',
  },
];

function formatGamePlatforms(platforms: PlatformKey[]) {
  return platforms.map((platform) => PLATFORMS[platform].label).join(', ');
}

const GAME_SPOTLIGHTS = GAME_SPOTLIGHT_KEYS.map((gameKey) => {
  const game = GAMES[gameKey];
  const image = getGameImage(gameKey);

  return {
    id: gameKey,
    title: game.label,
    image,
    modeLabel: game.mode === 'lobby' ? 'Lobby play' : '1v1 play',
    description:
      game.mode === 'lobby'
        ? `Open rooms for ${game.maxPlayers ?? 4} players and keep the room flow readable from invite to result.`
        : 'Queue straight into direct competitive play without losing the match context along the way.',
    platforms: formatGamePlatforms(game.platforms),
  };
});

const HERO_SHOWCASE = GAME_SPOTLIGHTS[0];

export default function LandingPage() {
  return (
    <div className="page-base">
      <HomeFloatingHeader />

      <section className="relative overflow-hidden pt-6 sm:pt-10 lg:pt-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_18%_18%,rgba(50,224,196,0.18),transparent_30%),radial-gradient(circle_at_84%_14%,rgba(255,107,107,0.18),transparent_28%),radial-gradient(circle_at_70%_78%,rgba(96,165,250,0.16),transparent_30%)]" />

        <div className="landing-shell relative">
          <div className="relative overflow-hidden rounded-[2.2rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(140deg,#08111f_0%,#0d1628_54%,#121c31_100%)] p-6 shadow-[0_28px_80px_rgba(5,10,20,0.32)] sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(130,149,176,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(130,149,176,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30 [mask-image:radial-gradient(circle_at_top,black,transparent_78%)]" />

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-start">
              <div className="max-w-2xl">
                <BrandLogo size="lg" showTagline variant="reversed" />

                <div className="mt-7 inline-flex rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/76 backdrop-blur-sm sm:text-[11px]">
                  Competitive gaming, one cleaner flow
                </div>

                <h1 className="mt-6 max-w-2xl text-[2.45rem] font-black leading-[1.02] tracking-[-0.03em] text-white sm:text-[3.5rem] lg:text-[4.35rem]">
                  One place to queue, challenge, host, and keep the climb moving.
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-7 text-white/74 sm:text-base">
                  Mechi gives competitive players across East Africa a cleaner public home for ranked
                  matchmaking, direct 1-on-1 callouts, multiplayer lobbies, tournament brackets, and
                  match results that stay readable from start to finish.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/register" className="btn-primary shadow-none">
                    Join free
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-white/14 bg-white/6 px-4 py-2 text-sm font-semibold text-white/82 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
                  >
                    See plans
                  </Link>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {HERO_CHIPS.map((chip, index) => (
                    <span
                      key={chip}
                      className={`rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-white/72 backdrop-blur-sm ${
                        index > 2 ? 'hidden sm:inline-flex' : ''
                      }`}
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-7 sm:gap-3">
                  {HERO_METRICS.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-[1.2rem] border border-white/10 bg-white/6 px-3.5 py-3 backdrop-blur-sm sm:rounded-[1.35rem] sm:px-4 sm:py-4"
                    >
                      <p className="text-base font-black text-white sm:text-[1.65rem]">{metric.value}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/58">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden gap-3 md:grid">
                <div className="relative overflow-hidden rounded-[1.85rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm sm:p-5">
                  <div className="relative min-h-[18rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a1626]">
                    {HERO_SHOWCASE?.image ? (
                      <Image
                        src={HERO_SHOWCASE.image}
                        alt={HERO_SHOWCASE.title}
                        fill
                        preload
                        sizes="(min-width: 1024px) 38vw, 100vw"
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,14,0.14)_0%,rgba(3,7,14,0.6)_44%,rgba(3,7,14,0.94)_100%)]" />

                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-teal)]">
                        Clean competitive home
                      </p>
                      <h2 className="mt-3 text-2xl font-black leading-tight text-white">
                        Built for players who want less chaos and more game time.
                      </h2>
                      <p className="mt-3 max-w-md text-sm leading-6 text-white/72">
                        Queue fast, open a direct challenge, spin up a bracket, and keep every update in
                        one readable lane.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {HERO_LANES.map((lane) => {
                    const Icon = lane.icon;

                    return (
                      <div
                        key={lane.title}
                        className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm"
                      >
                        <div className={`inline-flex rounded-2xl p-3 ${lane.tone}`}>
                          <Icon size={18} />
                        </div>
                        <h3 className="mt-4 text-sm font-black text-white">{lane.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/68">{lane.copy}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="experience" className="landing-section">
        <div className="landing-shell">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-title">Experience</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black text-[var(--text-primary)] sm:text-[2.35rem]">
                Mechi keeps the whole competitive loop visible.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              The point is not just finding a match. It is giving you one public place where setup,
              matchmaking, group play, results, and progression stay connected.
            </p>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-4">
            {EXPERIENCE_STEPS.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className={`card relative overflow-hidden p-5 sm:p-6 ${index > 1 ? 'hidden sm:block' : ''}`}
                >
                  <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(50,224,196,0.14),transparent_70%)]" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                        Step {item.step}
                      </span>
                      <span className={`inline-flex rounded-2xl p-3 ${item.tone}`}>
                        <Icon size={20} />
                      </span>
                    </div>

                    <div className="mt-6 inline-flex rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                      {item.signal}
                    </div>

                    <h3 className="mt-4 text-xl font-black text-[var(--text-primary)]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 sm:hidden">
            <Link href="/register" className="btn-outline w-full justify-center">
              See the full flow
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section id="games" className="landing-section pt-0">
        <div className="landing-shell">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-title">Games and platforms</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black text-[var(--text-primary)] sm:text-[2.35rem]">
                Football, fighters, shooters, and mobile play can live under one profile.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Use the same identity across your strongest titles, then move between ranked lanes,
              room play, and bracket runs without resetting the whole experience every time.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {PLATFORM_CHIPS.map((platform) => (
              <div
                key={platform.label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]"
              >
                <PlatformLogo platform={platform.platform} size={14} />
                {platform.label}
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {GAME_SPOTLIGHTS.map((game) => (
              <Link
                key={game.id}
                href="/games"
                className="group relative min-h-[18rem] overflow-hidden rounded-[1.7rem] border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-soft)]"
              >
                {game.image ? (
                  <Image
                    src={game.image}
                    alt={game.title}
                    fill
                    sizes="(min-width: 1280px) 28vw, (min-width: 768px) 46vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(10,16,28,0.98),rgba(24,38,60,0.92))]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/96 via-black/74 via-[48%] to-black/16" />

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/84 backdrop-blur-sm">
                      {game.modeLabel}
                    </span>
                    <span className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/84 backdrop-blur-sm">
                      {game.platforms}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-black text-white">{game.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/78">{game.description}</p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                    Explore supported titles
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-black text-[var(--text-primary)]">Need the full title list?</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                See every supported game lane, then choose the ones you want on your Mechi profile.
              </p>
            </div>
            <Link href="/games" className="btn-ghost shrink-0">
              View all games
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section id="plans" className="landing-section pt-0">
        <div className="landing-shell">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-title">Plans</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black text-[var(--text-primary)] sm:text-[2.35rem]">
                Start free, then move into the lane that matches how hard you compete.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Keep the first step easy, then unlock deeper control as you play more often, manage more
              games, and want the stronger tournament and profile benefits.
            </p>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {PLAN_PREVIEW.map((plan) => {
              const config = PLANS[plan.key];

              return (
                <article
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

                  <div className="mt-5">
                    <h3 className="text-xl font-black text-[var(--text-primary)]">{config.name}</h3>
                    <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">
                      {config.monthlyKes === 0 ? 'Free' : `KSh ${config.monthlyKes}`}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      {config.monthlyKes === 0 ? 'No payment needed' : 'per month'}
                    </p>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{plan.copy}</p>

                  <div className="mt-5 grid gap-2.5">
                    {config.features.slice(0, 4).map((feature, index) => (
                      <div
                        key={feature}
                        className={`rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] ${
                          index > 1 ? 'hidden sm:block' : ''
                        }`}
                      >
                        {feature}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
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
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex justify-start">
            <Link href="/pricing" className="brand-link inline-flex min-h-11 items-center text-sm font-semibold">
              Compare full plan details
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section pt-0">
        <div className="landing-shell">
          <div className="circuit-panel overflow-hidden rounded-[var(--radius-hero)] border border-[rgba(50,224,196,0.18)] bg-[linear-gradient(135deg,rgba(8,17,31,0.98),rgba(13,22,40,0.96))] p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] lg:items-center">
              <div className="max-w-2xl">
                <p className="section-title text-[var(--brand-teal)]">Ready to start</p>
                <h2 className="mt-3 text-3xl font-black text-white sm:text-[2.45rem]">
                  Build your profile once, then take the climb with you across every lane that matters.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/72 sm:text-base">
                  Start free, choose your main games, and step into a cleaner public home for East
                  African competitive play.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/register" className="btn-primary shadow-none">
                    Join free
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/tournaments"
                    className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-white/14 bg-white/6 px-4 py-2 text-sm font-semibold text-white/82 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Explore tournaments
                  </Link>
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  'Start with one account and your real platform IDs.',
                  'Move between ranked, direct, and group play without losing the thread.',
                  'Keep results, disputes, and progression visible from one place.',
                ].map((point) => (
                  <div
                    key={point}
                    className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-4 text-white/78 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex rounded-full bg-[rgba(50,224,196,0.14)] p-2 text-[var(--brand-teal)]">
                        <CheckCircle2 size={16} />
                      </span>
                      <p className="text-sm leading-6">{point}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
