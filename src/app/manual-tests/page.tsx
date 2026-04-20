import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { ADMIN_URL, APP_URL } from '@/lib/urls';

const CONNECT_URL = 'https://connect.mechi.club';
const TESTS_URL = 'https://tests.mechi.club';

type ChecklistLink = {
  href: string;
  label: string;
};

type ChecklistItem = {
  id: string;
  title: string;
  account: string;
  expected: string;
  notes?: string;
  links: ChecklistLink[];
};

type ChecklistSection = {
  title: string;
  description: string;
  items: ChecklistItem[];
};

function makeAppLink(pathname: string, label: string): ChecklistLink {
  return {
    href: new URL(pathname, APP_URL).toString(),
    label,
  };
}

function makeAdminLink(pathname: string, label: string): ChecklistLink {
  return {
    href: new URL(pathname, ADMIN_URL).toString(),
    label,
  };
}

const prepChecklist: ChecklistItem[] = [
  {
    id: 'P1',
    title: 'Prepare the test account kit before touching the product.',
    account: 'QA lead',
    expected:
      'You have one fresh free player, one second player, one Pro or Elite player, one banned account, and one admin account ready to use.',
    notes:
      'Keep the checklist open on tests.mechi.club and run product flows on mechi.club, connect.mechi.club, and the admin host in separate tabs.',
    links: [
      { href: TESTS_URL, label: 'Checklist home' },
      { href: APP_URL, label: 'Main app' },
      { href: CONNECT_URL, label: 'Connect host' },
      { href: ADMIN_URL, label: 'Admin host' },
    ],
  },
  {
    id: 'P2',
    title: 'Check desktop and mobile once before deep testing.',
    account: 'Anon',
    expected:
      'Core pages stay readable, no major overflow appears, and the browser console stays clean on desktop and a narrow mobile viewport.',
    notes:
      'Use this as the first smoke pass so visual regressions do not waste time later in the flow.',
    links: [
      makeAppLink('/', 'Landing'),
      makeAppLink('/pricing', 'Pricing'),
      { href: CONNECT_URL, label: 'Connect' },
    ],
  },
];

