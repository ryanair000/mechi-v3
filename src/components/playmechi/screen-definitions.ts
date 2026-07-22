export type WorkspaceRole = 'gamer' | 'organizer' | 'partner';

export type WorkspaceSection = {
  title: string;
  eyebrow?: string;
  description?: string;
  rows?: string[][];
  bullets?: string[];
  action?: string;
  tone?: 'default' | 'teal' | 'coral' | 'warning';
};

export type WorkspaceScreenDefinition = {
  slug: string;
  figmaNode: string;
  title: string;
  pageLabel: string;
  description: string;
  role: WorkspaceRole;
  status?: string;
  statusTone?: 'teal' | 'coral' | 'warning';
  primaryAction?: string;
  secondaryAction?: string;
  tabs?: string[];
  metrics?: Array<[string, string, string?]>;
  alert?: [string, string, 'teal' | 'warning' | 'coral'];
  sections: WorkspaceSection[];
  rail?: WorkspaceSection[];
};

const tournamentTabs = ['Overview', 'Matches', 'Participants', 'Disputes', 'Finance'];

export const PLAYMECHI_SCREENS: WorkspaceScreenDefinition[] = [
  {
    slug: 'tournament-directory', figmaNode: '127:2', title: 'Find your next tournament', pageLabel: 'Tournament directory', role: 'gamer', primaryAction: 'Host tournament',
    description: 'Join credible solo or team competitions, follow live matches, and build your PlayMechi reputation.',
    metrics: [['Open', '18'], ['Live', '3'], ['Today', '6']],
    alert: ['Mechi-protected tournaments', 'Paid-entry and rewarded tournaments are approved by Mechi. Entry fees and eligible prizes are handled securely through Paystack.', 'teal'],
    sections: [
      { title: 'Open and live tournaments', description: '18 tournaments · Recommended first', rows: [['Sunday Kickoff Cup', 'eFootball', 'FREE ENTRY · NO PRIZES', 'Open'], ['Squad Rush Kenya', 'PUBG Mobile', 'FREE ENTRY · KES 5,000 PRIZE · APPROVED', 'Open'], ['CODM Night Ops', 'Call of Duty Mobile', 'KES 150 ENTRY · KES 8,000 PRIZE · APPROVED', 'Live'], ['Road to Champion', 'EA SPORTS FC 26', 'FREE ENTRY · NO PRIZES', 'Open'], ['Shop League Finals', 'eFootball', 'KES 250 ENTRY · KES 12,000 PRIZE · APPROVED', 'Live'], ['GameTown Weekly', 'Tekken 8', 'FREE ENTRY · SPONSORED REWARDS · APPROVED', 'Open']], action: 'View tournament' },
    ],
  },
  {
    slug: 'tournament-detail', figmaNode: '142:2', title: 'Squad Rush Kenya', pageLabel: 'Tournament details', role: 'gamer', status: 'Mechi approved', statusTone: 'teal', primaryAction: 'Join with team', secondaryAction: 'Share tournament',
    description: 'A credible community squad tournament for Kenyan PUBG Mobile teams. Register, check in and report results directly on PlayMechi.',
    tabs: ['Overview', 'Matches', 'Bracket', 'Participants', 'Rules', 'Stream'],
    metrics: [['Starts', 'Today · 19:00 EAT'], ['Format', 'Squad · Online'], ['Capacity', '12 / 24 teams']],
    alert: ['Mechi-approved prize protection', 'This rewarded tournament was reviewed by Mechi. Eligible prizes are paid through Paystack after verified results.', 'teal'],
    sections: [
      { title: 'About this tournament', description: 'Squad Rush Kenya brings verified local teams together in a structured PUBG Mobile competition. PlayMechi records participation, results and organizer credibility throughout the event.', bullets: ['Platform · Mobile', 'Region · Kenya', 'Perspective · TPP'] },
      { title: 'Tournament journey', rows: [['01', 'Registration closes', 'Today · 18:30'], ['02', 'Team check-in', 'Today · 18:45'], ['03', 'Group stage begins', 'Today · 19:00'], ['04', 'Finals and verified payout', 'Sun · 21:30']] },
      { title: 'Featured upcoming match', rows: [['Team Nairobi', 'VS', 'Coast Raiders', 'Today · 19:30 EAT']], action: 'View match' },
    ],
    rail: [
      { title: 'Organizer', description: 'Nairobi Esports Hub · Verified · 42 tournaments · 4.8 rating', action: 'View organizer' },
      { title: 'Prize breakdown', rows: [['1st place', 'KES 3,000'], ['2nd place', 'KES 1,500'], ['3rd place', 'KES 500']] },
      { title: 'Rules at a glance', bullets: ['Use registered team and game accounts.', 'Check in at least 15 minutes before play.', 'Players, captains and moderators may upload evidence.', 'False evidence may lead to disqualification.'], action: 'View all rules' },
    ],
  },
  {
    slug: 'host-tournament', figmaNode: '169:2', title: 'Create a credible tournament', pageLabel: 'Host tournament', role: 'organizer', primaryAction: 'Continue to format', secondaryAction: 'Save draft',
    description: 'Set the rules clearly, invite players, and let Mechi handle approval when money or rewards are involved.',
    tabs: ['1  Basics', '2  Format', '3  Schedule', '4  Review'],
    sections: [
      { title: 'What kind of tournament are you hosting?', description: 'Choose carefully. This determines whether the tournament can publish now or must be reviewed by Mechi.', rows: [['Free tournament', 'No entry fee · No cash prize or reward', 'Publish immediately'], ['Approval-required tournament', 'Entry fee or any cash or valuable reward', 'Mechi review before publishing']], tone: 'teal' },
      { title: 'Tournament basics', description: 'Give players enough information to understand the event before they join.', rows: [['Tournament name', 'e.g. Weekend Squad Clash'], ['Game', 'Select game'], ['Format', 'Team'], ['Description', 'Describe the tournament, eligibility and experience.'], ['Participant mode', 'Solo · Team']], action: 'Hosting as Mechi Arena' },
    ],
    rail: [
      { title: 'Publish readiness', tone: 'teal', bullets: ['Free entry', 'No cash prize or reward', 'Team participant mode', 'Verified organizer profile'], description: 'Approval is not required for this tournament type.', action: 'Continue to format' },
      { title: 'Money and rewards', description: 'Entry fees are collected through Mechi using Paystack. Personal payment links are not allowed.', bullets: ['Any entry fee or cash/value reward requires Mechi approval before publishing.'], action: 'View approval policy' },
    ],
  },
  {
    slug: 'registration-payment', figmaNode: '182:2', title: 'Join Squad Rush Kenya', pageLabel: 'Tournament registration', role: 'gamer', primaryAction: 'Confirm free registration', secondaryAction: 'Back to tournament',
    description: 'Confirm your team, game account and eligibility before completing registration.', tabs: ['1  Entry details', '2  Review', '3  Confirmation'],
    sections: [
      { title: 'Team entry', description: 'Select the team and confirm every player is eligible for this tournament.', rows: [['Team', 'Team Nairobi'], ['Alex M.', 'Captain · You', 'Eligible'], ['Brian K.', 'Player', 'Eligible'], ['Carol N.', 'Player', 'Eligible'], ['David P.', 'Player', 'Eligible'], ['PUBG Mobile account', 'AlexMechi_KE']], bullets: ['I will use the registered roster and game account.', 'My team will check in at least 15 minutes before play.', 'Players or moderators may upload match evidence.'] },
    ],
    rail: [
      { title: 'Registration summary', tone: 'teal', rows: [['Entry', 'FREE'], ['Team', 'Team Nairobi'], ['Players', '4 eligible'], ['Starts', 'Today · 19:00 EAT'], ['Format', 'Squad · Online']], description: 'No payment is required for this tournament.', action: 'Confirm free registration' },
      { title: 'Approved paid events', description: 'After entry validation, Mechi shows the fee, total and refund policy before opening Paystack checkout.', bullets: ['Payment owner: Mechi. Never pay an organizer directly.', 'Interrupted checkouts remain recoverable.'] },
    ],
  },
  {
    slug: 'match-room', figmaNode: '193:2', title: 'Opening round · Match 3', pageLabel: 'Match room', role: 'gamer', status: 'Ready to play', statusTone: 'teal', primaryAction: 'Submit result', secondaryAction: 'Save draft',
    description: 'Check lobby details, report the result and keep evidence attached to the match.',
    alert: ['Lobby open · Both teams checked in', 'Match starts today at 19:30 EAT. Submit the result and evidence within 30 minutes after play.', 'teal'],
    sections: [
      { title: 'Team Nairobi  VS  Coast Raiders', eyebrow: 'Opening round · Match 3', rows: [['Today · 19:30 EAT · Online', 'Evidence after play']], action: 'Enter lobby' },
      { title: 'Game lobby', rows: [['Room ID', '84PK-11'], ['Password', '••••••'], ['Server', 'Africa'], ['Start', '19:30 EAT']], action: 'Copy lobby details' },
      { title: 'Report result', description: 'Enter the final score and attach evidence. The opponent must confirm before the result is locked.', rows: [['Team Nairobi', '2', '—', '1', 'Coast Raiders'], ['round-3-scoreboard.png', 'Uploaded · 20:12'], ['lobby-result.jpg', 'Uploaded · 20:14']], action: 'Upload screenshots or video' },
    ],
    rail: [
      { title: 'Match status', tone: 'teal', bullets: ['Team Nairobi checked in', 'Coast Raiders checked in'], rows: [['Result deadline', 'Today · 20:30 EAT']], action: 'Contact moderator' },
      { title: 'Result lifecycle', bullets: ['Submit result and evidence.', 'Opponent confirms or opens a dispute.', 'Mechi locks the verified result.'] },
      { title: 'Evidence and disputes', bullets: ['Players and authorized moderators may upload evidence.', 'Every file keeps its submitter and timestamp.', 'Moderator corrections create an audit-history entry.'], action: 'View match rules' },
    ],
  },
  {
    slug: 'bracket-standings', figmaNode: '207:2', title: 'Squad Rush Kenya', pageLabel: 'Bracket and standings', role: 'gamer', description: 'Follow verified bracket progression, qualification and ranking movement.', tabs: ['Overview', 'Bracket', 'Standings', 'Results'],
    metrics: [['Stage', 'Quarter-finals'], ['Teams', '8 remaining'], ['Results', '4 verified'], ['Next', 'Semis · Today, 19:30']],
    sections: [
      { title: 'Knockout bracket', eyebrow: 'Verified results advance automatically', rows: [['QF1 · VERIFIED', 'Team Nairobi 2', 'Coast Raiders 1'], ['QF2 · VERIFIED', 'Rift Kings 0', 'Mombasa Elite 2'], ['QF3 · VERIFIED', 'Pixel Force 2', 'Nairobi Titans 0'], ['QF4 · VERIFIED', 'Eldoret Stars 1', 'Kisumu Wolves 2'], ['SF1 · UPCOMING', 'Team Nairobi', 'Mombasa Elite'], ['SF2 · UPCOMING', 'Pixel Force', 'Kisumu Wolves'], ['FINAL · UPCOMING', 'Winner SF1', 'Winner SF2']] },
      { title: 'Latest verified results', rows: [['QF 1', 'Team Nairobi', '2 – 1', 'Coast Raiders'], ['QF 2', 'Mombasa Elite', '2 – 0', 'Rift Kings'], ['QF 3', 'Pixel Force', '2 – 0', 'Nairobi Titans']], action: 'View all results' },
    ],
    rail: [
      { title: 'Standings', rows: [['1', 'Team Nairobi', '18 pts'], ['2', 'Mombasa Elite', '16 pts'], ['3', 'Pixel Force', '15 pts'], ['4', 'Kisumu Wolves', '13 pts'], ['5', 'Coast Raiders', '10 pts']] },
      { title: 'Qualification & ranking', bullets: ['Verified wins advance and update rank.', 'Pending or disputed results do not change standings.', 'Group-stage points determine bracket position.'] },
    ],
  },
  {
    slug: 'control-center', figmaNode: '221:8', title: 'Squad Rush Kenya', pageLabel: 'Tournament control center', role: 'organizer', status: 'Live', statusTone: 'coral', primaryAction: 'View public page', description: 'Run registrations, matches, disputes, communications, and payments from one operational view.', tabs: tournamentTabs,
    alert: ['Review required', '3 actions need attention: 2 disputed results and 1 payment deadline.', 'warning'],
    metrics: [['Registrations', '12 / 16', '4 slots remain'], ['Checked in', '10', 'Closes 19:20 EAT'], ['Matches', '2 live', '2 awaiting review'], ['Prize & fees', 'KES 8,000', 'Held by Mechi']],
    sections: [
      { title: 'Match operations', description: 'Resolve exceptions before the bracket advances.', rows: [['Quarter-final · Match 4', 'Eldoret Stars 1 — 2 Kisumu Wolves', 'Disputed'], ['Quarter-final · Match 3', 'Team Nairobi 2 — 0 Mombasa Elite', 'Result reported']], action: 'Resolve dispute' },
      { title: 'Participants & check-in', rows: [['Team Nairobi', 'Amani K.', 'Checked', 'Paid', 'Seed 1'], ['Mombasa Elite', 'Salim R.', 'Checked', 'Paid', 'Seed 2'], ['Pixel Force', 'Brian M.', 'Checked', 'Paid', 'Seed 3'], ['Kisumu Wolves', 'Faith N.', 'Checked', 'Paid', 'Seed 4'], ['Coast Raiders', 'Juma P.', 'Pending', 'Paid', 'Seed 5']], action: 'Manage all players' },
    ],
    rail: [
      { title: 'Event readiness', rows: [['Registration', 'Open'], ['Check-in', 'Open'], ['Bracket', 'Blocked'], ['Announcements', 'Sent']] },
      { title: 'Payments & payout', eyebrow: 'Mechi · Paystack reconciled', rows: [['Collected', 'KES 8,400'], ['Platform fee', 'KES 400'], ['Prize pool held', 'KES 8,000']], action: 'Transactions' },
    ],
  },
  {
    slug: 'dispute-resolution', figmaNode: '231:8', title: 'Eldoret Stars vs Kisumu Wolves', pageLabel: 'Dispute resolution', role: 'organizer', status: 'Disputed', statusTone: 'warning', primaryAction: 'Resolve and verify result', secondaryAction: 'Back to queue', description: 'Review conflicting claims and evidence. Nothing updates until a moderator verifies the official result.',
    alert: ['Review required', 'Bracket advancement, ranking updates, and payout eligibility are paused until this dispute is resolved.', 'warning'],
    sections: [
      { title: 'Claims & evidence', description: 'Compare both reports before choosing an official result.', rows: [['Reason', 'Wrong result'], ['Player A claim', 'Eldoret Stars 2 — 1', '2 files'], ['Player B claim', 'Kisumu Wolves 1 — 2', '1 file'], ['scoreboard.png', 'Eldoret Stars · 18:42'], ['final.jpg', 'Eldoret Stars · 18:43'], ['result.png', 'Kisumu Wolves · 18:44']] },
      { title: 'Match chat context', rows: [['18:39', 'Eldoret Stars', 'I won 2–1. Uploading the final screen now.'], ['18:41', 'Kisumu Wolves', 'The score is reversed. Check the player names on screen.'], ['18:42', 'System', 'Eldoret Stars uploaded 2 evidence files.'], ['18:44', 'System', 'Kisumu Wolves uploaded a dispute screenshot.']] },
      { title: 'Case history & audit', rows: [['18:39', 'Report submitted'], ['18:44', 'Counter-evidence'], ['18:46', 'Dispute opened'], ['Now', 'Review pending']] },
    ],
    rail: [
      { title: 'Moderator decision', rows: [['Official outcome', 'Kisumu Wolves wins'], ['Official score', '1 — 2'], ['Resolution note', "Kisumu Wolves' screenshot shows the full scoreboard and confirms the submitted result."]], bullets: ['Complete the match as 1–2', 'Advance Kisumu Wolves', 'Update rank and reputation', 'Notify both players'], action: 'Resolve and verify result' },
    ],
  },
  {
    slug: 'finance-payouts', figmaNode: '239:334', title: 'Tournament finance', pageLabel: 'Tournament control center', role: 'organizer', status: 'Approved paid', statusTone: 'teal', primaryAction: 'Export report', description: 'Reconcile verified entry fees, resolve payment exceptions, and release prizes only after the final result is locked.', tabs: tournamentTabs,
    alert: ['Review required', 'Paystack is synced. 1 pending payment expires at 19:30 EAT and 1 failed payment needs retry.', 'warning'],
    metrics: [['Collected', 'KES 8,400', '12 verified payments'], ['Mechi fee', 'KES 400', '5% transparently applied'], ['Prize held', 'KES 8,000', 'Protected until final'], ['Reconciliation', '12 / 14', '1 pending · 1 failed']],
    sections: [
      { title: 'Payment reconciliation', description: '12 paid · 1 pending · 1 failed · Paystack synced 09:42', rows: [['Amani K.', 'PM_8K2F91', 'KES 700', 'Paid'], ['Salim R.', 'PM_8K2FA4', 'KES 700', 'Paid'], ['Brian M.', 'PM_8K2FC0', 'KES 700', 'Pending'], ['Faith N.', 'PM_8K2FD7', 'KES 700', 'Failed'], ['Juma P.', 'PM_8K2FE2', 'KES -700', 'Refunded']], action: 'View all payments' },
      { title: 'Exceptions & refunds', rows: [['Pending payment', 'Brian M. · KES 700 · expires 19:30 EAT', 'Send retry link'], ['Failed verification', 'Faith N. · no verified charge', 'Recheck Paystack'], ['Refund completed', 'Juma P. · returned to original method', 'View receipt']] },
    ],
    rail: [
      { title: 'Payout readiness', rows: [['Final result', 'Blocked'], ['Open disputes', 'Blocked'], ['Winner details', 'Ready'], ['Finance review', 'Ready']], action: 'Release KES 8,000' },
      { title: 'Financial audit', eyebrow: 'Immutable', rows: [['09:42', 'Paystack sync complete'], ['09:36', 'Refund verified'], ['09:10', 'Fee snapshot locked'], ['08:58', 'Payout gate changed']] },
    ],
  },
];

