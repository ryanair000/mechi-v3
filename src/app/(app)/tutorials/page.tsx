import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  Gamepad2,
  MessageCircle,
  ShieldCheck,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';

const quickRoute = [
  {
    title: 'Save one game',
    body: 'Add the right platform and player ID first.',
    icon: Gamepad2,
  },
  {
    title: 'Choose your lane',
    body: 'Queue, challenge, lobby, or tournament.',
    icon: Trophy,
  },
  {
    title: 'Report cleanly',
    body: 'That is what updates rank, XP, and streaks.',
    icon: ShieldCheck,
  },
] as const;

const gettingStartedSteps = [
  {
    step: '01',
    title: 'Set up your game',
    body: 'Save the title, platform, and player ID you actually use.',
  },
  {
    step: '02',
    title: 'Open dashboard',
    body: 'Use it as your launch pad for the fastest next action.',
  },
  {
    step: '03',
    title: 'Pick a format',
    body: 'Queue for speed, or open direct and group modes from there.',
  },
  {
    step: '04',
    title: 'Report the result',
    body: 'Finish the flow so your progress locks in cleanly.',
  },
] as const;

const playOptions = [
  {
    title: 'Queue',
    description: 'Fast ranked 1v1.',
    href: '/queue',
    icon: Trophy,
  },
  {
    title: 'Challenges',
    description: 'Direct one-player callout.',
    href: '/challenges',
    icon: MessageCircle,
  },
  {
    title: 'Lobbies',
    description: 'Open rooms for group play.',
    href: '/lobbies',
    icon: BellRing,
  },
  {
    title: 'Tournaments',
    description: 'Bracket-based events.',
    href: '/tournaments',
    icon: Swords,
  },
] as const;

const matchFlow = [
  {
    step: '01',
    title: 'Find',
    body: 'Open the format that matches the game you want.',
  },
  {
    step: '02',
    title: 'Play',
    body: 'Run the set in the agreed format.',
  },
  {
    step: '03',
    title: 'Report',
    body: 'Submit the result so Mechi can update your progress.',
  },
] as const;

const goodHabits = ['Use real IDs', 'Stay alert', 'Finish reports'] as const;

export default function TutorialsPage() {
  return (
    <div className="page-container py-4 sm:py-6 xl:py-0">
      <section className="space-y-4 xl:space-y-3">
        <div className="card circuit-panel overflow-hidden rounded-[8px] p-5 sm:p-6 lg:p-7 xl:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <span className="brand-kicker">Player guide</span>

              <h1 className="mt-5 max-w-2xl text-[2.2rem] font-black leading-[0.95] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[3rem] xl:text-[3.6rem]">
                Tutorials, grouped so the page feels fast.
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)] sm:text-base">
                Mechi is your home for ranked queue, direct challenges, lobbies, and tournaments.
                Instead of a long scroll, the key tutorial actions are grouped into cards you can
                scan quickly.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 xl:shrink-0">
              <Link href="/games" className="btn-primary">
                Set up games
                <ArrowRight size={14} />
              </Link>
              <Link href="/dashboard" className="btn-outline">
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {quickRoute.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3"
                >
                  <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
                    <Icon size={15} />
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em]">Route</p>
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm xl:hidden">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <article id="start-flow" className="card scroll-mt-24 rounded-[8px] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
              <Gamepad2 size={16} />
              <p className="section-title !mb-0">Start here</p>
            </div>

            <h2 className="mt-3 text-[1.15rem] font-black leading-tight text-[var(--text-primary)]">
              Get match-ready in order.
            </h2>

            <div className="mt-4 space-y-2.5">
              {gettingStartedSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="brand-chip shrink-0">{item.step}</span>
                    <div>
                      <p className="text-sm font-semibold leading-5 text-[var(--text-primary)]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm xl:hidden">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card rounded-[8px] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[var(--brand-coral)]">
              <Trophy size={16} />
              <p className="section-title !mb-0">Play options</p>
            </div>

            <h2 className="mt-3 text-[1.15rem] font-black leading-tight text-[var(--text-primary)]">
              Pick the format that matches your mood.
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {playOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <Link
                    key={option.title}
                    href={option.href}
                    className="group rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 transition-colors hover:border-[rgba(50,224,196,0.2)] hover:bg-[var(--surface)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[rgba(255,107,107,0.18)] bg-[rgba(255,107,107,0.12)] text-[var(--brand-coral)]">
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-5 text-[var(--text-primary)]">
                            {option.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm xl:hidden">
                            {option.description}
                          </p>
                        </div>
                      </div>

                      <ArrowRight
                        size={14}
                        className="mt-1 shrink-0 text-[var(--text-soft)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </article>

          <article className="card surface-live rounded-[8px] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
              <Zap size={16} />
              <p className="section-title !mb-0">Match flow</p>
            </div>

            <h2 className="mt-3 text-[1.15rem] font-black leading-tight text-[var(--text-primary)]">
              Every match follows one clean loop.
            </h2>

            <div className="mt-4 space-y-3">
              {matchFlow.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="brand-chip shrink-0">{item.step}</span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm xl:hidden">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] xl:hidden">
              Clean reports are what move rank, XP, and streaks forward.
            </p>

            <div className="mt-5 border-t border-[var(--border-color)] pt-4">
              <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
                <BellRing size={16} />
                <p className="section-title !mb-0">Good habits</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {goodHabits.map((habit) => (
                  <span key={habit} className="brand-chip">
                    {habit}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
