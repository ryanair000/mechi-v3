import { ADMIN_URL, APP_URL } from '@/lib/urls';

export const TESTS_URL = 'https://tests.mechi.club';
export const MANUAL_TEST_STORAGE_KEY = 'mechi_manual_test_kit_v2';

export type ManualTestLink = {
  href: string;
  label: string;
};

export type ManualTestItem = {
  id: string;
  title: string;
  account: string;
  instructions: string[];
  passIf: string[];
  watchFor?: string[];
  timing?: string;
  links: ManualTestLink[];
};

export type ManualTestSection = {
  id: string;
  title: string;
  description: string;
  goal: string;
  items: ManualTestItem[];
};

function makeAbsoluteLink(href: string, label: string): ManualTestLink {
  return { href, label };
}

function makeAppLink(pathname: string, label: string): ManualTestLink {
  return makeAbsoluteLink(new URL(pathname, APP_URL).toString(), label);
}

function makeAdminLink(pathname: string, label: string): ManualTestLink {
  return makeAbsoluteLink(new URL(pathname, ADMIN_URL).toString(), label);
}

export const manualTestHosts = [
  makeAbsoluteLink(TESTS_URL, 'tests.mechi.club'),
  makeAbsoluteLink(APP_URL, 'mechi.club'),
  makeAbsoluteLink(ADMIN_URL, 'mechi.lokimax.top'),
] as const;

export const manualTestAccounts = [
  'Fresh free player',
  'Second player',
  'Pro or Elite player',
  'Banned account',
  'Admin account',
] as const;

export const manualTestRunOrder = [
  'Setup and smoke',
  'Public and auth',
  'Player account surfaces',
  'Competitive flows',
  'Lobbies and tournaments',
  'Bounties, rewards, and billing',
  'Share pages',
  'Admin and ops',
] as const;