const additionalScreens: WorkspaceScreenDefinition[] = [
  ['participants-checkin','248:3','Participants & check-in','Review confirmed solo or team entries, complete rosters, monitor check-in, and prepare a fair bracket.','organizer',['Confirmed entries','16 / 16'],['Checked in','14'],['Roster ready','15 / 16'],['Seeding blockers','2']],
  ['match-operations','264:3','Match operations','Operate rooms, check-in, result reviews, evidence, and bracket advancement from one queue.','organizer',['Live matches','2'],['Awaiting review','3'],['Disputed','1'],['Completed','8']],
  ['communications','275:338','Communications & reminders','Send targeted tournament updates and keep every player informed before deadlines.','organizer',['Recipients','16'],['Delivered','15'],['Opened','12'],['Needs reminder','2']],
  ['analytics-reporting','285:263','Analytics & sponsor reporting','Understand reach, registrations, watch time, conversion, and sponsor delivery.','organizer',['Reach','18.4K'],['Registrations','64'],['Watch time','412h'],['Sponsor value','KES 86K']],
  ['organization-workspace','293:221','Organization workspace','Manage your verified organization, staff, tournaments, brand, permissions, and public credibility.','organizer',['Active tournaments','4'],['Staff','8'],['Followers','12.8K'],['Completion','96%']],
  ['sponsorship-marketplace','300:227','Sponsorship marketplace','Find credible gaming communities, tournaments, creators, and local activations to support.','partner',['Opportunities','24'],['Live now','6'],['Verified hosts','18'],['Est. reach','420K']],
  ['sponsorship-proposal','309:3','Sponsorship proposal','Review audience fit, deliverables, protections, pricing, and campaign milestones before committing.','partner',['Campaign value','KES 120K'],['Reach','80K'],['Deliverables','12'],['Duration','4 weeks']],
  ['active-sponsorship','318:149','Active sponsorship campaign','Track deliverables, approvals, evidence, performance, and creator communication in one place.','partner',['Delivered','8 / 12'],['Reach','61K'],['Engagement','8.4%'],['Days left','9']],
  ['sponsor-report','323:3','Sponsor report & evidence export','Package verified tournament delivery, audience outcomes, media evidence, and campaign value.','partner',['Impressions','184K'],['Unique reach','92K'],['Watch hours','1,240'],['Evidence files','28']],
  ['streamer-workspace','326:3','Streamer workspace & coverage','Turn tournaments into credible content, schedule coverage, and grow an audience around competition.','partner',['Live viewers','1.8K'],['Watch hours','426'],['Clips','18'],['Coverage requests','6']],
  ['coach-workspace','332:3','Coach workspace & expertise','Demonstrate expertise through verified results, teams, sessions, and educational content.','partner',['Students','46'],['Teams coached','8'],['Win rate','68%'],['Rating','4.9']],
  ['gaming-shop','334:3','Gaming shop & local tournament hub','Run credible local tournaments under your shop organization and grow a repeat player community.','organizer',['Upcoming events','5'],['Local players','214'],['Stations','18'],['Check-ins today','42']],
  ['gamer-dashboard','341:3','Player home','See what to do next, your tournaments, recent results, and team updates.','gamer',['Global rank','#128'],['Win rate','64%'],['Player rating','4.8'],['Events','22']],
  ['team-workspace','350:3','My team','Invite players, choose starters, check player setup, and enter team tournaments.','gamer',['Members','5 / 5'],['Team rank','#18'],['Win rate','72%'],['Upcoming','3']],
  ['rankings','361:130','Public rankings & leaderboards','Compare verified competitive performance across games, regions, seasons, players, and teams.','gamer',['Ranked players','12.4K'],['Teams','1,280'],['Games','8'],['Season days','24']],
  ['gamer-profile','377:177','Alex M.','Public gamer profile & match history','gamer',['Global rank','#128'],['Verified wins','84'],['Reputation','4.8'],['Followers','1.2K']],
  ['notifications','396:72','Notifications','Keep tournament deadlines, results, payments, team activity, and moderation updates in one reliable feed.','gamer',['Unread','8'],['Tournament','4'],['Team','2'],['Payments','2']],
  ['inbox','413:72','Inbox & conversations','Coordinate with organizers, teams, moderators, coaches, sponsors, and support without losing context.','gamer',['Unread','5'],['Tournament rooms','3'],['Direct','8'],['Support','1']],
  ['account-access','425:3','Account access & recovery','Sign in safely, recover access, and return to the exact tournament action you were completing.','gamer',['Security','Protected'],['Recovery','Available'],['Sessions','2'],['Last login','Today']],
  ['onboarding','426:3','Set up your player account','Choose your games, add your in-game names, and get ready to play.','gamer',['Profile','80%'],['Games','3'],['Accounts','2'],['Using Mechi as','Player']],
  ['settings','427:3','Settings, privacy & security','Control profile visibility, notifications, security, blocked users, and connected game accounts.','gamer',['Security','Strong'],['2FA','Enabled'],['Game accounts','3'],['Blocked','2']],
  ['support','428:3','Support, reporting & appeals','Report abuse or tournament issues, block users, attach evidence, and track appeals safely.','gamer',['Open reports','1'],['Resolved','8'],['Blocked users','2'],['Median reply','18 min']],
  ['organizer-profile','429:3','Nairobi Esports Hub','Public organizer & creator profile','partner',['Tournaments','42'],['Followers','18.2K'],['Completion','96%'],['Rating','4.8']],
  ['team-profile','430:3','Team Nairobi','Public team profile','gamer',['Team rank','#18'],['Verified wins','48'],['Members','5'],['Followers','3.2K']],
  ['wallet','431:3','Wallet, receipts, prizes & payouts','Track tournament entry payments, Paystack receipts, refunds, winnings, and payout status.','gamer',['Available','KES 4,500'],['Prize pending','KES 8,000'],['Entries paid','12'],['Refunds','1']],
  ['result-submission','432:3','Result submission & evidence timeline','Submit scores, preserve original evidence, confirm an opponent result, and follow every audit change.','gamer',['Score','2 — 1'],['Evidence','3 files'],['Submitted','20:12'],['Status','Pending']],
  ['registration-recovery','445:40','Registration recovery states','Resume interrupted registration or payment without duplicating a slot or losing eligibility.','gamer',['Slot','Reserved'],['Checkout','Recoverable'],['Time left','08:42'],['Payment','Pending']],
  ['partner-tools','446:3','Partner embeds, API keys & webhooks','Embed verified tournaments, connect partner systems, rotate keys, and audit every webhook delivery.','partner',['Embeds','3'],['API keys','2'],['Webhooks','6'],['Success','99.8%']],
  ['system-states','447:40','Empty, loading, error & permission states','Consistent recovery guidance for every PlayMechi loading, empty, offline, error, and access state.','gamer',['Patterns','16'],['Accessible','AA'],['Responsive','3 sizes'],['Recovery','Explicit']],
].map(([slug, figmaNode, title, description, role, ...metrics]) => ({
  slug: slug as string,
  figmaNode: figmaNode as string,
  title: title as string,
  pageLabel: title as string,
  description: description as string,
  role: role as WorkspaceRole,
  primaryAction: actionFor(slug as string),
  tabs: tabsFor(slug as string),
  metrics: metrics as Array<[string, string]>,
  alert: alertFor(slug as string),
  sections: sectionsFor(slug as string),
  rail: railFor(slug as string),
}));

