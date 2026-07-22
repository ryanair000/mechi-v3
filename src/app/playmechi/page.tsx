import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  BellRing,
  Braces,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Code2,
  Radio,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import {
  ONLINE_TOURNAMENT_EVENT_DATES,
  ONLINE_TOURNAMENT_GAME_LIST_LABEL,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  ONLINE_TOURNAMENT_TOTAL_SLOTS,
} from '@/lib/online-tournament';

export const metadata: Metadata = {
  title: 'PlayMechi | Africa-first Tournament Platform',
  description:
    'Discover, host, stream, and automate esports tournaments for African gaming communities on PlayMechi.',
};

const NAV_ITEMS = [
  { href: '#marketplace', label: 'MARKETPLACE' },
  { href: '#organizers', label: 'ORGANIZERS' },
  { href: '#automation', label: 'AUTOMATION' },
  { href: '#api', label: 'API' },
];

const STATS = [
  { label: 'Launch slots', value: ONLINE_TOURNAMENT_TOTAL_SLOTS.toLocaleString('en-KE') },
  { label: 'Core games', value: 'PUBG, CODM, eFootball' },
  { label: 'Ops lanes', value: 'Player, creator, admin' },
  { label: 'Coordination', value: 'Web + WhatsApp' },
];

const PLATFORM_RAILS = [
  {
    title: 'Tournament Marketplace',
    body: 'Public discovery for upcoming, live, and completed events by game, prize, entry fee, status, and organizer.',
    icon: Trophy,
  },
  {
    title: 'Organizer OS',
    body: 'Create events, manage slots, seed brackets, release room details, verify results, and close rewards from one desk.',
    icon: ShieldCheck,
  },
  {
    title: 'Creator Pages',
    body: 'Give streamers and community hosts reusable event pages with schedules, registration, streams, and winners.',
    icon: Radio,
  },
  {
    title: 'Automation Layer',
    body: 'Check-ins, reminders, screenshot queues, dispute windows, payout states, and audit logs keep operations moving.',
    icon: BellRing,
  },
];

const WORKFLOWS = [
  {
    eyebrow: 'Players',
    title: 'Register, check in, play, submit proof, track rewards.',
    detail: 'Profiles, game IDs, WhatsApp groups, tournament history, and reward status stay connected to the player account.',
  },
  {
    eyebrow: 'Organizers',
    title: 'Create a tournament without asking engineering.',
    detail: 'Templates, rules, schedules, entry settings, prize modes, public pages, and result review become self-serve.',
  },
  {
    eyebrow: 'Partners',
    title: 'Embed registration and read public event data.',
    detail: 'The roadmap adds widgets, public APIs, and webhooks so communities can distribute PlayMechi tournaments anywhere.',
  },
];