export const manualTestSections = [
  {
    id: 'setup',
    title: 'Session Setup',
    description:
      'Get the right accounts, hosts, and viewports ready before you sink time into deeper product flows.',
    goal: 'Exit this section with clean tabs, clean sessions, and a reliable smoke baseline.',
    items: [
      {
        id: 'SET-01',
        title: 'Prepare the account pack and host tabs before touching live flows.',
        account: 'QA lead',
        instructions: [
          'Keep tests.mechi.club open as your checklist, then open mechi.club and mechi.lokimax.top in separate tabs.',
          'Sign in or prepare one fresh free player, one second player, one Pro or Elite player, one banned account, and one admin account in separate browser sessions.',
        ],
        passIf: [
          'You can switch between all required accounts without logging anyone out accidentally.',
          'Each host opens the correct surface and stays on its own domain.',
        ],
        watchFor: ['Do not reuse the same browser session for both match participants.'],
        links: [
          makeAbsoluteLink(TESTS_URL, 'Checklist home'),
          makeAppLink('/', 'Main app'),
          makeAdminLink('/admin', 'Admin host'),
        ],
      },
      {
        id: 'SET-02',
        title: 'Run a fast desktop smoke on the public entry points.',
        account: 'Anon',
        instructions: [
          'Open landing, pricing, and the legal pages on a wide desktop viewport and scroll each page from top to bottom once.',
          'Click the primary CTA on each surface and confirm back and forward navigation still feel normal.',
        ],
        passIf: [
          'There is no broken spacing, clipped copy, missing art, or dead CTA on the first public pass.',
          'Host-specific pages stay on the correct domain instead of cross-routing unexpectedly.',
        ],
        watchFor: ['Open DevTools once and note any console errors before deeper testing.'],
        links: [
          makeAppLink('/', 'Landing'),
          makeAppLink('/pricing', 'Pricing'),
          makeAppLink('/privacy-policy', 'Privacy'),
          makeAppLink('/terms-of-service', 'Terms'),
        ],
      },
      {
        id: 'SET-03',
        title: 'Run a fast mobile smoke before deep testing.',
        account: 'Anon and Player A',
        instructions: [
          'Switch to a narrow mobile viewport and check landing, register, login, and dashboard.',
          'Open menus, tap primary buttons, and interact with at least one form field on each page.',
        ],
        passIf: [
          'There is no horizontal scroll, impossible tap target, or clipped modal on mobile.',
          'Sticky bars, cards, and forms remain readable and usable on a narrow screen.',
        ],
        links: [
          makeAppLink('/', 'Landing'),
          makeAppLink('/register', 'Register'),
          makeAppLink('/login', 'Login'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
    ],
  },
  {
    id: 'public-auth',
    title: 'Public and Auth',
    description:
      'Cover first-touch product stories, legal surfaces, invites, and every core account entry or recovery lane.',
    goal: 'Exit this section knowing a new or returning player can reach the product and recover access cleanly.',
    items: [
      {
        id: 'PUB-01',
        title: 'Landing page tells the Mechi story clearly and links into real next steps.',
        account: 'Anon',
        instructions: [
          'Open the landing page and scan hero, feature blocks, rank content, and footer.',
          'Use the main CTA and at least one secondary CTA in separate tabs.',
        ],
        passIf: [
          'The page feels intentional and complete, with no missing sections or placeholder content.',
          'Primary navigation and footer links land on real Mechi pages.',
        ],
        links: [
          makeAppLink('/', 'Landing'),
          makeAppLink('/pricing', 'Pricing'),
        ],
      },
      {
        id: 'PUB-02',
        title: 'Pricing plans, upgrade copy, and CTA routing stay coherent.',
        account: 'Anon',
        instructions: [
          'Open pricing and compare all visible plans, feature lists, and CTA buttons.',
          'Try the upgrade CTA from pricing and confirm the next screen matches the chosen plan.',
        ],
        passIf: [
          'Plan labels, benefits, and upgrade messaging do not contradict each other.',
          'The selected CTA points to the correct follow-up step instead of a dead or unrelated route.',
        ],
        links: [
          makeAppLink('/pricing', 'Pricing'),
          makeAppLink('/login', 'Login'),
        ],
      },
      {
        id: 'PUB-04',
        title: 'Privacy, terms, and user-data-deletion pages all render cleanly.',
        account: 'Anon',
        instructions: [
          'Open the three legal pages in separate tabs and scan headings, body copy, and footer or sibling links.',
          'Use any cross-link between the legal pages once.',
        ],
        passIf: [
          'Each legal page has real content, clean structure, and no broken formatting blocks.',
          'Links between legal surfaces still work and do not dump the user onto the wrong host.',
        ],
        links: [
          makeAppLink('/privacy-policy', 'Privacy'),
          makeAppLink('/terms-of-service', 'Terms'),
          makeAppLink('/user-data-deletion', 'Deletion'),
        ],
      },
      {
        id: 'PUB-05',
        title: 'Invite and join flow handles both valid and invalid codes gracefully.',
        account: 'Anon and invited player',
        instructions: [
          'Generate a real invite from a logged-in player, then open the resulting join link in a fresh anonymous tab.',
          'Also try a malformed or expired join code and observe the fallback state.',
        ],
        passIf: [
          'A valid invite leads the user into the correct join, login, or register path with clear next steps.',
          'A bad code fails safely and never white-screens or traps the user.',
        ],
        watchFor: ['Use a real invite first so you know what a healthy join path looks like.'],
        links: [
          makeAppLink('/share', 'Share center'),
          makeAppLink('/register', 'Register'),
        ],
      },
      {
        id: 'AUTH-01',
        title: 'Registration wizard can create a brand-new player account end to end.',
        account: 'Fresh free player',
        instructions: [
          'Complete the registration wizard with profile basics, game selection, platform IDs, and the WhatsApp notification preference.',
          'Finish the flow and let the app redirect into the signed-in experience.',
        ],
        passIf: [
          'The new user lands in the app with the chosen games, profile details, and alert preference reflected cleanly.',
          'Validation is understandable and no step in the wizard silently drops the user input.',
        ],
        links: [makeAppLink('/register', 'Register')],
      },
      {
        id: 'AUTH-02',
        title: 'Existing login works and the session survives refresh.',
        account: 'Player A',
        instructions: [
          'Log in with a healthy existing player account using at least one of the supported sign-in methods now exposed on the page, then visit dashboard, profile, and one more protected page.',
          'Refresh the browser on a protected page once after login.',
        ],
        passIf: [
          'The user reaches the protected app without redirect loops.',
          'Refresh does not drop the session or produce a blank loading state, regardless of the login method used.',
        ],
        links: [
          makeAppLink('/login', 'Login'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
      {
        id: 'AUTH-03',
        title: 'Magic-link, forgot-password, and reset-password recovery lanes still work.',
        account: 'Pro or Elite player',
        timing: 'Run last',
        instructions: [
          'Request a magic link or password reset for an account you control, then open the delivered link.',
          'If reset is available, complete the reset and log in with the new credential or returned session.',
        ],
        passIf: [
          'The request flow shows the right confirmation state and the email lands with a working Mechi link.',
          'The returned link reaches the intended Mechi page without cross-host confusion.',
        ],
        watchFor: ['Prefer a disposable inbox or sandbox mail path when one is available.'],
        links: [
          makeAppLink('/login', 'Login'),
          makeAppLink('/forgot-password', 'Forgot password'),
          makeAppLink('/reset-password', 'Reset password'),
        ],
      },
      {
        id: 'AUTH-04',
        title: 'Banned users are blocked and shown the right state.',
        account: 'Banned account',
        instructions: [
          'Attempt login with a banned user account and try to reach a protected route afterward.',
          'Open the banned state directly once so the message and support direction can be reviewed.',
        ],
        passIf: [
          'The banned user cannot enter protected app pages.',
          'The blocked state is explicit and does not look like a generic auth failure.',
        ],
        links: [
          makeAppLink('/login', 'Login'),
          makeAppLink('/banned', 'Banned page'),
        ],
      },
    ],
  },
  {
    id: 'player-surfaces',
    title: 'Player Account Surfaces',
    description:
      'Cover the daily-use player UI so profile data, preferences, and discovery surfaces feel trustworthy.',
    goal: 'Exit this section knowing the signed-in player experience is stable before gameplay starts.',
    items: [
      {
        id: 'PLAYER-01',
        title: 'Dashboard loads a coherent snapshot of the player state.',
        account: 'Player A',
        instructions: [
          'Open dashboard after login and compare queue, active match, quick actions, and profile summary areas.',
          'Refresh the dashboard once after some other action such as queue join or profile edit.',
        ],
        passIf: [
          'The dashboard reflects the current account state instead of stale or conflicting summaries.',
          'Quick actions and counts feel connected to the rest of the app.',
        ],
        links: [makeAppLink('/dashboard', 'Dashboard')],
      },
      {
        id: 'PLAYER-02',
        title: 'Games setup can save titles, platform choice, and player IDs correctly.',
        account: 'Player A',
        instructions: [
          'Open the games page, add or update at least one supported title, and save the correct platform ID.',
          'Leave the page and return to confirm the saved setup persists.',
        ],
        passIf: [
          'Saved games and IDs reappear after refresh without validation glitches.',
          'Plan limits or game-selection gates behave as designed for the current account.',
        ],
        links: [makeAppLink('/games', 'Games')],
      },
      {
        id: 'PLAYER-03',
        title: 'Profile page renders the player identity, growth, and summary blocks cleanly.',
        account: 'Player A',
        instructions: [
          'Open profile and scan rank, summary, achievements, and any share or edit actions.',
          'Compare one visible stat or badge with the latest match or account state you expect.',
        ],
        passIf: [
          'Profile content looks intentional and not partially loaded or contradictory.',
          'Visible rank or summary data matches the account you are testing.',
        ],
        links: [makeAppLink('/profile', 'Profile')],
      },
      {
        id: 'PLAYER-04',
        title: 'Profile settings can save preferences, location, and editable profile data.',
        account: 'Player A',
        instructions: [
          'Change one or more fields on profile settings such as location, bio, or supported-game preferences.',
          'Save the form, refresh, and confirm the new values still appear.',
        ],
        passIf: [
          'Changes persist after refresh and validation stays readable.',
          'The saved settings propagate back to profile and any other visible summary surface.',
        ],
        links: [
          makeAppLink('/profile/settings', 'Profile settings'),
          makeAppLink('/profile', 'Profile'),
        ],
      },
      {
        id: 'PLAYER-05',
        title: 'Avatar and cover upload flows work and the cropped media displays correctly.',
        account: 'Player A',
        instructions: [
          'Upload a new avatar or cover image, use the cropper if presented, and save the result.',
          'Open profile and profile settings again to verify the image appears in both places.',
        ],
        passIf: [
          'Upload, preview, crop, and save all complete without broken thumbnails.',
          'The final media displays at the right size instead of stretching or disappearing.',
        ],
        links: [
          makeAppLink('/profile/settings', 'Media settings'),
          makeAppLink('/profile', 'Profile preview'),
        ],
      },
      {
        id: 'PLAYER-06',
        title: 'Notifications page loads real activity and any outbound action still works.',
        account: 'Player A',
        instructions: [
          'Open notifications and scan timestamps, empty states, and any CTA tied to WhatsApp or another follow-up action.',
          'Refresh once and verify the list does not collapse into duplicate or missing cards.',
        ],
        passIf: [
          'Notifications render as real activity instead of placeholders or empty shells.',
          'Any CTA opens the correct destination when that action is configured.',
        ],
        links: [makeAppLink('/notifications', 'Notifications')],
      },
      {
        id: 'PLAYER-07',
        title: 'Share center generates usable outputs for player-facing sharing flows.',
        account: 'Player A',
        instructions: [
          'Open share center and use at least one copy or open action for a personal or referral link.',
          'Paste the copied value into a fresh tab or note area and confirm it looks like a real Mechi URL.',
        ],
        passIf: [
          'Generated links are well formed and point to the right destination.',
          'Share actions do not silently fail or copy malformed values.',
        ],
        links: [
          makeAppLink('/share', 'Share center'),
          makeAppLink('/profile', 'Profile'),
        ],
      },
      {
        id: 'PLAYER-08',
        title: 'Leaderboard renders the current game and account context correctly.',
        account: 'Player A',
        instructions: [
          'Open leaderboard and try any available game or rank filter.',
          'Compare at least one visible identity, rank, or ordering clue with the latest test account state.',
        ],
        passIf: [
          'The leaderboard loads without broken filtering or empty-shell rows.',
          'Filtering and account context feel plausible for the selected game.',
        ],
        links: [makeAppLink('/leaderboard', 'Leaderboard')],
      },
      {
        id: 'PLAYER-09',
        title: 'Supported game snapshot uploads work from profile settings and survive refresh.',
        account: 'Player A',
        instructions: [
          'Open profile settings, pick one supported snapshot game such as eFootball, CODM, or PUBG Mobile, and upload an in-game screenshot.',
          'If a snapshot already exists, replace it once, then refresh the page and confirm the updated image is still attached to the right game card.',
        ],
        passIf: [
          'Snapshot cards accept uploads without broken previews, stuck loading overlays, or wrong-game placement.',
          'The saved snapshot remains visible after refresh and can be removed or changed cleanly.',
        ],
        links: [
          makeAppLink('/profile/settings', 'Profile settings'),
          makeAppLink('/profile', 'Profile'),
        ],
      },
    ],
  },
  {
    id: 'competitive',
    title: 'Competitive Core',
    description:
      'Exercise queue, direct challenges, live matches, and the result workflow that drives rank and dispute handling.',
    goal: 'Exit this section knowing Mechi can create, run, and settle competitive matches end to end.',
    items: [
      {
        id: 'CORE-01',
        title: 'Queue join and cancel work for a configured ranked game.',
        account: 'Player A',
        instructions: [
          'Open queue for a configured game, join matchmaking, and wait until the searching state is visible.',
          'Cancel the search and return to dashboard or queue once more.',
        ],
        passIf: [
          'Queue entry shows a believable searching state with no duplicate banners.',
          'Cancel removes the player cleanly and syncs with dashboard or queue status.',
        ],
        links: [
          makeAppLink('/queue', 'Queue'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
      {
        id: 'CORE-02',
        title: 'Queued players can become one live match through the real handoff path.',
        account: 'Player A and Player B',
        instructions: [
          'Put two compatible players into queue and let the normal matching flow or safe manual trigger create the match.',
          'Check both accounts as soon as the handoff happens.',
        ],
        passIf: [
          'Both players land on the same live match and leave the queue state behind.',
          'The resulting match feels singular and synchronized instead of duplicated or split.',
        ],
        watchFor: ['If the queue handoff is slow, record the delay instead of assuming the system is broken.'],
        links: [
          makeAppLink('/queue', 'Queue'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
      {
        id: 'CORE-03',
        title: 'Direct challenge flow can create, accept, and decline between two players.',
        account: 'Player A and Player B',
        instructions: [
          'Create a direct challenge from one player and open the challenges surface on both accounts.',
          'Accept once with Player B, then repeat with a second challenge and decline it.',
        ],
        passIf: [
          'Challenge state updates on both accounts without stale cards lingering behind.',
          'Accept and decline produce different, understandable outcomes.',
        ],
        links: [makeAppLink('/challenges', 'Challenges')],
      },
      {
        id: 'CORE-04',
        title: 'Live match page keeps chat and status in sync for both players.',
        account: 'Player A and Player B',
        instructions: [
          'Open the same live match on both accounts and exchange chat messages in both directions.',
          'Observe timer or status panels before and after one refresh.',
        ],
        passIf: [
          'Messages arrive without duplicates or silent drops.',
          'The match page still shows a coherent live state after refresh.',
        ],
        links: [makeAppLink('/dashboard', 'Dashboard to live match')],
      },
      {
        id: 'CORE-05',
        title: 'Evidence upload and clean result reporting work on a normal match.',
        account: 'Player A and Player B',
        instructions: [
          'Open a live match, upload any evidence or screenshot if the flow supports it, and report a matching winner from both accounts.',
          'Wait for the match to settle, then review the final state.',
        ],
        passIf: [
          'Evidence upload completes without broken previews or missing files.',
          'Matching reports resolve the match cleanly and move it out of the live state.',
        ],
        links: [
          makeAppLink('/dashboard', 'Dashboard'),
          makeAppLink('/challenges', 'Challenges'),
        ],
      },
      {
        id: 'CORE-06',
        title: 'Dispute and escalation path gives both players a clear next state.',
        account: 'Player A and Player B',
        instructions: [
          'Repeat a match result flow with conflicting winners or use the available escalation action.',
          'Check the player-facing status after the disagreement is submitted.',
        ],
        passIf: [
          'Players see a clear disputed or escalated state rather than a hidden failure.',
          'The match remains actionable for the admin lane instead of disappearing.',
        ],
        links: [
          makeAppLink('/dashboard', 'Dashboard'),
          makeAdminLink('/admin/matches', 'Admin matches'),
        ],
      },
      {
        id: 'CORE-07',
        title: 'Post-match updates flow back into player surfaces after settlement.',
        account: 'Player A',
        instructions: [
          'After a match settles, revisit dashboard, profile, leaderboard, and any visible rank summary.',
          'Compare the updated state with the winner and loser you just tested.',
        ],
        passIf: [
          'Recent results feel reflected across the player surfaces that depend on them.',
          'There is no obvious stale data conflict between match result, dashboard, and profile summaries.',
        ],
        links: [
          makeAppLink('/dashboard', 'Dashboard'),
          makeAppLink('/profile', 'Profile'),
          makeAppLink('/leaderboard', 'Leaderboard'),
        ],
      },
    ],
  },
  {
    id: 'group-play',
    title: 'Lobbies and Tournaments',
    description:
      'Exercise room-based multiplayer coordination and bracket-based competition from list pages through real participation.',
    goal: 'Exit this section knowing group play surfaces are usable from discovery to resolution.',
    items: [
      {
        id: 'GROUP-01',
        title: 'Lobby list and game filtering surface healthy room data.',
        account: 'Player A',
        instructions: [
          'Open lobbies and switch any visible game filter or status view.',
          'Scan room cards for member counts, privacy labels, and join affordances.',
        ],
        passIf: [
          'The lobby feed loads without empty-shell cards or broken filters.',
          'Privacy, game, and occupancy cues look trustworthy on the list.',
        ],
        links: [
          makeAppLink('/lobbies', 'Lobbies'),
          makeAppLink('/lobbies/create', 'Create lobby'),
        ],
      },
      {
        id: 'GROUP-02',
        title: 'A player can create both public and private lobbies.',
        account: 'Player A',
        instructions: [
          'Create one public lobby and one private lobby with real game settings.',
          'Return to the lobby list and confirm each room appears with the right visibility rules.',
        ],
        passIf: [
          'Room creation succeeds without duplicated or malformed entries.',
          'Public and private visibility behave differently in the way the product intends.',
        ],
        links: [
          makeAppLink('/lobbies/create', 'Create lobby'),
          makeAppLink('/lobbies', 'Lobby list'),
        ],
      },
      {
        id: 'GROUP-03',
        title: 'Lobby detail supports invite, join, leave, and host-control behavior.',
        account: 'Player A and Player B',
        instructions: [
          'Join a created lobby with a second player using the list or any invite path.',
          'Verify host controls, member counts, and leave or close behavior from the room detail view.',
        ],
        passIf: [
          'Both players see consistent member presence and room identity.',
          'Host and non-host actions behave differently in the expected way.',
        ],
        links: [
          makeAppLink('/lobbies', 'Lobbies'),
          makeAppLink('/lobbies/create', 'Create lobby'),
        ],
      },
      {
        id: 'GROUP-04',
        title: 'Tournament list tabs and tournament detail stay in sync.',
        account: 'Anon and Player A',
        instructions: [
          'Open tournaments, move through the visible tabs or states, and then open one real tournament detail page.',
          'Compare the detail page status, player counts, and labels with the list card.',
        ],
        passIf: [
          'Tournament status labeling is consistent between list and detail.',
          'The detail page loads real rules, players, or bracket context without layout issues.',
        ],
        links: [
          makeAppLink('/tournaments', 'Tournaments'),
          makeAppLink('/tournaments/create', 'Create tournament'),
        ],
      },
      {
        id: 'GROUP-05',
        title: 'Tournament creation respects plan gates and fee messaging.',
        account: 'Fresh free player and Pro or Elite player',
        instructions: [
          'Try tournament creation with a free account, then repeat with a higher-tier account if available.',
          'Review any fee or upgrade explanation shown during setup.',
        ],
        passIf: [
          'Plan-gated behavior is explicit instead of surprising or silent.',
          'Free, paid, or upgrade messaging stays consistent with pricing expectations.',
        ],
        links: [
          makeAppLink('/tournaments/create', 'Create tournament'),
          makeAppLink('/pricing', 'Pricing'),
        ],
      },
      {
        id: 'GROUP-06',
        title: 'Players can join, start, and advance through a small tournament run.',
        account: 'Organizer plus enough players for a small bracket',
        instructions: [
          'Join the tournament with enough players to start it, then use the organizer controls to begin.',
          'Advance at least one round using the available result flow and observe bracket updates.',
        ],
        passIf: [
          'Join and start actions move the tournament into the expected next state.',
          'Bracket or round progress updates cleanly after results settle.',
        ],
        links: [
          makeAppLink('/tournaments', 'Tournament list'),
          makeAdminLink('/admin/tournaments', 'Admin tournaments'),
        ],
      },
      {
        id: 'GROUP-07',
        title: 'Elite or admin streaming flow can go live, show LIVE badges, and expose secure viewing.',
        account: 'Elite player or Admin plus signed-in viewer',
        timing: 'Run last',
        instructions: [
          'Open an active tournament as an Elite organizer, Elite participant, or admin and use the Go Live flow to create the stream.',
          'Copy the returned RTMPS URL and stream key into OBS or Larix, start streaming, and watch the tournament card, detail page, and /t/[slug]/live page update.',
          'Open the live page from a second signed-in account and confirm the player loads for authenticated users only.',
        ],
        passIf: [
          'The tournament list and detail surfaces show a LIVE state once Mux marks the stream active.',
          'Signed-in viewers can watch the stream on /t/[slug]/live while signed-out users are redirected to login.',
          'The streamer can stop the stream cleanly and the page falls back to ended or replay state after webhook processing.',
        ],
        watchFor: [
          'Brief encoder disconnects under the reconnect window should not mark the stream as ended.',
          'Token generation must stay server-side and no private Mux key should ever appear in network payloads or browser bundles.',
        ],
        links: [
          makeAppLink('/tournaments', 'Tournament list'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
      {
        id: 'GROUP-08',
        title: 'Mux recording and reward webhook behavior completes after a real live session.',
        account: 'Elite streamer, signed-in viewer, Admin',
        timing: 'Run after a successful live session',
        instructions: [
          'Keep the stream live for more than ten minutes, send at least one viewer heartbeat by watching from a signed-in account, then stop the stream.',
          'Wait for Mux to emit the idle and live_stream_completed events, then refresh the streamer and viewer surfaces.',
          'Check rewards, replay availability, and any operational logs or database traces you use during launch verification.',
        ],
        passIf: [
          'Viewer RP accrues in 10-minute blocks without exceeding the 20 RP daily cap across streams.',
          'The streamer receives the go-live bonus once for a qualifying session longer than ten minutes.',
          'The replay becomes available on the live page after the finalized recording webhook arrives.',
        ],
        watchFor: [
          'Do not rely on the disconnected event alone to mark the stream ended.',
          'Webhook retries must stay idempotent and should not duplicate RP awards or overwrite a finalized replay incorrectly.',
        ],
        links: [
          makeAppLink('/rewards', 'Rewards'),
          makeAdminLink('/admin/logs', 'Admin logs'),
        ],
      },
    ],
  },
  {
    id: 'growth-billing',
    title: 'Rewards, Billing, and Retention',
    description:
      'Cover bounties, points, redemption, partner flows, suggestions, and upgrade checkout paths that shape retention.',
    goal: 'Exit this section knowing the growth and money-adjacent paths feel safe and understandable.',
    items: [
      {
        id: 'GROW-01',
        title: 'Rewards page loads the wallet, recent redemptions, and recent activity together.',
        account: 'Player A',
        instructions: [
          'Open rewards and scan wallet value, points balances, ways to earn, recent redemptions, and recent activity.',
          'Refresh after one action if any reward-related action is available on the page.',
        ],
        passIf: [
          'The page renders as one coherent rewards surface rather than partial fragments.',
          'Wallet value, balances, redemption history, and activity do not visibly contradict each other.',
        ],
        links: [makeAppLink('/rewards', 'Rewards')],
      },
      {
        id: 'GROW-02',
        title: 'Redeem requests stay inside Mechi after submission.',
        account: 'Player A',
        timing: 'Run last',
        instructions: [
          'Open the redeem page, choose one low-risk reward package, and submit it with a valid M-Pesa number.',
          'Refresh rewards after redeeming and confirm the request status stays visible without sending the player outside Mechi.',
        ],
        passIf: [
          'The redeem flow completes on Mechi without any account-link or partner handoff.',
          'The redemption request and fulfillment progress remain visible on Mechi after refresh.',
        ],
        watchFor: ['Use a safe low-value reward package when running this check on a live-like environment.'],
        links: [makeAppLink('/rewards/redeem', 'Redeem rewards')],
      },
      {
        id: 'GROW-03',
        title: 'Suggestions can be created and voted on without odd duplicates.',
        account: 'Player A and Player B',
        instructions: [
          'Create a new suggestion from one account, then vote on it from another account.',
          'Refresh the suggestion list on both accounts after the vote lands.',
        ],
        passIf: [
          'The new suggestion appears quickly and keeps a stable identity after refresh.',
          'Vote behavior is clear and does not produce duplicate state or phantom counts.',
        ],
        links: [makeAppLink('/suggest', 'Suggestions')],
      },
      {
        id: 'GROW-04',
        title: 'Pricing upgrade and Paystack checkout callback feel correct.',
        account: 'Fresh free player',
        timing: 'Run last',
        instructions: [
          'Start an upgrade from pricing or another gated surface and follow the Paystack handoff using a reversible test path.',
          'Exercise one successful or safe completion path and one cancel or return path if possible.',
        ],
        passIf: [
          'Selected plan, checkout handoff, and return state stay consistent across the flow.',
          'Cancel or retry behavior is understandable and does not strand the user.',
        ],
        watchFor: ['Prefer sandbox or the smallest safe live amount.'],
        links: [
          makeAppLink('/pricing', 'Pricing'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
      {
        id: 'GROW-05',
        title: 'Plan updates show up in player-facing surfaces after upgrade or entitlement change.',
        account: 'Upgraded player',
        instructions: [
          'After any plan change, revisit dashboard, profile settings, pricing, and a gated surface such as tournament creation.',
          'Compare what each surface says about the current plan or entitlement.',
        ],
        passIf: [
          'The visible plan name or gating state is consistent across the app.',
          'The user no longer sees stale free-plan restrictions if the upgrade succeeded.',
        ],
        links: [
          makeAppLink('/dashboard', 'Dashboard'),
          makeAppLink('/profile/settings', 'Profile settings'),
          makeAppLink('/tournaments/create', 'Tournament create'),
        ],
      },
      {
        id: 'GROW-07',
        title: 'Bounties page shows live challenges, claimed history, and payout messaging coherently.',
        account: 'Player A',
        instructions: [
          'Open bounties, review the live challenge cards, then expand the claimed history section once.',
          'Refresh the page and compare the live count, claimed winners, and payout language for any stale or contradictory state.',
        ],
        passIf: [
          'Active bounties load as deliberate challenge cards instead of empty placeholders or broken sections.',
          'Claimed history expands cleanly, winner states feel plausible, and the payout copy stays consistent across refresh.',
        ],
        links: [
          makeAppLink('/bounties', 'Bounties'),
          makeAppLink('/rewards', 'Rewards'),
        ],
      },
    ],
  },
  {
    id: 'share',
    title: 'Share and Public Pages',
    description:
      'Verify the public-facing surfaces generated from player activity still present Mechi cleanly to anonymous visitors.',
    goal: 'Exit this section knowing public links are safe to share outside the signed-in app.',
    items: [
      {
        id: 'SHARE-01',
        title: 'Public player share page renders a real-looking profile card.',
        account: 'Anon',
        instructions: [
          'Generate a player share URL from the signed-in app and open it in an anonymous tab.',
          'Compare the public card with the latest profile details for that user.',
        ],
        passIf: [
          'The public profile loads without auth and shows the right user identity.',
          'Layout, metadata, and visible stats feel deliberate and not half-rendered.',
        ],
        links: [
          makeAppLink('/share', 'Share center'),
          makeAppLink('/profile', 'Profile'),
        ],
      },
      {
        id: 'SHARE-02',
        title: 'Public match share page represents the tested match accurately.',
        account: 'Anon',
        instructions: [
          'Generate a public match URL from a real completed or live match and open it in an anonymous tab.',
          'Compare the winner, game, and visible summary with the underlying match.',
        ],
        passIf: [
          'The public match page loads without auth and reflects the right match identity.',
          'The surface looks complete enough to share externally.',
        ],
        links: [
          makeAppLink('/share', 'Share center'),
          makeAppLink('/dashboard', 'Dashboard'),
        ],
      },
      {
        id: 'SHARE-03',
        title: 'Public tournament share page or bracket page matches the live tournament state.',
        account: 'Anon',
        instructions: [
          'Open a generated public tournament URL from a real tournament in a fresh anonymous tab.',
          'Compare tournament status, participants, or bracket clues with the signed-in tournament page.',
        ],
        passIf: [
          'The public tournament page loads without auth barriers.',
          'Public-facing tournament information stays aligned with the current tournament state.',
        ],
        links: [
          makeAppLink('/tournaments', 'Tournaments'),
          makeAppLink('/share', 'Share center'),
        ],
      },
      {
        id: 'SHARE-04',
        title: 'Cross-host routing keeps users on the intended host.',
        account: 'Anon and Admin',
        instructions: [
          'Move between tests, the main app, and admin using fresh tabs plus direct URL entry.',
          'Verify one player route, one admin route, and one public route on their intended hosts.',
        ],
        passIf: [
          'Main app routes stay on mechi.club and admin stays on mechi.lokimax.top.',
          'No host redirects the user into the wrong product surface unexpectedly.',
        ],
        links: [
          makeAbsoluteLink(TESTS_URL, 'Tests host'),
          makeAppLink('/dashboard', 'App dashboard'),
          makeAdminLink('/admin', 'Admin'),
        ],
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin and Ops',
    description:
      'Review the operational surfaces that keep moderation, support, and comms safe once player flows create real incidents.',
    goal: 'Exit this section knowing admins can inspect, moderate, and communicate without broken workflow gaps.',
    items: [
      {
        id: 'ADMIN-01',
        title: 'Admin home loads real KPI cards and stable navigation.',
        account: 'Admin',
        instructions: [
          'Open the admin home directly on mechi.lokimax.top and move through the primary navigation once.',
          'Compare at least one KPI or attention lane with another admin detail page.',
        ],
        passIf: [
          'Admin navigation is stable and clearly distinct from the player app.',
          'Overview cards show meaningful operational data instead of empty placeholders.',
        ],
        links: [
          makeAdminLink('/admin', 'Admin home'),
          makeAdminLink('/admin/users', 'Admin users'),
        ],
      },
      {
        id: 'ADMIN-02',
        title: 'Users admin supports search, detail inspection, and moderation actions.',
        account: 'Admin',
        instructions: [
          'Search for a known player, open the detail pane, and inspect account, plan, and recent activity sections.',
          'Perform one safe moderation action such as ban, unban, or role update if your test environment allows it.',
        ],
        passIf: [
          'Search returns the correct user quickly and detail panels load without stale shells.',
          'Moderation actions acknowledge success and update the visible account state after refresh.',
        ],
        links: [makeAdminLink('/admin/users', 'Admin users')],
      },
      {
        id: 'ADMIN-03',
        title: 'Queue admin page supports filtering, inspection, and reconciliation workflow.',
        account: 'Admin',
        instructions: [
          'Open the queue admin lane, use search or filters, and inspect a real waiting entry.',
          'If a safe reconcile action exists, run it once against a controlled test scenario.',
        ],
        passIf: [
          'Queue filters return believable results and entry cards stay readable.',
          'Operational actions refresh the lane instead of leaving stale queue state behind.',
        ],
        links: [makeAdminLink('/admin/queue', 'Admin queue')],
      },
      {
        id: 'ADMIN-04',
        title: 'Matches admin lane can inspect disputes and apply admin decisions.',
        account: 'Admin',
        instructions: [
          'Open a real match record, especially one from a disputed or escalated flow if available.',
          'Review the detail view and exercise one safe admin action or reply path.',
        ],
        passIf: [
          'The match detail loads enough context for a decision.',
          'Admin actions update the match record and leave a coherent player-facing state.',
        ],
        links: [makeAdminLink('/admin/matches', 'Admin matches')],
      },
      {
        id: 'ADMIN-05',
        title: 'Tournament and lobby moderation surfaces stay operational.',
        account: 'Admin',
        instructions: [
          'Open both the tournaments and lobbies admin pages, then inspect at least one real record on each.',
          'Use one safe moderation or review action if the environment supports it.',
        ],
        passIf: [
          'Both lanes load meaningful records and detail views without broken UI.',
          'Moderation affordances are visible and behave predictably after refresh.',
        ],
        links: [
          makeAdminLink('/admin/tournaments', 'Admin tournaments'),
          makeAdminLink('/admin/lobbies', 'Admin lobbies'),
        ],
      },
      {
        id: 'ADMIN-06',
        title: 'Rewards fulfillment lane supports processing and rejection actions.',
        account: 'Admin',
        instructions: [
          'Open admin rewards, use the available filters, and inspect at least one redemption request.',
          'Perform one safe processing, complete, reject, or note action if your test path allows it.',
        ],
        passIf: [
          'Queue items expose enough player, reward, and M-Pesa context to make a decision.',
          'Queue actions refresh the record cleanly without leaving a mismatched status.',
        ],
        links: [makeAdminLink('/admin/rewards', 'Admin rewards')],
      },
      {
        id: 'ADMIN-07',
        title: 'Support inbox can load a thread, send a reply, and update conversation state.',
        account: 'Admin',
        instructions: [
          'Open support, load a real thread, and inspect its transcript plus any status controls.',
          'Send one safe reply or status update and then refresh the thread.',
        ],
        passIf: [
          'Messages render in order and the new reply appears exactly once.',
          'Thread status stays readable after refresh instead of reverting or duplicating state.',
        ],
        links: [makeAdminLink('/admin/support', 'Admin support')],
      },
      {
        id: 'ADMIN-08',
        title: 'WhatsApp ops, Instagram ops, and logs page all remain usable.',
        account: 'Admin',
        timing: 'Run last',
        instructions: [
          'Open WhatsApp ops, Instagram ops, and logs in separate tabs and inspect the main controls or log output.',
          'If a safe preview or test-send path exists, use it once without contacting a real user unintentionally.',
        ],
        passIf: [
          'Each operational page loads enough state to be usable by a human operator.',
          'Logs render with readable entries and comms surfaces do not break when refreshed.',
        ],
        watchFor: ['Use only controlled recipients or preview paths for communications checks.'],
        links: [
          makeAdminLink('/admin/whatsapp', 'WhatsApp ops'),
          makeAdminLink('/admin/instagram', 'Instagram ops'),
          makeAdminLink('/admin/logs', 'Logs'),
        ],
      },
      {
        id: 'ADMIN-09',
        title: 'Bounties admin supports draft creation, activation, and payout handling.',
        account: 'Admin',
        instructions: [
          'Open admin bounties, create one safe draft, and confirm it appears in the control room with the expected trigger, prize, and week label.',
          'If the environment already has a controlled bounty, test one lifecycle action such as Go Live, Cancel, or Mark Paid and then refresh the lane.',
        ],
        passIf: [
          'Draft creation returns a visible bounty card with the right metadata instead of a silent failure.',
          'Lifecycle actions update status cleanly after refresh and do not leave the bounty in a contradictory payout state.',
        ],
        watchFor: ['Only send a bounty live when the environment and audience are safe for a real claim attempt.'],
        links: [
          makeAdminLink('/admin/bounties', 'Admin bounties'),
          makeAppLink('/bounties', 'Player bounties'),
        ],
      },
    ],
  },
] satisfies ManualTestSection[];

export const manualTestTotalChecks = manualTestSections.reduce(
  (count, section) => count + section.items.length,
  0
);