function actionFor(slug: string) {
  if (slug.includes('sponsor')) return 'Export report';
  if (slug === 'communications') return 'New announcement';
  if (slug === 'team-workspace') return 'Invite player';
  if (slug === 'gaming-shop') return 'Host tournament';
  if (slug === 'partner-tools') return 'Create API key';
  if (slug === 'support') return 'Report an issue';
  if (slug === 'account-access') return 'Continue securely';
  return 'View details';
}

function tabsFor(slug: string) {
  if (['participants-checkin','match-operations','communications','analytics-reporting'].includes(slug)) return tournamentTabs;
  if (slug.includes('sponsor')) return ['Overview', 'Deliverables', 'Evidence', 'Performance', 'Messages'];
  if (slug === 'organization-workspace') return ['Overview', 'Tournaments', 'People', 'Brand', 'Permissions'];
  if (slug === 'settings') return ['Profile', 'Privacy', 'Security', 'Notifications', 'Game accounts'];
  if (slug === 'rankings') return ['Players', 'Teams', 'Games', 'Regions'];
  if (slug === 'wallet') return ['Overview', 'Payments', 'Prizes', 'Payouts', 'Receipts'];
  return ['Overview', 'Activity', 'Records'];
}

function alertFor(slug: string): WorkspaceScreenDefinition['alert'] {
  if (['participants-checkin','match-operations','registration-recovery','support'].includes(slug)) return ['Action required', 'Review the highlighted item to keep the tournament journey moving.', 'warning'];
  if (['active-sponsorship','partner-tools','wallet'].includes(slug)) return ['Mechi protected', 'Sensitive actions are verified, auditable, and handled through approved platform workflows.', 'teal'];
  return undefined;
}

