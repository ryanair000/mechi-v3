import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CirclePlay,
  Coins,
  Gamepad2,
  History,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Swords,
  Trophy,
  type LucideIcon,
  UserPlus,
  Users,
  Video,
  Zap,
} from 'lucide-react';

type TutorialCard = {
  action: string;
  duration: string;
  highlights: string[];
  href: string;
  icon: LucideIcon;
  summary: string;
  tag: string;
  title: string;
};

type TutorialCategory = {
  audience: string[];
  cards: TutorialCard[];
  description: string;
  icon: LucideIcon;
  id: string;
  label: string;
  title: string;
};

const quickStages = [
  {
    step: '01',
    title: 'Save your setup',
    body: 'Choose your game, platform, and player ID so Mechi places you in the right lane.',
  },
  {
    step: '02',
    title: 'Pick a play mode',
    body: 'Use queue for speed, challenges for direct callouts, and lobbies or tournaments for bigger sessions.',
  },
  {
    step: '03',
    title: 'Stay responsive',
    body: 'Watch dashboard and notifications so you never miss a match, invite, or bracket move.',
  },
  {
    step: '04',
    title: 'Lock in the result',
    body: 'Finish clean reporting so rank, XP, streaks, and history move without confusion.',
  },
] as const;

const tutorialCategories: TutorialCategory[] = [
  {
    id: 'setup',
    label: 'Start here',
    title: 'Setup and player basics',
    description:
      'These are the best first tutorials for new players, returning players, or anyone cleaning up their account before grinding again.',
    icon: Gamepad2,
    audience: ['New players', 'Returning players', 'Profile cleanup'],
    cards: [
      {
        title: 'Save your first game',
        summary:
          'Set the title you actually play, pick the correct platform, and add the ID people need before you queue.',
        href: '/games',
        action: 'Open games',
        tag: 'Start here',
        duration: '2 min',
        icon: Gamepad2,
        highlights: [
          'Choose the title you want Mechi to track.',
          'Match the platform to the account you really use.',
          'Add the player ID opponents should search.',
        ],
      },
      {
        title: 'Use dashboard as your home base',
        summary:
          'Dashboard is where you return to resume live action, see queue heat, and jump back into your next move quickly.',
        href: '/dashboard',
        action: 'Open dashboard',
        tag: 'Core surface',
        duration: '2 min',
        icon: LayoutDashboard,
        highlights: [
          'Resume live queues and active matches faster.',
          'Check streak, XP, and live player activity at a glance.',
          'Launch into tutorials, streams, and rewards without hunting.',
        ],
      },
      {
        title: 'Find or share player cards',
        summary:
          "Use the friend tools when you want to search by username, confirm someone's public profile, or share yours.",
        href: '/share',
        action: 'Open friends',
        tag: 'Social',
        duration: '2 min',
        icon: UserPlus,
        highlights: [
          'Search players by username in one place.',
          'Open public cards before you challenge or invite.',
          'Share your own card when you want people to find you fast.',
        ],
      },
    ],
  },
  {
    id: 'compete',
    label: 'Compete',
    title: 'Matchmaking and play modes',
    description:
      'Use these guides when you already know what you want to play and need the cleanest route into action.',
    icon: Zap,
    audience: ['Ranked 1v1', 'Direct callouts', 'Group sessions'],
    cards: [
      {
        title: 'Queue for fast ranked 1v1',
        summary:
          'Queue is the quickest way into a live ranked match when you want Mechi to find an opponent for you.',
        href: '/queue',
        action: 'Open queue',
        tag: 'Ranked',
        duration: '3 min',
        icon: Zap,
        highlights: [
          'Start only after your game and platform are configured.',
          'Watch live queue activity so you know the lane is moving.',
          'Jump straight into the match room once an opponent lands.',
        ],
      },
      {
        title: 'Challenge a specific player',
        summary:
          'Challenges are for direct callouts when you already know who you want to play instead of waiting in queue.',
        href: '/challenges',
        action: 'Open challenges',
        tag: 'Direct',
        duration: '3 min',
        icon: MessageCircle,
        highlights: [
          'Choose the target player instead of waiting for matchmaking.',
          'Use it when you want a head-to-head set with clear intent.',
          'Keep the flow organized before the match room opens.',
        ],
      },
      {
        title: 'Open a lobby for group play',
        summary:
          'Lobbies are built for multiplayer sessions, room-style coordination, and organized drop-ins with more than two players.',
        href: '/lobbies',
        action: 'Open lobbies',
        tag: 'Party',
        duration: '4 min',
        icon: Users,
        highlights: [
          'Create or join a room for larger play sessions.',
          'Use it when ranked queue is not the right format.',
          'Keep the session visible to the players who need it.',
        ],
      },
    ],
  },
  {
    id: 'events',
    label: 'Bigger moments',
    title: 'Brackets, live streams, and status',
    description:
      'These tutorials help when the session gets bigger than one match and you need bracket context, live coverage, or public standings.',
    icon: Swords,
    audience: ['Tournament players', 'Spectators', 'Status checks'],
    cards: [
      {
        title: 'Enter a tournament bracket',
        summary:
          'Tournaments are the best path for structured events, brackets, and prize-driven competition with clear progression.',
        href: '/tournaments',
        action: 'Open tournaments',
        tag: 'Bracket',
        duration: '4 min',
        icon: Swords,
        highlights: [
          'Browse available brackets before you commit.',
          'Join the tournament that matches your game and timing.',
          'Track movement as rounds open and close.',
        ],
      },
      {
        title: 'Watch streams and replays',
        summary:
          'Use streams when you want to follow live tournament coverage, queued broadcasts, or recent replays from the app shell.',
        href: '/streams',
        action: 'Open streams',
        tag: 'Live',
        duration: '2 min',
        icon: Video,
        highlights: [
          'Check what is live right now without opening every bracket.',
          'See standby broadcasts before they go on air.',
          'Reopen finished streams when a replay is available.',
        ],
      },
      {
        title: 'Track leaderboard movement',
        summary:
          'Leaderboard is the cleanest place to understand rank movement after your matches start stacking up.',
        href: '/leaderboard',
        action: 'Open leaderboard',
        tag: 'Progress',
        duration: '2 min',
        icon: Trophy,
        highlights: [
          'See where your grind is placing you right now.',
          'Compare your progress against the wider player base.',
          'Use it after reporting results to confirm movement feels right.',
        ],
      },
    ],
  },
  {
    id: 'results',
    label: 'Finish strong',
    title: 'Results, alerts, and rewards',
    description:
      'Open these once matches are live or complete so your records stay clean and your progression keeps turning into something useful.',
    icon: ShieldCheck,
    audience: ['Result checks', 'Live alerts', 'Progression'],
    cards: [
      {
        title: 'Review match history',
        summary:
          'Match history helps you read back what got recorded, spot missing results, and stay confident that your run is logged correctly.',
        href: '/matches',
        action: 'Open match history',
        tag: 'Results',
        duration: '3 min',
        icon: History,
        highlights: [
          'Review completed sets in one timeline.',
          'Check whether the final result landed correctly.',
          'Use it as your first stop when something feels off.',
        ],
      },
      {
        title: 'Stay on top of notifications',
        summary:
          'Notifications are where challenge updates, bracket movement, and match nudges stay visible instead of getting lost.',
        href: '/notifications',
        action: 'Open notifications',
        tag: 'Alerts',
        duration: '2 min',
        icon: BellRing,
        highlights: [
          'See what needs your attention right now.',
          'Catch challenge, match, and tournament updates early.',
          'Use the feed to avoid stalled action and missed responses.',
        ],
      },
      {
        title: 'Turn progress into rewards',
        summary:
          'Rewards show how your activity converts into RP, perks, and redemption paths after you keep playing and reporting cleanly.',
        href: '/rewards',
        action: 'Open rewards',
        tag: 'Growth',
        duration: '2 min',
        icon: Coins,
        highlights: [
          'See how progression connects to RP and perks.',
          'Keep an eye on what your recent activity unlocked.',
          'Use it when you want the grind to turn into tangible value.',
        ],
      },
    ],
  },
];