const sections: ChecklistSection[] = [
  {
    title: 'Public and Auth',
    description:
      'Covers the same high-value entry flows the automated suite already hits, plus a few human-eye checks around UX and messaging.',
    items: [
      {
        id: 'A1',
        title: 'Landing, pricing, connect, privacy, terms, and deletion pages all render cleanly.',
        account: 'Anon',
        expected:
          'Every page loads real content, primary CTAs work, and there are no broken layouts, missing art, or dead legal links.',
        links: [
          makeAppLink('/', 'Landing'),
          makeAppLink('/pricing', 'Pricing'),
          { href: CONNECT_URL, label: 'Connect' },
          makeAppLink('/privacy-policy', 'Privacy'),
          makeAppLink('/terms-of-service', 'Terms'),
          makeAppLink('/user-data-deletion', 'Deletion'),
        ],
      },
      {
        id: 'A2',
        title: 'Registration wizard can create a brand-new player account end to end.',
        account: 'Fresh free player',
        expected:
          'You can complete profile basics, location, game selection, and platform IDs, then land in the dashboard with the chosen games visible.',
        links: [makeAppLink('/register', 'Register')],
      },
      {
        id: 'A3',
        title: 'Phone login succeeds for an existing active player account.',
        account: 'Player A',
        expected:
          'Valid credentials land on /dashboard and the session survives a refresh.',
        links: [makeAppLink('/login', 'Login')],
      },
      {
        id: 'A4',
        title: 'Email magic-link request and forgot-password request both send the right message.',
        account: 'Player Pro or Elite',
        expected:
          'Each flow shows a success message and the delivered email points back to the correct Mechi path.',
        notes:
          'If production email is live, use a disposable inbox you control. If sandbox email is available, prefer that.',
        links: [
          makeAppLink('/login', 'Magic link from login'),
          makeAppLink('/forgot-password', 'Forgot password'),
          makeAppLink('/reset-password', 'Reset password form'),
        ],
      },
      {
        id: 'A5',
        title: 'Banned users are blocked with the right message.',
        account: 'Banned account',
        expected:
          'Login is rejected and the user lands on the banned state instead of entering protected app pages.',
        links: [
          makeAppLink('/login', 'Login'),
          makeAppLink('/banned', 'Banned page'),
        ],
      },
      {
        id: 'A6',
        title: 'Invite and join links resolve correctly for a real invitation.',
        account: 'Anon and invited player',
        expected:
          'A valid join code opens the join flow, invalid or expired codes fail gracefully, and the next-step CTA stays clear.',
        notes:
          'Generate a real invite from a logged-in player surface, then open the produced join link in a fresh tab or incognito window.',
        links: [
          makeAppLink('/share', 'Share center'),
          makeAppLink('/register', 'Register'),
        ],
      },
    ],
  },
  {
    title: 'Player Core',
    description:
      'Daily-use player surfaces that should feel stable before you spend time on edge flows.',
    items: [
      {
        id: 'C1',
        title: 'Dashboard loads profile, queue state, active match state, and game cards correctly.',
        account: 'Player A',
        expected:
          'Selected games, queue counts, quick actions, and any active match or queue resume state feel coherent.',
        links: [makeAppLink('/dashboard', 'Dashboard')],
      },
      {
        id: 'C2',
        title: 'Notifications page shows activity and its external action links still work.',
        account: 'Player A',
        expected:
          'Notifications render without empty shells, timestamps look sane, and the WhatsApp CTA opens the correct destination when configured.',
        links: [makeAppLink('/notifications', 'Notifications')],
      },
      {
        id: 'C3',
        title: 'Games and leaderboard surfaces reflect the current player setup.',
        account: 'Player A',
        expected:
          'Game cards, supported titles, and leaderboard filtering feel accurate for the current account and game mix.',
        links: [
          makeAppLink('/games', 'Games'),
          makeAppLink('/leaderboard', 'Leaderboard'),
        ],
      },
      {
        id: 'C4',
        title: 'Profile and profile settings save location, games, platform IDs, and preferences correctly.',
        account: 'Player A',
        expected:
          'Changes persist after refresh, validation messages are sensible, and plan limits behave correctly when selecting games.',
        links: [
          makeAppLink('/profile', 'Profile'),
          makeAppLink('/profile/settings', 'Profile settings'),
        ],
      },
      {
        id: 'C5',
        title: 'Avatar and cover upload flows work and cropped media displays cleanly.',
        account: 'Player A',
        expected:
          'Uploads finish without broken previews, the cropper feels usable, and the new media appears on profile surfaces.',
        links: [makeAppLink('/profile/settings', 'Profile media')],
      },
      {
        id: 'C6',
        title: 'Share center and personal invite actions generate usable output.',
        account: 'Player A',
        expected:
          'Share actions copy or open the right links, invite codes resolve, and there are no malformed public URLs.',
        links: [
          makeAppLink('/share', 'Share center'),
          makeAppLink('/profile', 'Profile'),
        ],
      },
    ],
  },
  {
    title: 'Competitive Flows',
    description:
      'Core gameplay loops: queue, direct challenges, match lifecycle, reporting, and dispute handling.',
    items: [
      {
        id: 'G1',
        title: 'Queue join and cancel work for a configured 1v1 game.',
        account: 'Player A',
        expected:
          'Joining shows the waiting state, cancel returns you cleanly, and the dashboard or queue view stays in sync.',
        links: [
          makeAppLink('/queue', 'Queue'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
      {
        id: 'G2',
        title: 'Direct challenge flow can create, accept, and decline from two player accounts.',
        account: 'Player A and Player B',
        expected:
          'The challenge appears in the list, the opponent can accept or decline, and state updates immediately on both sides.',
        links: [makeAppLink('/challenges', 'Challenges')],
      },
      {
        id: 'G3',
        title: 'Accepted challenges open a live match with chat working for both players.',
        account: 'Player A and Player B',
        expected:
          'Both players see the match detail, chat messages arrive, and no duplicate or missing messages show up.',
        links: [
          makeAppLink('/challenges', 'Challenges'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
      {
        id: 'G4',
        title: 'Match reporting can finish a clean agreement and can also exercise the dispute path.',
        account: 'Player A and Player B',
        expected:
          'Matching reports complete the match; conflicting reports or escalation actions produce a clear status for players and admins.',
        notes:
          'Open the live match from challenges or dashboard once the pair is created, then repeat once with matching winners and once with conflicting winners.',
        links: [
          makeAppLink('/challenges', 'Challenges'),
          makeAdminLink('/matches', 'Admin matches'),
        ],
      },
      {
        id: 'G5',
        title: 'Matchmaking cron or manual trigger turns queued players into a live match.',
        account: 'Two queued players plus admin or ops access',
        expected:
          'Once the matcher runs, both players see the same active match and the queue is cleared.',
        notes:
          'If you have a safe ops path for the cron trigger, use that. Otherwise confirm the next natural cron cycle with two waiting accounts.',
        links: [
          makeAppLink('/queue', 'Queue'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
      {
        id: 'G6',
        title: 'Public share pages for player, match, and tournament render real-looking cards.',
        account: 'Anon',
        expected:
          'The pages load without auth, key metadata is present, and the content matches the underlying entity.',
        notes:
          'Generate the public URLs from profile, match, or tournament surfaces first, then open those real links in an anonymous window.',
        links: [
          makeAppLink('/share', 'Share center'),
          makeAppLink('/profile', 'Profile'),
          makeAppLink('/tournaments', 'Tournaments'),
        ],
      },
    ],
  },
  {
    title: 'Lobbies and Tournaments',
    description:
      'Room-based multiplayer coordination plus bracket creation and participation.',
    items: [
      {
        id: 'L1',
        title: 'Lobby listing, filtering, and join flows work from the public feed.',
        account: 'Player A',
        expected:
          'Public lobbies filter by game, status chips look right, and joining sends you into the chosen room.',
        links: [
          makeAppLink('/lobbies', 'Lobbies'),
          makeAppLink('/lobbies/create', 'Create lobby'),
        ],
      },
      {
        id: 'L2',
        title: 'Create both a public and a private lobby, then verify host controls and leave behavior.',
        account: 'Player A and Player B',
        expected:
          'Room creation succeeds, private visibility behaves correctly, member counts update, and host leave or close actions work cleanly.',
        links: [
          makeAppLink('/lobbies/create', 'Create lobby'),
          makeAppLink('/lobbies', 'Lobby list'),
        ],
      },
      {
        id: 'L3',
        title: 'Tournament list tabs, detail page, and public bracket page all stay in sync.',
        account: 'Anon and Player A',
        expected:
          'Open, full, active, and completed statuses look correct and a tournament detail matches the list state.',
        notes:
          'Open a real tournament from the list and use its detail page plus its generated public share URL for this pass.',
        links: [
          makeAppLink('/tournaments', 'Tournaments'),
          makeAppLink('/share', 'Share center'),
        ],
      },
      {
        id: 'L4',
        title: 'Tournament hosting rules respect plan gates and fee messaging.',
        account: 'Free player, then Pro or Elite player',
        expected:
          'Free-entry hosting gates behave as designed, upgrade nudges are clear, and paid/free fee descriptions stay accurate.',
        links: [
          makeAppLink('/tournaments/create', 'Create tournament'),
          makeAppLink('/pricing', 'Pricing'),
        ],
      },
      {
        id: 'L5',
        title: 'Tournament join, start, and advance flows move players through the bracket correctly.',
        account: 'Organizer plus enough players to fill a small bracket',
        expected:
          'Players can join, the organizer can start, bracket rounds advance cleanly, and the tournament status updates everywhere.',
        links: [
          makeAppLink('/tournaments', 'Tournament list'),
          makeAdminLink('/tournaments', 'Admin tournaments'),
        ],
      },
    ],
  },
  {
    title: 'Rewards, Suggestions, and Subscriptions',
    description:
      'Monetization and retention surfaces that often need a real human pass even when APIs are healthy.',
    items: [
      {
        id: 'R1',
        title: 'Rewards summary, ways to earn, and reward catalog load without partial-state glitches.',
        account: 'Player A',
        expected:
          'Balances, earn rules, and available rewards all render together and refresh cleanly after actions.',
        links: [makeAppLink('/rewards', 'Rewards')],
      },
      {
        id: 'R2',
        title: 'ChezaHub linking and reward redemption flows behave end to end.',
        account: 'Player A with a safe affiliate test path',
        expected:
          'Link start redirects correctly, success comes back to rewards, and redeem actions update balance and codes as expected.',
        notes:
          'Use a safe test account or sandbox partner path if one is available.',
        links: [makeAppLink('/rewards', 'Rewards actions')],
      },
      {
        id: 'R3',
        title: 'Pricing upgrade, Paystack checkout, callback, confirm, and cancel states all feel correct.',
        account: 'Fresh free player',
        expected:
          'The selected plan, checkout handoff, success state, and any cancellation or retry messages stay consistent.',
        notes:
          'Run this only with a reversible test transaction path or the smallest safe live amount.',
        links: [
          makeAppLink('/pricing', 'Pricing'),
          makeAppLink('/dashboard', 'Dashboard after upgrade'),
        ],
      },
      {
        id: 'R4',
        title: 'Suggestions can be created and voted on without odd duplicates or missing state.',
        account: 'Player A and Player B',
        expected:
          'New suggestions appear quickly, votes stick after refresh, and duplicate-vote handling is clear.',
        links: [makeAppLink('/suggest', 'Suggestions')],
      },
      {
        id: 'R5',
        title: 'Tutorials page content loads and remains useful on both desktop and mobile.',
        account: 'Player A',
        expected:
          'The tutorials surface has readable structure, working links, and no collapsed or broken media blocks.',
        links: [makeAppLink('/tutorials', 'Tutorials')],
      },
    ],
  },
  {
    title: 'Admin and Ops',
    description:
      'The admin host should feel operationally safe, not just technically reachable.',
    items: [
      {
        id: 'O1',
        title: 'Admin overview, users, queue, matches, tournaments, rewards, support, and logs all load on the admin host.',
        account: 'Admin',
        expected:
          'Each page shows meaningful data, navigation is stable, and there are no cross-host misroutes back to the player app.',
        links: [
          makeAdminLink('/', 'Admin home'),
          makeAdminLink('/users', 'Users'),
          makeAdminLink('/queue', 'Queue'),
          makeAdminLink('/matches', 'Matches'),
          makeAdminLink('/tournaments', 'Tournaments'),
          makeAdminLink('/rewards', 'Rewards'),
          makeAdminLink('/support', 'Support'),
          makeAdminLink('/logs', 'Logs'),
        ],
      },
      {
        id: 'O2',
        title: 'Admin communications pages for WhatsApp and Instagram load and show usable controls.',
        account: 'Admin',
        expected:
          'Both pages render enough operational state to be usable and any test-send or refresh actions behave predictably.',
        links: [
          makeAdminLink('/whatsapp', 'WhatsApp ops'),
          makeAdminLink('/instagram', 'Instagram ops'),
        ],
      },
      {
        id: 'O3',
        title: 'Admin moderation actions for queue, matches, lobbies, tournaments, users, and rewards work without stale UI.',
        account: 'Admin',
        expected:
          'Operational actions confirm success, affected records update after refresh, and forbidden actions fail gracefully.',
        links: [
          makeAdminLink('/users', 'Users'),
          makeAdminLink('/matches', 'Matches'),
          makeAdminLink('/tournaments', 'Tournaments'),
          makeAdminLink('/rewards', 'Rewards'),
        ],
      },
      {
        id: 'O4',
        title: 'Support inbox can load a thread, send a reply, and reflect the updated conversation state.',
        account: 'Admin',
        expected:
          'Messages appear in the right order, replies save once, and status changes are visible without a broken refresh cycle.',
        links: [makeAdminLink('/support', 'Support inbox')],
      },
    ],
  },
];

export const metadata: Metadata = {
  title: 'Manual Test Checklist | Mechi',
  description: 'A production-ready manual QA checklist for Mechi V3.',
  alternates: {
    canonical: TESTS_URL,
  },
  robots: {
    index: false,
    follow: false,
  },
};

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function ChecklistCard({ item }: { item: ChecklistItem }) {
  return (
    <li className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="brand-chip px-2 py-0.5">{item.id}</span>
            <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              {item.account}
            </span>
          </div>
          <h3 className="mt-3 text-base font-black text-[var(--text-primary)]">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.expected}</p>
          {item.notes ? (
            <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">{item.notes}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:max-w-[16rem] lg:justify-end">
          {item.links.map((link) => (
            <a
              key={`${item.id}-${link.href}-${link.label}`}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs"
            >
              {link.label}
              <ExternalLink size={13} />
            </a>
          ))}
        </div>
      </div>
    </li>
  );
}

export default function ManualTestsPage() {
  const totalChecks =
    prepChecklist.length + sections.reduce((count, section) => count + section.items.length, 0);

  return (
    <div className="page-base">
      <section className="landing-shell py-8 sm:py-10 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="card circuit-panel p-6 sm:p-7">
            <div className="max-w-3xl">
              <p className="section-title">Manual QA</p>
              <h1 className="mt-3 text-[2rem] font-black leading-[1.02] text-[var(--text-primary)] sm:text-[3rem]">
                Minimal checklist for testing Mechi end to end.
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                This page is the command center for a full manual pass. Keep it open on{' '}
                <span className="font-semibold text-[var(--text-primary)]">tests.mechi.club</span>,
                then open the real product surfaces in new tabs as you work through the flow.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total checks" value={String(totalChecks)} />
              <StatCard label="Core sections" value={String(sections.length)} />
              <StatCard label="Primary app" value="mechi.club" />
              <StatCard label="Admin host" value="mechi.lokimax.top" />
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="max-w-3xl">
              <p className="text-sm font-black text-[var(--text-primary)]">Suggested run order</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Start with prep and public/auth. Then run player core, gameplay, lobbies, tournaments,
                rewards, and admin last. If payments or partner integrations are live-only, save those
                checks for the end of the session.
              </p>
            </div>

            <ol className="mt-4 space-y-3">
              {prepChecklist.map((item) => (
                <ChecklistCard key={item.id} item={item} />
              ))}
            </ol>
          </div>

          {sections.map((section) => (
            <details
              key={section.title}
              open
              className="card overflow-hidden"
            >
              <summary className="cursor-pointer list-none px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-3xl">
                    <p className="section-title">{section.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {section.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    {section.items.length} checks
                  </span>
                </div>
              </summary>

              <div className="border-t border-[var(--border-color)] px-5 py-5 sm:px-6">
                <ol className="space-y-3">
                  {section.items.map((item) => (
                    <ChecklistCard key={item.id} item={item} />
                  ))}
                </ol>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