function sectionsFor(slug: string): WorkspaceSection[] {
  const tailored: Record<string, WorkspaceSection[]> = {
    'participants-checkin': [
      { title: 'Entries & roster', description: '16 confirmed entries · teams of 5 · check-in closes 19:20 EAT', rows: [['Team Nairobi','Amani K.','5 / 5','Paid','Checked'],['Mombasa Elite','Salim R.','5 / 5','Paid','Checked'],['Pixel Force','Brian M.','4 / 5','Paid','Checked'],['Kisumu Wolves','Faith N.','5 / 5','Paid','Checked'],['Coast Raiders','Juma P.','5 / 5','Paid','Pending']], action: 'View all entries' },
      { title: 'Readiness action queue', rows: [['Roster incomplete','Pixel Force · 4 of 5 players declared','Manage roster'],['Check-in pending','Coast Raiders · reminder sent 2 min ago','Send reminder']] },
    ],
    'match-operations': [
      { title: 'Live and upcoming matches', rows: [['Match 4','Eldoret Stars vs Kisumu Wolves','Disputed'],['Match 3','Team Nairobi vs Mombasa Elite','Review evidence'],['Semi-final 1','Winner QF1 vs Winner QF2','Upcoming']], action: 'Open match desk' },
      { title: 'Result review queue', rows: [['2 — 0','Team Nairobi','2 files','Ready'],['1 — 2','Kisumu Wolves','3 files','Disputed'],['3 — 1','Pixel Force','1 file','Awaiting opponent']] },
    ],
    'communications': [
      { title: 'Compose update', rows: [['Audience','All confirmed players'],['Channel','In-app + email'],['Message','Check-in closes at 19:20 EAT.']], action: 'Send announcement' },
      { title: 'Message history', rows: [['Check-in reminder','16 recipients','15 delivered','12 opened'],['Lobby details available','10 recipients','10 delivered','9 opened'],['Schedule updated','16 recipients','16 delivered','14 opened']] },
    ],
    'analytics-reporting': [
      { title: 'Tournament performance', rows: [['Registration conversion','18.4%','+4.2%'],['Average watch time','28 min','+6 min'],['Completion rate','96%','Stable'],['Dispute rate','2.1%','-0.8%']] },
      { title: 'Audience and sponsor delivery', rows: [['Kenya','68%','12.4K reach'],['Uganda','14%','2.6K reach'],['Tanzania','10%','1.8K reach'],['Other','8%','1.4K reach']], action: 'Export sponsor report' },
    ],
    'organization-workspace': [
      { title: 'Organization activity', rows: [['Squad Rush Kenya','Live','16 teams'],['Weekend FC Cup','Registration','48 players'],['Shop League Finals','Completed','Sponsor report ready']] },
      { title: 'People & permissions', rows: [['JengaSites','Owner','Full access'],['Jane W.','Moderator','Tournament operations'],['Brian K.','Finance','Reports only']], action: 'Manage organization' },
    ],
    'sponsorship-marketplace': [
      { title: 'Recommended opportunities', rows: [['Squad Rush Kenya','PUBG Mobile','80K reach','KES 120K'],['Road to Champion','EA SPORTS FC 26','54K reach','KES 75K'],['GameTown Weekly','Tekken 8','22K reach','KES 35K'],['CODM Night Ops','Call of Duty Mobile','96K reach','KES 150K']], action: 'View opportunity' },
      { title: 'Audience filters', rows: [['Game','All games'],['Region','East Africa'],['Format','Online + local'],['Budget','KES 25K — 200K']] },
    ],
    'sponsorship-proposal': [
      { title: 'Campaign proposal', rows: [['Partner','Safaricom Gaming'],['Organizer','Nairobi Esports Hub'],['Tournament','Squad Rush Kenya'],['Budget','KES 120,000'],['Duration','4 weeks']] },
      { title: 'Deliverables', rows: [['Stream overlays','4 broadcasts','Pending approval'],['Social posts','6 posts','Scheduled'],['Winner interview','1 video','Planned'],['Evidence report','1 export','Included']], action: 'Approve proposal' },
    ],
    'active-sponsorship': [
      { title: 'Deliverable tracker', rows: [['Launch announcement','Delivered','Approved'],['Stream overlay · Round 1','Delivered','Approved'],['Creator reel 1','Submitted','Review'],['Finals brand mention','Scheduled','Upcoming']] },
      { title: 'Performance', rows: [['Reach','61,284','76% of target'],['Engagement','8.4%','Above target'],['Video views','34,820','69% of target'],['Clicks','2,412','4.1% CTR']] },
    ],
    'sponsor-report': [
      { title: 'Campaign outcomes', rows: [['Unique reach','92,418','115% of target'],['Impressions','184,260','123% of target'],['Watch hours','1,240','138% of target'],['Link clicks','6,480','5.2% CTR']] },
      { title: 'Verified evidence', rows: [['Stream overlay','4 broadcasts','Verified'],['Social posts','6 links','Verified'],['Venue branding','12 images','Verified'],['Winner interview','1 video','Verified']], action: 'Export evidence pack' },
    ],
    'streamer-workspace': [
      { title: 'Coverage schedule', rows: [['Squad Rush Kenya','Today · 19:00','Assigned'],['CODM Night Ops','Fri · 21:00','Requested'],['Shop League Finals','Sat · 16:00','Confirmed']] },
      { title: 'Recent content', rows: [['Final-round clutch','12.4K views','8.2% engagement'],['Best goals · Week 3','8.8K views','7.6% engagement'],['Player interview','4.1K views','10.2% engagement']], action: 'Add stream coverage' },
    ],
    'coach-workspace': [
      { title: 'Coaching record', rows: [['Team Nairobi','PUBG Mobile','Semi-finalist'],['Road to Champion','EA SPORTS FC 26','18 students'],['Aim clinic','CODM','4.9 rating']] },
      { title: 'Authority signals', rows: [['Verified results','84 wins','Public'],['Player endorsements','32','Public'],['Educational posts','18','Public'],['Dispute-free rate','98%','Verified']], action: 'Publish expertise' },
    ],
    'gaming-shop': [
      { title: 'Local events', rows: [['GameTown Weekly','Sat · 16:00','14 / 32 players'],['Shop League Finals','Live','Semi-final'],['Weekend FC Cup','Sun · 14:00','28 / 48 players']] },
      { title: 'Venue readiness', rows: [['Gaming stations','18','16 ready'],['Network','Stable','42 ms avg'],['Moderators','3','Assigned'],['Check-in desk','Open','42 today']], action: 'Manage local event' },
    ],
    'gamer-dashboard': [
      { title: 'What to do next', rows: [['Squad Rush Kenya','Match 3 · Today 19:30','Checked in'],['Weekend FC Cup','Registration closes Fri','Registered']] },
      { title: 'Recent verified results', rows: [['vs Coast Raiders','2 — 1','+24 rank'],['vs Rift Kings','2 — 0','+18 rank'],['vs Pixel Force','1 — 2','-9 rank']], action: 'View match history' },
    ],
    'team-workspace': [
      { title: 'Player setup', rows: [['Alex M.','Captain','Game ID added','Ready'],['Brian K.','Starter','Game ID added','Ready'],['Carol N.','Starter','Game ID added','Ready'],['David P.','Starter','Game ID added','Ready'],['Jane W.','Substitute','Game ID added','Ready']] },
      { title: 'Tournament entries', rows: [['Squad Rush Kenya','Checked in','Today 19:00'],['CODM Night Ops','Registered','Fri 21:00'],['GameTown Weekly','Invited','Sat 16:00']], action: 'Manage roster' },
    ],
    'rankings': [
      { title: 'Top verified players', rows: [['1','Amani K.','PUBG Mobile','2,480'],['2','Salim R.','eFootball','2,412'],['3','Faith N.','CODM','2,386'],['4','Alex M.','PUBG Mobile','2,340'],['5','Brian K.','FC 26','2,298']], action: 'View full leaderboard' },
      { title: 'Rank methodology', bullets: ['Only verified results change rank.', 'Strength of opponent affects movement.', 'Disputed results remain excluded.', 'Season activity and fair play protect credibility.'] },
    ],
    'gamer-profile': [
      { title: 'Verified competitive record', rows: [['PUBG Mobile','48 wins','2,340 rating'],['CODM','22 wins','1,980 rating'],['eFootball','14 wins','1,742 rating']] },
      { title: 'Recent match history', rows: [['Squad Rush Kenya','Won 2 — 1','Verified'],['Community Ladder','Won 2 — 0','Verified'],['CODM Night Ops','Lost 1 — 2','Verified']], action: 'Share profile' },
    ],
    'notifications': [
      { title: 'Today', rows: [['Match ready','Opening round · Match 3 lobby is open.','2 min'],['Payment verified','Your Squad Rush Kenya registration is confirmed.','18 min'],['Team update','Brian K. checked in.','32 min'],['Result confirmed','Your 2–0 result is now verified.','1 hr']] },
      { title: 'Earlier', rows: [['Tournament reminder','Check-in opens tomorrow.','Yesterday'],['Rank movement','You moved up 24 places.','Yesterday']] },
    ],
    'inbox': [
      { title: 'Conversations', rows: [['Squad Rush Kenya room','Lobby opens at 19:15','2 unread'],['Team Nairobi','Brian: I am checked in','1 unread'],['Mechi Support','Your evidence has been reviewed','1 unread'],['Coach Mfalme','Session notes attached','Read']] },
      { title: 'Squad Rush Kenya room', rows: [['18:42','Moderator','Lobby details will appear after both teams check in.'],['18:58','Alex M.','Team Nairobi is ready.'],['19:02','System','Both teams are checked in.']], action: 'Send message' },
    ],
    'account-access': [
      { title: 'Welcome back', description: 'Continue with your email and password or request a secure sign-in link.', rows: [['Email','alex@example.com'],['Password','••••••••'],['Return to','Squad Rush Kenya registration']], action: 'Sign in' },
      { title: 'Recovery options', bullets: ['Email recovery link', 'Password reset', 'Trusted-session review', 'Support-assisted recovery'] },
    ],
    'onboarding': [
      { title: 'How will you use PlayMechi?', rows: [['Gamer','Compete, build rank and reputation'],['Organizer','Create and manage tournaments'],['Streamer','Turn competition into content'],['Coach','Build authority through expertise'],['Company','Sponsor credible communities'],['Gaming shop','Host local tournaments']] },
      { title: 'Gamer identity', rows: [['Display name','Alex M.'],['Country','Kenya'],['Primary game','PUBG Mobile'],['Game ID','AlexMechi_KE']], action: 'Complete profile' },
    ],
    'settings': [
      { title: 'Profile & visibility', rows: [['Public profile','Visible'],['Match history','Visible'],['Game accounts','Followers only'],['Online status','Hidden']] },
      { title: 'Security', rows: [['Password','Updated 28 days ago'],['Two-factor authentication','Enabled'],['Active sessions','2 devices'],['Recovery email','Verified']], action: 'Save settings' },
    ],
    'support': [
      { title: 'Report or request help', rows: [['Issue type','Tournament result'],['Tournament','Squad Rush Kenya'],['Match','Opening round · Match 3'],['Evidence','2 files attached'],['Details','Opponent result does not match the scoreboard.']], action: 'Submit report' },
      { title: 'Your cases', rows: [['PM-2048','Result dispute','In review'],['PM-1982','Payment refund','Resolved'],['PM-1844','Harassment report','Resolved']] },
    ],
    'organizer-profile': [
      { title: 'Organizer credibility', rows: [['Completed tournaments','42','Verified'],['Dispute-free rate','96%','Excellent'],['Average rating','4.8 / 5','128 reviews'],['Prize delivery','100%','Paystack verified']] },
      { title: 'Hosted tournaments', rows: [['Squad Rush Kenya','Live','16 teams'],['Weekend Community Cup','Open','48 players'],['Nairobi Mobile Finals','Completed','Sponsor report ready']], action: 'Follow organizer' },
    ],
    'team-profile': [
      { title: 'Competitive record', rows: [['PUBG Mobile','Team rank #18','48 verified wins'],['CODM','Team rank #42','18 verified wins']] },
      { title: 'Roster', rows: [['Alex M.','Captain'],['Brian K.','Starter'],['Carol N.','Starter'],['David P.','Starter'],['Jane W.','Substitute']], action: 'Challenge team' },
    ],
    'wallet': [
      { title: 'Recent transactions', rows: [['Squad Rush Kenya','Entry payment','KES -700','Paid'],['Weekend FC Cup','Prize payout','KES +4,500','Complete'],['CODM Night Ops','Refund','KES +250','Complete']] },
      { title: 'Prize and payout activity', rows: [['Squad Rush Kenya','KES 8,000','Awaiting verified final'],['Weekend FC Cup','KES 4,500','Paid to M-Pesa']], action: 'View receipts' },
    ],
    'result-submission': [
      { title: 'Official score', rows: [['Team Nairobi','2','—','1','Coast Raiders'],['Submitted by','Alex M. · 20:12'],['Opponent confirmation','Pending']] },
      { title: 'Evidence timeline', rows: [['20:12','round-3-scoreboard.png','Alex M.'],['20:14','lobby-result.jpg','Moderator Jane W.'],['20:16','System','Result submitted for confirmation']], action: 'Submit result' },
    ],
    'registration-recovery': [
      { title: 'Your registration is safe', tone: 'teal', description: 'Your team slot remains reserved while you resume the approved Paystack checkout.', rows: [['Tournament','Squad Rush Kenya'],['Team','Team Nairobi'],['Entry fee','KES 700'],['Reservation','08:42 remaining']], action: 'Resume Paystack checkout' },
      { title: 'Recovery guidance', bullets: ['Do not start another registration.', 'A successful existing payment will be reconciled.', 'Expired reservations return the slot automatically.', 'Support can trace the Paystack reference.'] },
    ],
    'partner-tools': [
      { title: 'Embeds', rows: [['Tournament directory','Active','mechi-directory'],['Squad Rush Kenya','Active','squad-rush'],['Public rankings','Draft','season-4']], action: 'Create embed' },
      { title: 'API keys & webhooks', rows: [['Production key','••••MECHI_8K2','Last used 2 min'],['Staging key','••••TEST_4F1','Last used 3 days'],['tournament.updated','https://partner.example/webhooks','99.8%'],['result.verified','https://partner.example/webhooks','100%']], action: 'Rotate key' },
    ],
    'system-states': [
      { title: 'Empty states', rows: [['No tournaments found','Clear filters or host the first event.'],['No messages yet','Start a safe conversation from a tournament.'],['No payment history','Receipts appear after approved transactions.']] },
      { title: 'Loading, error & permission', rows: [['Loading','Skeleton preserves layout and context.'],['Offline','Retry when connection returns.'],['Server error','Keep user input and show a recovery action.'],['Permission denied','Explain required role and safe next step.']], action: 'Preview all states' },
    ],
  };

  return tailored[slug] ?? [
    { title: 'Current activity', rows: [['Squad Rush Kenya','Active','Updated now'],['Weekend Community Cup','Open','Updated 8 min'],['Verified record','Complete','Updated today']], action: 'Open item' },
    { title: 'Recent verified records', rows: [['PlayMechi system','Audit retained','Verified'],['Community activity','Policy compliant','Ready'],['Next action','Clearly explained','Available']] },
  ];
}