export default function PlayMechiPage() {
  return (
    <div className="page-base marketing-prototype-shell min-h-screen">
      <HomeFloatingHeader
        navItems={NAV_ITEMS}
        signInHref="/login?next=/playmechi"
        joinHref="/register?next=/playmechi"
      />

      <main>
        <section className="relative min-h-[calc(100svh-5.5rem)] overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/dashboard-promos/playmechi-launch-mobile-gaming.jpg')" }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-[rgba(7,12,22,0.76)]" />
          <div className="landing-shell relative z-[1] flex min-h-[calc(100svh-5.5rem)] flex-col justify-end pb-8 pt-16 sm:pb-10">
            <div className="max-w-4xl pb-8">
              <p className="inline-flex rounded-[var(--radius-control)] border border-white/18 bg-black/28 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
                PlayMechi Platform
              </p>
              <h1 className="mt-4 max-w-4xl text-[2.6rem] font-black leading-[0.98] text-white sm:text-[4.4rem] lg:text-[5.4rem]">
                Africa-first tournament OS for players, creators, and sponsors.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
                Discover tournaments, register players, run brackets, stream matches,
                verify results, and manage rewards from one Mechi-powered platform.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/playmechi/tournaments" className="btn-primary justify-center">
                  Browse Tournaments
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link href="/tournaments/create" className="btn-ghost justify-center">
                  Host Tournament
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-2 border-t border-white/12 pt-4 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <p className="text-xl font-black text-white">{stat.value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-white/56">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="marketplace" className="landing-shell py-12 sm:py-16">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <p className="section-title">Marketplace</p>
              <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                Public discovery is the front door.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                The next category jump is simple: PlayMechi cannot feel like a hidden admin flow.
                Players need open events, clear slots, prizes, game filters, and a shareable page
                before they create an account.
              </p>
              <Link href="/playmechi/tournaments" className="btn-primary mt-5">
                Open Marketplace
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PLATFORM_RAILS.map((rail) => {
                const Icon = rail.icon;
                return (
                  <div key={rail.title} className="card p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-[var(--text-primary)]">
                      {rail.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {rail.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="launch" className="border-y border-[var(--border-color)] bg-[rgba(255,255,255,0.025)] py-12 sm:py-16">
          <div className="landing-shell">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center">
              <div
                className="min-h-80 overflow-hidden rounded-[var(--radius-hero)] bg-cover bg-center"
                style={{ backgroundImage: "url('/dashboard-promos/playmechi-upcoming-stream.jpg')" }}
                aria-label="PlayMechi tournament stream artwork"
              />
              <div>
                <p className="section-title">Featured Launch Event</p>
                <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
                  Mechi.club Online Gaming Tournament
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  {ONLINE_TOURNAMENT_GAME_LIST_LABEL} across {ONLINE_TOURNAMENT_EVENT_DATES}.
                  This event is the live proof lane for registration, room ops, streams, result
                  uploads, admin verification, and reward eligibility.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ['Slots', `${ONLINE_TOURNAMENT_TOTAL_SLOTS}`],
                    ['Entry', 'Free'],
                    ['Ops', 'Online'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                      <p className="text-lg font-black text-[var(--text-primary)]">{value}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link href={ONLINE_TOURNAMENT_REGISTRATION_PATH} className="btn-primary justify-center">
                    Register For Launch
                  </Link>
                  <Link href="/playmechi/tournament" className="btn-ghost justify-center">
                    Tournament Desk
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="organizers" className="landing-shell py-12 sm:py-16">
          <div className="mb-6 max-w-3xl">
            <p className="section-title">Self-Serve Depth</p>
            <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
              Built around the people who actually run communities.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {WORKFLOWS.map((workflow) => (
              <div key={workflow.eyebrow} className="card p-5">
                <p className="brand-chip px-2.5 py-1">{workflow.eyebrow}</p>
                <h3 className="mt-4 text-xl font-black text-[var(--text-primary)]">
                  {workflow.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {workflow.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="automation" className="landing-shell pb-12 sm:pb-16">
          <div className="card p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
              <div>
                <p className="section-title">Automation</p>
                <h2 className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                  The platform wins when ops stop being manual.
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  Phase by phase, PlayMechi moves from one-off event control to reusable
                  tournament templates, automated check-ins, result queues, public standings,
                  payout state, and sponsor reports.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [CalendarClock, 'Check-ins and reminders'],
                  [Users, 'Slot locking and waitlists'],
                  [Activity, 'Live brackets and standings'],
                  [CheckCircle2, 'Verified result queues'],
                ].map(([Icon, label]) => {
                  const TypedIcon = Icon as typeof CalendarClock;
                  return (
                    <div key={label as string} className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                      <TypedIcon className="h-5 w-5 text-[var(--accent-secondary-text)]" />
                      <p className="mt-3 text-sm font-black text-[var(--text-primary)]">
                        {label as string}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="api" className="landing-shell pb-16">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5 sm:p-6">
              <Braces className="h-6 w-6 text-[var(--accent-secondary-text)]" />
              <h2 className="mt-4 text-2xl font-black text-[var(--text-primary)]">
                API and embeds are on the roadmap.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                The platform plan adds public event APIs, organizer API keys, registration
                widgets, webhooks, and partner-safe rate limits.
              </p>
            </div>
            <div className="card p-5 sm:p-6">
              <Code2 className="h-6 w-6 text-[var(--accent-secondary-text)]" />
              <h2 className="mt-4 text-2xl font-black text-[var(--text-primary)]">
                Roadmap lives in the repo.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                The full phased platform build is documented in
                <span className="font-semibold text-[var(--text-primary)]"> docs/PLAYMECHI_GLOBAL_PLATFORM_ROADMAP.md</span>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
