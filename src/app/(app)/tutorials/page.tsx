import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  CirclePlay,
  Gamepad2,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

const QUICK_ROUTE = [
  {
    step: '01',
    title: 'Lock your setup',
    body: 'Pick your game, choose the platform, and save the right player ID.',
  },
  {
    step: '02',
    title: 'Choose how you want to play',
    body: 'Queue for ranked, send a challenge, join a lobby, or enter a tournament.',
  },
  {
    step: '03',
    title: 'Watch for the handoff',
    body: 'When Mechi finds action, open the match fast and get into the room.',
  },
  {
    step: '04',
    title: 'Finish the result properly',
    body: 'A clean report keeps your rank, streak, XP, and progress moving.',
  },
] as const;

const START_STEPS = [
  {
    step: '01',
    title: 'Open Games first',
    body: 'This is your real start. Add the title you play, choose the correct platform, then save the ID people will use.',
    href: '/games',
    cta: 'Open Games',
    icon: Gamepad2,
  },
  {
    step: '02',
    title: 'Go back to Dashboard',
    body: 'Dashboard is your launch pad. It is where Mechi points you to the fastest next move.',
    href: '/dashboard',
    cta: 'Open Dashboard',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Pick the right page',
    body: 'Queue for ranked speed, Challenges for direct callouts, Lobbies for rooms, or Tournaments for brackets.',
    href: '/queue',
    cta: 'Try Queue',
    icon: Trophy,
  },
  {
    step: '04',
    title: 'Open the match and report it clean',
    body: 'Once the match lands, move fast, play, then finish the result flow so the app can update everything properly.',
    href: '/notifications',
    cta: 'Open Notifications',
    icon: BellRing,
  },
] as const;

const PLAY_MODES = [
  {
    title: 'I want ranked action',
    body: 'Use Queue when you want the fastest official 1v1 on your saved setup.',
    href: '/queue',
    cta: 'Open Queue',
    icon: Trophy,
    chip: 'Fastest route',
    chipTone: 'brand-chip-coral',
  },
  {
    title: 'I want one specific person',
    body: 'Use Challenges when you already know who you want to play and need a clean accept or decline flow.',
    href: '/challenges',
    cta: 'Open Challenges',
    icon: MessageCircle,
    chip: 'Direct match',
    chipTone: 'brand-chip',
  },
  {
    title: 'I want a room vibe',
    body: 'Use Lobbies when you want open rooms, casual sessions, or a space other players can join.',
    href: '/lobbies',
    cta: 'Open Lobbies',
    icon: Users,
    chip: 'Room-based',
    chipTone: 'brand-chip',
  },
  {
    title: 'I want bracket energy',
    body: 'Use Tournaments when you want fixed rounds, slots, and a more competitive event feel.',
    href: '/tournaments',
    cta: 'Open Tournaments',
    icon: Swords,
    chip: 'Structured play',
    chipTone: 'brand-chip-coral',
  },
] as const;

const SCREEN_PREVIEWS = [
  {
    title: 'Games page',
    label: 'First screen to open',
    href: '/games',
    cta: 'Set up games',
    tint: 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]',
    rows: [
      { title: 'Choose game', copy: 'Pick the title you really play.' },
      { title: 'Choose platform', copy: 'Make sure the matchup lane is right.' },
      { title: 'Save ID', copy: 'Add the name or code opponents need.' },
    ],
  },
  {
    title: 'Queue + alerts',
    label: 'Fastest match flow',
    href: '/queue',
    cta: 'Try queue',
    tint: 'bg-[rgba(255,107,107,0.12)] text-[var(--brand-coral)]',
    rows: [
      { title: 'Join queue', copy: 'Mechi starts looking immediately.' },
      { title: 'Watch notifications', copy: 'Stay ready for the match ping.' },
      { title: 'Open the match', copy: 'Move quickly when it lands.' },
    ],
  },
  {
    title: 'Result report',
    label: 'Where progress gets locked',
    href: '/leaderboard',
    cta: 'See ranks',
    tint: 'bg-[rgba(96,165,250,0.13)] text-[#4f8fe7]',
    rows: [
      { title: 'Confirm the outcome', copy: 'Winner and score must be right.' },
      { title: 'Avoid disputes', copy: 'Clean reports save time for everyone.' },
      { title: 'Get the update', copy: 'Rank, streak, XP, and MP all move here.' },
    ],
  },
] as const;

const FIRST_DAY_CHECKLIST = [
  'Pick your main game before doing anything else.',
  'Choose the correct platform for every saved game.',
  'Double-check the player ID opponents will use.',
  'Turn on notifications so match alerts do not miss you.',
  'Finish your first result report fully after the match ends.',
] as const;

const SMART_TIPS = [
  {
    title: 'Start small',
    body: 'One saved game and one clean first match beats trying to set up everything in one sitting.',
  },
  {
    title: 'Keep it real',
    body: 'Use the exact username, platform, and game ID you actually play on. Wrong setup creates bad handoffs.',
  },
  {
    title: 'Move quick on alerts',
    body: 'The faster you respond to match alerts, the smoother the whole Mechi experience feels.',
  },
] as const;

const MISTAKES = [
  'Saving the wrong platform for a game.',
  'Using an old or incomplete player ID.',
  'Ignoring notifications after joining queue.',
  'Leaving a match without finishing the report flow.',
] as const;