function railFor(slug: string): WorkspaceSection[] {
  if (['account-access','onboarding','system-states'].includes(slug)) return [
    { title: 'Designed for trust', bullets: ['Clear status and ownership', 'Accessible contrast and focus', 'Responsive at every breakpoint', 'Safe recovery from interruption'] },
  ];
  return [
    { title: 'Account setup', tone: 'teal', rows: [['Account','Confirmed'],['Required details','Complete'],['What to do next','Available']] },
    { title: 'Trust & safety', bullets: ['Verified actions update public records.', 'Money moves only through approved Mechi flows.', 'Evidence and moderation changes remain auditable.'] },
  ];
}

PLAYMECHI_SCREENS.push(...additionalScreens);

export const PLAYMECHI_SCREEN_MAP = new Map(PLAYMECHI_SCREENS.map((screen) => [screen.slug, screen]));

export const PLAYMECHI_SCREEN_GROUPS = [
  { title: 'Tournament journey', slugs: ['tournament-directory','tournament-detail','host-tournament','registration-payment','match-room','bracket-standings'] },
  { title: 'Tournament operations', slugs: ['control-center','dispute-resolution','finance-payouts','participants-checkin','match-operations','communications','analytics-reporting'] },
  { title: 'Organizations & partners', slugs: ['organization-workspace','sponsorship-marketplace','sponsorship-proposal','active-sponsorship','sponsor-report','streamer-workspace','coach-workspace','gaming-shop'] },
  { title: 'Gamers & community', slugs: ['gamer-dashboard','team-workspace','rankings','gamer-profile','notifications','inbox'] },
  { title: 'Accounts & platform', slugs: ['account-access','onboarding','settings','support','organizer-profile','team-profile','wallet','result-submission','registration-recovery','partner-tools','system-states'] },
];
