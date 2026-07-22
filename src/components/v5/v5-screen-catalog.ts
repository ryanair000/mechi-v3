export type V5Tone = 'teal' | 'warning' | 'danger' | 'neutral';

export type V5Metric = {
  label: string;
  value: string;
  help: string;
};

export type V5Row = {
  title: string;
  meta: string;
  status: string;
  tone?: V5Tone;
  href?: string;
};

export type V5ScreenDefinition = {
  slug: string;
  active: 'Play' | 'Watch' | 'Rankings' | 'Community' | 'Account' | 'Admin';
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  metrics: [V5Metric, V5Metric, V5Metric];
  mainTitle: string;
  rows: V5Row[];
  sideTitle: string;
  sideItems: string[];
  mobileTitle: string;
};

const screen = (
  definition: V5ScreenDefinition
): V5ScreenDefinition => definition;

export const V5_SCREEN_CATALOG: V5ScreenDefinition[] = [
  screen({
    slug: 'games',
    active: 'Play',
    eyebrow: 'Discover',
    title: 'Find your game. Build your record.',
    description:
      'Browse supported games, active communities, ladders, and tournaments from one calm directory.',
    primaryLabel: 'Browse tournaments',
    primaryHref: '/v5/tournaments',
    metrics: [
      { label: 'Supported games', value: '12', help: 'Console, PC and mobile' },
      { label: 'Open tournaments', value: '36', help: 'Free and approved paid' },
      { label: 'Regional ladders', value: '4', help: 'Kenya-first at launch' },
    ],
    mainTitle: 'Games you can compete in',
    rows: [
      { title: 'eFootball', meta: '14 open tournaments · 8,420 ranked players', status: 'Popular' },
      { title: 'PUBG Mobile', meta: '9 tournaments · Solo and squad', status: 'Live' },
      { title: 'Call of Duty Mobile', meta: '7 tournaments · MP and BR', status: 'Growing' },
      { title: 'EA SPORTS FC', meta: '6 tournaments · Console', status: 'New' },
    ],
    sideTitle: 'Your game shortcuts',
    sideItems: ['Followed games', 'Recently played', 'Platform compatibility', 'Suggest a game'],
    mobileTitle: 'eFootball game hub',
  }),
  screen({
    slug: 'watch',
    active: 'Watch',
    eyebrow: 'Watch',
    title: 'Watch competition as it happens.',
    description:
      'Live tournaments, scheduled streams, verified match context, and replays without losing the bracket.',
    primaryLabel: 'Explore live events',
    primaryHref: '/streams',
    metrics: [
      { label: 'Live now', value: '8', help: 'Verified tournament streams' },
      { label: 'This week', value: '32', help: 'Upcoming broadcasts' },
      { label: 'Following', value: '5', help: 'Creators and events' },
    ],
    mainTitle: 'Live and upcoming',
    rows: [
      { title: 'Nairobi Weekend Cup', meta: 'eFootball · Semifinal · 1.2K watching', status: 'LIVE', tone: 'danger' },
      { title: 'CODM City Qualifiers', meta: 'Round 3 starts in 18 min', status: 'Soon', tone: 'warning' },
      { title: 'PUBG Squad Clash', meta: 'Grand final · 20:00 EAT', status: 'Tonight' },
      { title: 'Mechi Masters Replay', meta: 'Final · Chaptered replay', status: 'Replay', tone: 'neutral' },
    ],
    sideTitle: 'Viewer context',
    sideItems: ['Current match and score', 'Bracket position', 'Streamer channel', 'Report stream issue'],
    mobileTitle: 'Live stream viewer',
  }),
  screen({
    slug: 'search',
    active: 'Community',
    eyebrow: 'Search',
    title: 'Search all of Mechi.',
    description:
      'Find tournaments, games, players, teams, organizers, streams, and help from one predictable result model.',
    primaryLabel: 'Browse all tournaments',
    primaryHref: '/v5/tournaments',
    metrics: [
      { label: 'All results', value: '128', help: 'For Nairobi' },
      { label: 'People and teams', value: '48', help: 'Ranked by relevance' },
      { label: 'Tournaments', value: '31', help: 'Open and completed' },
    ],
    mainTitle: 'Best matches',
    rows: [
      { title: 'Nairobi Weekend Cup', meta: 'Tournament · Registration open', status: 'Open' },
      { title: 'Nairobi Lions', meta: 'Team · eFootball · Rank #12', status: 'Team', tone: 'neutral' },
      { title: '@nairobigamer', meta: 'Player · 91% reliability', status: 'Player', tone: 'neutral' },
      { title: 'Arena 254', meta: 'Verified organizer · 42 events', status: 'Verified' },
    ],
    sideTitle: 'Refine results',
    sideItems: ['Result type', 'Game and platform', 'Region', 'Status and date'],
    mobileTitle: 'Search results and filters',
  }),
  screen({
    slug: 'explore',
    active: 'Community',
    eyebrow: 'Explore Kenya',
    title: 'Your competitive gaming community, nearby.',
    description:
      'Local tournaments, rankings, communities, streams, and trusted organizers in one regional view.',
    primaryLabel: 'Browse Kenya events',
    primaryHref: '/v5/tournaments',
    metrics: [
      { label: 'Open events', value: '18', help: 'Across four games' },
      { label: 'Ranked players', value: '12.4K', help: 'Kenya leaderboard' },
      { label: 'Verified organizers', value: '27', help: 'Local and online' },
    ],
    mainTitle: 'Trending in Kenya',
    rows: [
      { title: 'Kenya eFootball Open', meta: 'Free entry · 248 registered', status: 'Open' },
      { title: 'Nairobi CODM Nights', meta: 'Shop-hosted · Local finals', status: 'Local' },
      { title: 'PUBG Kenya Ladder', meta: 'Season 3 · Squad ranking', status: 'Ranked' },
      { title: 'Mombasa Gaming Hub', meta: 'Verified shop organizer', status: 'Trusted' },
    ],
    sideTitle: 'Change context',
    sideItems: ['Region: Kenya', 'Game: All games', 'Platform: Any', 'Followed communities'],
    mobileTitle: 'Kenya landing page',
  }),
  screen({
    slug: 'workspaces',
    active: 'Account',
    eyebrow: 'Account',
    title: 'One account. Choose what you want to do.',
    description:
      'Move between playing, managing a team, hosting, and creating content from the same account.',
    primaryLabel: 'Create account',
    primaryHref: '/register',
    metrics: [
      { label: 'Ways you use Mechi', value: '4', help: 'Player, team, host, and creator' },
      { label: 'Pending access', value: '1', help: 'Company verification' },
      { label: 'Security checks', value: 'All clear', help: 'Last review today' },
    ],
    mainTitle: 'What do you want to do?',
    rows: [
      { title: 'Gamer workspace', meta: 'Personal · Gamer', status: 'Current' },
      { title: 'Nairobi Lions', meta: 'Team · Captain', status: 'Ready' },
      { title: 'Arena 254', meta: 'Organization · Owner', status: 'Ready' },
      { title: 'Mechi Energy', meta: 'Company · Analyst', status: 'Pending', tone: 'warning' },
    ],
    sideTitle: 'Access and safety',
    sideItems: ['Role permissions', 'Identity verification', 'Organization ownership', 'Sign out all sessions'],
    mobileTitle: 'Switch what you are doing',
  }),
  screen({
    slug: 'onboarding/organization',
    active: 'Account',
    eyebrow: 'Onboarding',
    title: 'Set up a trusted organization.',
    description:
      'Create a company, organizer, or gaming-shop workspace with clear ownership, staff access, verification, and recovery.',
    primaryLabel: 'Continue setup',
    primaryHref: '/register',
    metrics: [
      { label: 'Setup progress', value: '4 of 6', help: 'Saved automatically' },
      { label: 'Verification', value: 'Pending', help: 'Owner document review' },
      { label: 'Staff access', value: '1 member', help: 'Invite after ownership' },
    ],
    mainTitle: 'Setup checklist',
    rows: [
      { title: 'Organization profile', meta: 'Name, region, type, and public identity', status: 'Complete' },
      { title: 'Ownership verification', meta: 'Owner identity and authority to represent', status: 'Review', tone: 'warning' },
      { title: 'Staff and permissions', meta: 'Invite people with least-privilege roles', status: 'Next' },
      { title: 'Finance readiness', meta: 'Paystack settlement and payout contact', status: 'Locked', tone: 'neutral' },
    ],
    sideTitle: 'Why Mechi asks',
    sideItems: ['Protect organizer identity', 'Prevent payout fraud', 'Keep staff access auditable', 'Recover ownership safely'],
    mobileTitle: 'Organization setup',
  }),
  screen({
    slug: 'onboarding/streamer',
    active: 'Account',
    eyebrow: 'Streamer',
    title: 'Turn tournaments into credible content.',
    description:
      'Connect channels, choose coverage games, request assignments, and publish streams with verified tournament context.',
    primaryLabel: 'Open creator studio',
    primaryHref: '/creator',
    metrics: [
      { label: 'Channels', value: '2 linked', help: 'YouTube and Twitch' },
      { label: 'Coverage games', value: '3', help: 'eFootball, CODM, PUBG' },
      { label: 'Assignments', value: '1 pending', help: 'Organizer review' },
    ],
    mainTitle: 'Coverage setup',
    rows: [
      { title: 'Channel identity', meta: '@mechistreams · ownership verified', status: 'Ready' },
      { title: 'Games and language', meta: '3 games · English and Swahili', status: 'Ready' },
      { title: 'Availability', meta: 'Weekends · 18:00-23:00 EAT', status: 'Set' },
      { title: 'Coverage request', meta: 'Nairobi Weekend Cup semifinal', status: 'Pending', tone: 'warning' },
    ],
    sideTitle: 'Streamer safety',
    sideItems: ['Copyright acknowledgement', 'Chat moderation owner', 'Match-delay policy', 'Disconnect recovery'],
    mobileTitle: 'Streamer setup',
  }),
  screen({
    slug: 'onboarding/coach',
    active: 'Account',
    eyebrow: 'Coach',
    title: 'Build authority through visible expertise.',
    description:
      'Publish expertise, guides, match analysis, and team preparation evidence. Coach booking is intentionally outside V5.',
    primaryLabel: 'Build coach profile',
    primaryHref: '/register',
    metrics: [
      { label: 'Expertise areas', value: '4', help: 'Games and disciplines' },
      { label: 'Published guides', value: '12', help: 'Public authority' },
      { label: 'Verification', value: 'In review', help: 'No booking enabled' },
    ],
    mainTitle: 'Authority setup',
    rows: [
      { title: 'Coach profile', meta: 'Bio, games, region, and experience', status: 'Complete' },
      { title: 'Expertise evidence', meta: 'Tournament record and guide samples', status: 'Review', tone: 'warning' },
      { title: 'Public guides', meta: 'Two drafts ready to publish', status: 'Draft', tone: 'neutral' },
      { title: 'Booking unavailable in V5', meta: 'No hourly sessions or marketplace controls', status: 'Unavailable', tone: 'neutral' },
    ],
    sideTitle: 'Public trust',
    sideItems: ['Evidence-backed claims', 'Disclosure and conflicts', 'Guide report flow', 'No direct booking in V5'],
    mobileTitle: 'Coach authority profile',
  }),
  screen({
    slug: 'organizer',
    active: 'Play',
    eyebrow: 'Organizer',
    title: 'Run credible tournaments. Prove the work.',
    description:
      'Manage upcoming events, resolve operational risk, and build a public portfolio from verified results and delivery quality.',
    primaryLabel: 'Create tournament',
    primaryHref: '/tournaments/create',
    metrics: [
      { label: 'Completed events', value: '42', help: '38 free · 4 approved paid' },
      { label: 'Delivery score', value: '96%', help: 'Check-in, results, disputes' },
      { label: 'Open actions', value: '3', help: 'One needs attention' },
    ],
    mainTitle: 'Organizer activity',
    rows: [
      { title: 'Nairobi Weekend Cup', meta: 'Registration open · 184 of 256', status: 'Healthy' },
      { title: 'CODM City Qualifiers', meta: 'Check-in starts in 2 hours', status: 'Action', tone: 'warning' },
      { title: 'Mechi Masters #9', meta: 'Payout evidence under review', status: 'Review', tone: 'warning' },
      { title: 'Community Sprint #14', meta: 'Completed · report published', status: 'Complete' },
    ],
    sideTitle: 'Credibility checklist',
    sideItems: ['Publish rules before entry', 'Record every result', 'Resolve disputes on time', 'Keep sponsor evidence'],
    mobileTitle: 'Organizer home',
  }),
  screen({
    slug: 'sponsor',
    active: 'Community',
    eyebrow: 'Sponsor',
    title: 'Reach gaming communities with evidence.',
    description:
      'Build a sponsorship brief, compare credible tournaments, approve deliverables, and export measurable campaign proof.',
    primaryLabel: 'Create brief',
    primaryHref: '/register',
    metrics: [
      { label: 'Open opportunities', value: '18', help: 'Matched to your audience' },
      { label: 'Active campaigns', value: '2', help: 'KES 180K committed' },
      { label: 'Evidence ready', value: '1 report', help: 'Awaiting export' },
    ],
    mainTitle: 'Sponsor pipeline',
    rows: [
      { title: 'Kenya eFootball Open', meta: 'Proposal received · 248 expected players', status: 'Review', tone: 'warning' },
      { title: 'Nairobi Weekend Cup', meta: 'Active · 6 of 8 deliverables verified', status: 'Active' },
      { title: 'PUBG Kenya Ladder', meta: 'Saved opportunity · national reach', status: 'Saved', tone: 'neutral' },
      { title: 'CODM City Finals', meta: 'Campaign complete · report ready', status: 'Report' },
    ],
    sideTitle: 'Brief requirements',
    sideItems: ['Audience and region', 'Budget and timeline', 'Required deliverables', 'Brand safety exclusions'],
    mobileTitle: 'Sponsor dashboard',
  }),
  screen({
    slug: 'streamer/live',
    active: 'Watch',
    eyebrow: 'Streamer',
    title: 'Cover Nairobi Weekend Cup live.',
    description:
      'A focused console for assignment acceptance, stream checks, match context, delay, moderation ownership, and disconnect recovery.',
    primaryLabel: 'Open live setup',
    primaryHref: '/creator/live',
    metrics: [
      { label: 'Assignment', value: 'Approved', help: 'Semifinal A' },
      { label: 'Match starts', value: '18 min', help: '19:30 EAT' },
      { label: 'Required delay', value: '90 sec', help: 'Organizer policy' },
    ],
    mainTitle: 'Broadcast checklist',
    rows: [
      { title: 'Channel connection', meta: 'YouTube @mechistreams', status: 'Ready' },
      { title: 'Match source', meta: 'Room code and observer access', status: 'Ready' },
      { title: 'Moderation owner', meta: '@modkevin assigned', status: 'Ready' },
      { title: 'Connection fallback', meta: 'Backup ingest not tested', status: 'Action', tone: 'warning' },
    ],
    sideTitle: 'Live match context',
    sideItems: ['Competitors and score', 'Bracket and next match', 'Sponsor deliverables', 'Report integrity issue'],
    mobileTitle: 'Live coverage console',
  }),
  screen({
    slug: 'coach/workbench',
    active: 'Community',
    eyebrow: 'Coach',
    title: 'Prepare teams with evidence, not promises.',
    description:
      'Create public guides, match analysis, and private preparation plans while preserving player consent and competitive integrity.',
    primaryLabel: 'Create analysis',
    primaryHref: '/creator',
    metrics: [
      { label: 'Published guides', value: '12', help: '4,840 total reads' },
      { label: 'Draft analyses', value: '3', help: 'Two need evidence' },
      { label: 'Team plans', value: '2', help: 'Consent active' },
    ],
    mainTitle: 'Coaching work',
    rows: [
      { title: 'Counter-pressing after minute 60', meta: 'eFootball guide · Public', status: 'Published' },
      { title: 'Nairobi Lions semifinal review', meta: 'Match analysis · Private', status: 'Draft', tone: 'neutral' },
      { title: 'CODM rotation timing', meta: 'Guide · Evidence attached', status: 'Review', tone: 'warning' },
      { title: 'Team preparation plan', meta: 'Shared with 5 consenting players', status: 'Active' },
    ],
    sideTitle: 'Authority safeguards',
    sideItems: ['Evidence and citations', 'Player consent', 'Conflict disclosure', 'Report misleading claims'],
    mobileTitle: 'Coach workbench',
  }),
  screen({
    slug: 'shop',
    active: 'Community',
    eyebrow: 'Gaming shop',
    title: 'Run credible local tournaments from one venue.',
    description:
      'Manage venue identity, staff permissions, station readiness, check-in, and local-event operations. Hourly gaming bookings are outside V5.',
    primaryLabel: 'Create local event',
    primaryHref: '/tournaments/create',
    metrics: [
      { label: 'Stations', value: '12', help: '10 ready · 2 service' },
      { label: 'Staff', value: '4', help: 'Roles assigned' },
      { label: 'Upcoming events', value: '3', help: 'Next: Saturday' },
    ],
    mainTitle: 'Venue readiness',
    rows: [
      { title: 'Venue profile', meta: 'Arena 254 · Nairobi CBD', status: 'Verified' },
      { title: 'Station checklist', meta: '10 of 12 consoles ready', status: 'Action', tone: 'warning' },
      { title: 'Event staff', meta: 'Check-in, referee, tech support', status: 'Ready' },
      { title: 'Hourly gaming unavailable in V5', meta: 'No station reservation or checkout', status: 'Unavailable', tone: 'neutral' },
    ],
    sideTitle: 'Local event setup',
    sideItems: ['Capacity and station map', 'Check-in queue', 'Local network test', 'Incident and refund rules'],
    mobileTitle: 'Shop event setup',
  }),
  screen({
    slug: 'admin/operations',
    active: 'Admin',
    eyebrow: 'Mechi admin',
    title: 'Mechi operations, one calm queue.',
    description:
      'Prioritize approvals, moderation, verification, payouts, and incidents by user harm, money risk, and service-level target.',
    primaryLabel: 'Open admin console',
    primaryHref: '/admin',
    metrics: [
      { label: 'Needs attention', value: '18', help: '4 urgent' },
      { label: 'Payout holds', value: '4', help: 'KES 86K protected' },
      { label: 'Platform health', value: '99.98%', help: 'No active incident' },
    ],
    mainTitle: 'Priority work',
    rows: [
      { title: 'Paid tournament approvals', meta: '12 waiting · oldest 3h', status: 'Attention', tone: 'warning' },
      { title: 'Open disputes and appeals', meta: '8 cases · 2 bracket holds', status: 'Urgent', tone: 'danger' },
      { title: 'Identity verification', meta: '21 waiting · oldest 9h', status: 'Queue', tone: 'neutral' },
      { title: 'Payout releases', meta: '4 held · dual approval', status: 'High risk', tone: 'danger' },
    ],
    sideTitle: 'Operator controls',
    sideItems: ['Queue ownership', 'Shift handoff', 'Incident escalation', 'Immutable audit search'],
    mobileTitle: 'Admin operations',
  }),
  screen({
    slug: 'admin/tournaments',
    active: 'Admin',
    eyebrow: 'Trust and safety',
    title: 'Approve paid tournaments with evidence.',
    description:
      'Review organizer identity, entry model, reward funding, rules, player protections, disputes, and payout readiness before publication.',
    primaryLabel: 'Open tournament queue',
    primaryHref: '/admin/tournaments',
    metrics: [
      { label: 'Awaiting review', value: '12', help: 'Oldest 3h 18m' },
      { label: 'Need information', value: '5', help: 'Organizer response' },
      { label: 'Approved today', value: '9', help: 'Median 22 minutes' },
    ],
    mainTitle: 'Tournament review queue',
    rows: [
      { title: 'Nairobi Weekend Cup', meta: '#TRN-2048 · KES 300 entry · funded prize', status: 'Urgent', tone: 'danger' },
      { title: 'CODM City Finals', meta: '#TRN-2051 · KES 200 · shop-hosted', status: 'Review', tone: 'warning' },
      { title: 'PUBG Kenya Ladder', meta: '#TRN-2057 · season rewards', status: 'Info', tone: 'neutral' },
      { title: 'eFootball Community Free', meta: '#TRN-2060 · no entry or reward', status: 'Auto eligible' },
    ],
    sideTitle: 'Approval checklist',
    sideItems: ['Organizer and ownership', 'Fee, reward, and funding', 'Rules and refund policy', 'Dispute and payout readiness'],
    mobileTitle: 'Tournament review',
  }),
  screen({
    slug: 'admin/sponsorships',
    active: 'Admin',
    eyebrow: 'Sponsor review',
    title: 'Protect sponsors and gaming communities.',
    description:
      'Validate campaign claims, brand safety, organizer authority, deliverables, evidence requirements, and payment milestones.',
    primaryLabel: 'Open review queue',
    primaryHref: '/admin',
    metrics: [
      { label: 'Proposals waiting', value: '7', help: 'Two need attention' },
      { label: 'Active campaigns', value: '14', help: '3 milestone checks' },
      { label: 'Evidence gaps', value: '5', help: 'Payment paused' },
    ],
    mainTitle: 'Sponsorship review queue',
    rows: [
      { title: 'Kenya eFootball Open', meta: 'Mechi Energy · KES 120K · 8 deliverables', status: 'Review', tone: 'warning' },
      { title: 'Nairobi CODM Nights', meta: 'Telco brief · minors audience check', status: 'Attention', tone: 'warning' },
      { title: 'PUBG Kenya Ladder', meta: 'Evidence milestone 2 of 3', status: 'Hold', tone: 'danger' },
      { title: 'Mombasa Shop Finals', meta: 'Final report ready for sponsor', status: 'Ready' },
    ],
    sideTitle: 'Campaign safeguards',
    sideItems: ['Audience and age suitability', 'Brand and organizer authority', 'Deliverable measurability', 'Milestone payment evidence'],
    mobileTitle: 'Sponsor review',
  }),
  screen({
    slug: 'admin/verifications',
    active: 'Admin',
    eyebrow: 'Verification',
    title: 'Verify people and organizations safely.',
    description:
      'Check identity, role authority, organization ownership, document freshness, duplicates, and recovery contacts without exposing sensitive data.',
    primaryLabel: 'Open verification queue',
    primaryHref: '/admin/users',
    metrics: [
      { label: 'People waiting', value: '16', help: 'Oldest 7h' },
      { label: 'Organizations', value: '5', help: 'Two ownership checks' },
      { label: 'Re-checks due', value: '8', help: 'High-trust roles' },
    ],
    mainTitle: 'Verification queue',
    rows: [
      { title: 'Arena 254 ownership', meta: 'Gaming shop · Director authority', status: 'Attention', tone: 'warning' },
      { title: 'Mechi Energy sponsor', meta: 'Company · Domain and owner match', status: 'Review', tone: 'warning' },
      { title: '@coachmusa expertise', meta: 'Coach · Evidence verification', status: 'Queue', tone: 'neutral' },
      { title: 'Nairobi Lions captain', meta: 'Team role recovery request', status: 'Urgent', tone: 'danger' },
    ],
    sideTitle: 'Verification principles',
    sideItems: ['Show minimum sensitive data', 'Record reason and source', 'Separate identity from authority', 'Provide appeal and recovery'],
    mobileTitle: 'Verification case',
  }),
  screen({
    slug: 'admin/moderation',
    active: 'Admin',
    eyebrow: 'Moderation',
    title: 'Resolve reports with context and appeal.',
    description:
      'Bring messages, match evidence, prior actions, policy, user safety, and bracket impact into one chronological case view.',
    primaryLabel: 'Open support inbox',
    primaryHref: '/admin/support',
    metrics: [
      { label: 'Open reports', value: '23', help: '6 need action' },
      { label: 'Appeals', value: '5', help: 'Oldest 11h' },
      { label: 'Bracket holds', value: '2', help: 'Competition paused' },
    ],
    mainTitle: 'Moderation cases',
    rows: [
      { title: 'Result manipulation report', meta: '#MOD-882 · Match 14 · bracket held', status: 'Urgent', tone: 'danger' },
      { title: 'Harassment in team chat', meta: '#MOD-887 · safety controls active', status: 'Attention', tone: 'warning' },
      { title: 'Suspension appeal', meta: '#APP-144 · new evidence attached', status: 'Review', tone: 'warning' },
      { title: 'Stream copyright report', meta: '#MOD-891 · replay hidden', status: 'Queue', tone: 'neutral' },
    ],
    sideTitle: 'Decision safeguards',
    sideItems: ['Chronology before judgment', 'Policy and precedent', 'Least harmful intervention', 'Reason, notification, appeal'],
    mobileTitle: 'Moderation case',
  }),
  screen({
    slug: 'admin/payouts',
    active: 'Admin',
    eyebrow: 'Finance ops',
    title: 'Release payouts only when evidence agrees.',
    description:
      'Verify finalized results, recipient identity, eligibility, funding, holds, dual approval, and Paystack status before money moves.',
    primaryLabel: 'Open finance queue',
    primaryHref: '/admin/rewards',
    metrics: [
      { label: 'Held payouts', value: '4', help: 'KES 86,000 protected' },
      { label: 'Ready to release', value: '7', help: 'KES 142,500' },
      { label: 'Failed transfers', value: '1', help: 'Recipient action needed' },
    ],
    mainTitle: 'Payout queue',
    rows: [
      { title: 'Nairobi Weekend Cup', meta: 'KES 24,000 · evidence matched', status: 'Ready' },
      { title: 'Mechi Masters #9', meta: 'KES 40,000 · dispute still open', status: 'Hold', tone: 'danger' },
      { title: 'CODM City Finals', meta: 'KES 18,000 · recipient mismatch', status: 'Blocked', tone: 'danger' },
      { title: 'PUBG Kenya Ladder', meta: 'KES 60,500 · second approval', status: 'Review', tone: 'warning' },
    ],
    sideTitle: 'Release checklist',
    sideItems: ['Final result and disputes', 'Recipient and eligibility', 'Funding and fees', 'Step-up and dual approval'],
    mobileTitle: 'Payout review',
  }),
  screen({
    slug: 'admin/risk',
    active: 'Admin',
    eyebrow: 'Platform ops',
    title: 'See risk, audit, and platform health together.',
    description:
      'Correlate high-risk actions, payment webhooks, authentication, moderation volume, service health, and operator access.',
    primaryLabel: 'Open audit logs',
    primaryHref: '/admin/logs',
    metrics: [
      { label: 'Service health', value: 'Healthy', help: '99.98% today' },
      { label: 'Risk alerts', value: '6', help: 'One high severity' },
      { label: 'Webhook lag', value: '4 sec', help: 'Within target' },
    ],
    mainTitle: 'Risk and health signals',
    rows: [
      { title: 'Payout release spike', meta: '3 high-value releases in 9 min', status: 'Investigate', tone: 'danger' },
      { title: 'Paystack webhook health', meta: 'All signatures valid · p95 4 sec', status: 'Healthy' },
      { title: 'Failed login cluster', meta: '18 attempts · one admin account', status: 'Blocked', tone: 'danger' },
      { title: 'Moderation volume', meta: '2.4x baseline after live final', status: 'Watch', tone: 'warning' },
    ],
    sideTitle: 'Audit controls',
    sideItems: ['Search immutable events', 'Filter actor and risk', 'Export incident timeline', 'Review operator access'],
    mobileTitle: 'Risk and health',
  }),
  screen({
    slug: 'legal/preferences',
    active: 'Account',
    eyebrow: 'Trust and privacy',
    title: 'Control consent, communications, and legal records.',
    description:
      'Plain-language choices, versioned consent history, channel-specific notifications, and an accessible path to data rights.',
    primaryLabel: 'Open privacy policy',
    primaryHref: '/privacy-policy',
    metrics: [
      { label: 'Required agreements', value: '2 current', help: 'Terms and privacy' },
      { label: 'Optional consent', value: '1 of 3', help: 'Marketing disabled' },
      { label: 'Communication channels', value: '2 active', help: 'Email and in-app' },
    ],
    mainTitle: 'Preferences and records',
    rows: [
      { title: 'Terms of service', meta: 'Accepted v5.0 · 18 Jul 2026', status: 'Current' },
      { title: 'Privacy notice', meta: 'Accepted v5.0 · Download record', status: 'Current' },
      { title: 'Marketing consent', meta: 'Promotions and partner campaigns', status: 'Off', tone: 'neutral' },
      { title: 'Tournament notifications', meta: 'Registration, match, dispute, payout', status: 'On' },
    ],
    sideTitle: 'Your controls',
    sideItems: ['Download consent history', 'Request data export', 'Deactivate account', 'Contact privacy support'],
    mobileTitle: 'Consent and preferences',
  }),
  screen({
    slug: 'index',
    active: 'Community',
    eyebrow: 'V5 source of truth',
    title: 'Every screen. Every role. One coherent system.',
    description:
      'A canonical index linking public discovery, competition, role workspaces, money, trust, operations, and recovery.',
    primaryLabel: 'Browse tournaments',
    primaryHref: '/v5/tournaments',
    metrics: [
      { label: 'Canonical pages', value: '82', help: 'Cover + 81 documented pages' },
      { label: 'Screen families', value: '61', help: 'Desktop and mobile' },
      { label: 'Reusable components', value: '42', help: 'Token-bound and stateful' },
    ],
    mainTitle: 'Screen domains',
    rows: [
      { title: 'Public discovery and identity', meta: 'Homepage, games, watch, search, profiles, auth', status: '01-15' },
      { title: 'Competition and money', meta: 'Tournament, registration, match, evidence, wallet', status: '16-28' },
      { title: 'Role workspaces', meta: 'Gamer, team, organizer, sponsor, streamer, coach, shop', status: '29-72' },
      { title: 'Trust and operations', meta: 'Approvals, moderation, verification, payouts, audit', status: '73-80' },
    ],
    sideTitle: 'Core flow map',
    sideItems: ['Discover → understand → join', 'Register → pay → confirm', 'Play → evidence → verify', 'Resolve → rank → reward'],
    mobileTitle: 'Canonical screen index',
  }),
];

export const V5_SCREEN_BY_SLUG = new Map(
  V5_SCREEN_CATALOG.map((definition) => [definition.slug, definition])
);

export function getV5Screen(slug: string) {
  return V5_SCREEN_BY_SLUG.get(slug);
}