export default function TutorialsPage() {
  return (
    <div className="page-container">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]">
          <div className="max-w-3xl">
            <span className="brand-kicker">
              <CirclePlay size={14} />
              New Player Guide
            </span>

            <h1 className="mt-4 text-[1.95rem] font-black leading-[1.01] text-[var(--text-primary)] sm:text-[2.9rem]">
              Learn Mechi fast without reading a boring manual.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-[1rem]">
              This page is built for your first day: what to tap first, where to go next, and how
              to avoid the mistakes that make a new account feel confusing.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/games" className="btn-primary">
                Start with Games
                <ArrowRight size={14} />
              </Link>
              <Link href="/dashboard" className="btn-outline">
                Open Dashboard
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { href: '#start-flow', label: 'First match flow' },
                { href: '#pick-lane', label: 'Pick your lane' },
                { href: '#what-you-see', label: 'What pages do' },
                { href: '#checklist', label: 'Checklist' },
              ].map((item) => (
                <a key={item.href} href={item.href} className="tutorial-anchor">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="tutorial-stage">
            <div className="tutorial-stage-glow tutorial-stage-glow-teal" />
            <div className="tutorial-stage-glow tutorial-stage-glow-coral" />

            <div className="relative z-[1]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    2 minute map
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
                    Your fastest route to a real match
                  </h2>
                </div>
                <span className="brand-chip-coral">Zero fluff</span>
              </div>

              <div className="mt-5 space-y-3">
                {QUICK_ROUTE.map((item) => (
                  <div key={item.step} className="tutorial-stage-step">
                    <div className="tutorial-step-badge">{item.step}</div>
                    <div>
                      <h3 className="text-sm font-black text-[var(--text-primary)]">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="start-flow"
        className="mt-5 grid scroll-mt-24 gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]"
      >
        <div className="card p-5 sm:p-6">
          <div className="max-w-2xl">
            <p className="section-title">The clean start</p>
            <h2 className="mt-2 text-[1.55rem] font-black text-[var(--text-primary)] sm:text-[1.95rem]">
              Your first match in 4 easy moves.
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {START_STEPS.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                          Step {item.step}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-[var(--text-primary)]">
                          {item.title}
                        </h3>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                          {item.body}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={item.href}
                      className="btn-outline shrink-0 justify-center sm:min-w-[10rem]"
                    >
                      {item.cta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div id="checklist" className="card scroll-mt-24 p-5">
            <p className="section-title">First day checklist</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Do these and you are set.
            </h2>

            <div className="mt-4 space-y-3">
              {FIRST_DAY_CHECKLIST.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5"
                >
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-[var(--accent-secondary-text)]"
                  />
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <p className="section-title">Low-stress tips</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              Keep your start smooth.
            </h2>

            <div className="mt-4 space-y-3">
              {SMART_TIPS.map((tip) => (
                <div
                  key={tip.title}
                  className="rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-[var(--accent-secondary-text)]" />
                    <p className="font-semibold text-[var(--text-primary)]">{tip.title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{tip.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-[var(--brand-coral)]" />
              <p className="section-title">Common misses</p>
            </div>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              These are what trip new users up.
            </h2>

            <div className="mt-4 space-y-2.5">
              {MISTAKES.map((item) => (
                <div key={item} className="tutorial-warning">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand-coral)]" />
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pick-lane" className="mt-5 scroll-mt-24 card p-5 sm:p-6">
        <div className="max-w-2xl">
          <p className="section-title">Pick your lane</p>
          <h2 className="mt-2 text-[1.45rem] font-black text-[var(--text-primary)] sm:text-[1.85rem]">
            What are you trying to do right now?
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Open the page that matches your mood instead of guessing. This is the fastest way to
            stop the app from feeling overwhelming.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PLAY_MODES.map((mode) => {
            const Icon = mode.icon;

            return (
              <div
                key={mode.title}
                className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.12)] text-[var(--brand-coral)]">
                    <Icon size={17} />
                  </div>
                  <span className={mode.chipTone}>{mode.chip}</span>
                </div>
                <h3 className="mt-4 text-lg font-black text-[var(--text-primary)]">{mode.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{mode.body}</p>
                <Link
                  href={mode.href}
                  className="brand-link mt-4 inline-flex items-center gap-2 text-sm font-semibold"
                >
                  {mode.cta}
                  <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section id="what-you-see" className="mt-5 scroll-mt-24 card p-5 sm:p-6">
        <div className="max-w-2xl">
          <p className="section-title">What the pages actually do</p>
          <h2 className="mt-2 text-[1.45rem] font-black text-[var(--text-primary)] sm:text-[1.85rem]">
            Think of these as quick screen previews.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            You do not need to memorize every page. Just remember what kind of action each one is
            built for.
          </p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {SCREEN_PREVIEWS.map((preview) => (
            <div key={preview.title} className="tutorial-preview">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    {preview.label}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[var(--text-primary)]">
                    {preview.title}
                  </h3>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${preview.tint}`}>
                  Preview
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {preview.rows.map((row, index) => (
                  <div key={row.title} className="tutorial-preview-row">
                    <div className="tutorial-preview-bar" style={{ width: `${82 - index * 11}%` }} />
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {row.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                          {row.copy}
                        </p>
                      </div>
                      <div className="tutorial-preview-dot" />
                    </div>
                  </div>
                ))}
              </div>

              <Link href={preview.href} className="btn-outline mt-4 justify-center">
                {preview.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="card surface-live p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="section-title">Need the shortest version?</p>
              <h2 className="mt-2 text-[1.35rem] font-black text-[var(--text-primary)] sm:text-[1.7rem]">
                Games, then dashboard, then your first match.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                If you remember nothing else, remember that order. Once your setup is correct,
                Mechi starts feeling easy very quickly.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/games" className="btn-primary">
                Start with Games
              </Link>
              <Link href="/dashboard" className="btn-outline">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