const totalTutorials = tutorialCategories.reduce(
  (total, category) => total + category.cards.length,
  0
);

const footerLinks = [
  {
    title: 'Need a missing title?',
    body: 'Tell Mechi which game should be added next.',
    href: '/suggest',
    action: 'Suggest a game',
  },
  {
    title: 'Looking for extra goals?',
    body: 'Open bounty-style tasks when you want another reason to play.',
    href: '/bounties',
    action: 'Open bounties',
  },
  {
    title: 'Want to expand your setup?',
    body: 'See which plan unlocks more saved games and more room to grow.',
    href: '/pricing',
    action: 'View pricing',
  },
] as const;

export default function TutorialsPage() {
  return (
    <div className="page-container space-y-5 py-4 sm:py-6 xl:py-0">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
        <section className="card circuit-panel overflow-hidden p-5 sm:p-6 lg:p-7 xl:p-6">
          <div className="flex flex-col gap-5">
            <div className="max-w-3xl">
              <span className="brand-kicker">Player guide</span>

              <h1 className="mt-5 max-w-3xl text-[2.2rem] font-black leading-[0.95] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[3rem] xl:text-[3.5rem]">
                A real tutorials hub, grouped by the category you actually need.
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)] sm:text-base">
                Skip the long scroll. Pick setup, competition, live events, or results and jump
                straight into the right Mechi flow from a card that matches the moment you are in.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/games" className="btn-primary">
                Start with games
                <ArrowRight size={14} />
              </Link>
              <Link href="/dashboard" className="btn-outline">
                Open dashboard
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: 'Categories',
                  value: tutorialCategories.length,
                  body: 'Start here, compete, bigger moments, and finish strong.',
                },
                {
                  title: 'Tutorial cards',
                  value: totalTutorials,
                  body: 'Each card points to a real in-app surface instead of generic help copy.',
                },
                {
                  title: 'Best first route',
                  value: '4',
                  body: 'Games, play mode, live response, then a clean result lock-in.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="tutorial-stage p-5 sm:p-6">
          <div className="tutorial-stage-glow tutorial-stage-glow-teal" />
          <div className="tutorial-stage-glow tutorial-stage-glow-coral" />

          <div className="relative z-[1]">
            <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
              <CirclePlay size={16} />
              <p className="section-title !mb-0">Fastest route</p>
            </div>

            <h2 className="mt-3 text-[1.3rem] font-black leading-tight text-[var(--text-primary)]">
              Most players only need this four-step path.
            </h2>

            <div className="mt-5 space-y-3">
              {quickStages.map((item) => (
                <div key={item.step} className="tutorial-stage-step">
                  <span className="tutorial-step-badge">{item.step}</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="tutorial-warning">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--brand-coral)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Do not read this page in order unless you want to.
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            The whole point is fast scanning. Jump to the category that matches your current
            problem, then use the card CTA to land in the right part of the app.
          </p>
        </div>
      </div>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-title">Jump to category</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Use these anchors when you already know which lane you need.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {tutorialCategories.map((category) => (
              <a key={category.id} href={`#${category.id}`} className="tutorial-anchor">
                {category.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-5">
        {tutorialCategories.map((category) => {
          const CategoryIcon = category.icon;

          return (
            <section key={category.id} id={category.id} className="scroll-mt-24">
              <div className="grid gap-4 xl:grid-cols-[minmax(250px,0.8fr)_minmax(0,2.2fr)] xl:items-start">
                <article className="card h-full p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]">
                      <CategoryIcon size={18} />
                    </div>
                    <div>
                      <p className="section-title !mb-0">{category.label}</p>
                      <h2 className="mt-1 text-[1.2rem] font-black leading-tight text-[var(--text-primary)]">
                        {category.title}
                      </h2>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                    {category.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {category.audience.map((item) => (
                      <span key={item} className="brand-chip">
                        {item}
                      </span>
                    ))}
                    <span className="brand-chip-coral">{category.cards.length} cards</span>
                  </div>
                </article>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {category.cards.map((card) => {
                    const CardIcon = card.icon;

                    return (
                      <article key={card.title} className="card flex h-full flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,107,107,0.18)] bg-[rgba(255,107,107,0.1)] text-[var(--brand-coral)]">
                            <CardIcon size={18} />
                          </div>

                          <div className="flex flex-wrap justify-end gap-2">
                            <span className="brand-chip">{card.tag}</span>
                            <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                              {card.duration}
                            </span>
                          </div>
                        </div>

                        <h3 className="mt-5 text-lg font-black leading-tight text-[var(--text-primary)]">
                          {card.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {card.summary}
                        </p>

                        <div className="mt-4 flex-1 space-y-2.5">
                          {card.highlights.map((item) => (
                            <div key={item} className="tutorial-preview-row flex items-start gap-3">
                              <span className="tutorial-preview-dot" />
                              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                                {item}
                              </p>
                            </div>
                          ))}
                        </div>

                        <Link href={card.href} className="btn-outline mt-5 justify-between">
                          {card.action}
                          <ArrowRight size={14} />
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Still exploring?</p>
            <h2 className="mt-3 text-[1.35rem] font-black leading-tight text-[var(--text-primary)]">
              A few extra routes players usually want after the basics.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              These are not core onboarding steps, but they are often the next thing people ask
              for once the main tutorials are handled.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {footerLinks.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-[8px] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 transition-all hover:border-[rgba(50,224,196,0.22)] hover:bg-[var(--surface)]"
            >
              <p className="text-base font-black text-[var(--text-primary)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--accent-secondary-text)]">
                <span>{item.action}</span>
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
