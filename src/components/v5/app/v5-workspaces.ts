export type V5WorkspaceKind =
  | 'player'
  | 'team'
  | 'organizer'
  | 'creator'
  | 'coach'
  | 'sponsor'
  | 'shop'
  | 'admin';

export type V5NavIcon =
  | 'home'
  | 'trophy'
  | 'swords'
  | 'users'
  | 'chart'
  | 'wallet'
  | 'inbox'
  | 'profile'
  | 'video'
  | 'radio'
  | 'content'
  | 'briefcase'
  | 'building'
  | 'megaphone'
  | 'coins'
  | 'settings'
  | 'shield'
  | 'venue'
  | 'book'
  | 'search'
  | 'check';

export interface V5WorkspaceNavItem {
  label: string;
  section: string;
  icon: V5NavIcon;
  badge?: string;
}

export interface V5WorkspaceDefinition {
  kind: V5WorkspaceKind;
  label: string;
  shortLabel: string;
  description: string;
  accent: 'teal' | 'coral' | 'navy' | 'gold' | 'violet';
  nav: V5WorkspaceNavItem[];
}

export const V5_WORKSPACES: Record<V5WorkspaceKind, V5WorkspaceDefinition> = {
  player: {
    kind: 'player',
    label: 'Player workspace',
    shortLabel: 'Player',
    description: 'Compete, verify results and build your reputation.',
    accent: 'teal',
    nav: [
      { label: 'Overview', section: '', icon: 'home' },
      { label: 'Tournaments', section: 'tournaments', icon: 'trophy' },
      { label: '1v1 challenges', section: 'challenges', icon: 'swords' },
      { label: 'Matches', section: 'matches', icon: 'swords' },
      { label: 'Teams', section: 'teams', icon: 'users' },
      { label: 'Rankings', section: 'rankings', icon: 'chart' },
      { label: 'Wallet', section: 'wallet', icon: 'wallet' },
      { label: 'Inbox', section: 'inbox', icon: 'inbox' },
      { label: 'Profile', section: 'profile', icon: 'profile' },
    ],
  },
  team: {
    kind: 'team',
    label: 'Team workspace',
    shortLabel: 'Team',
    description: 'Ready your roster and compete together.',
    accent: 'navy',
    nav: [
      { label: 'Overview', section: '', icon: 'home' },
      { label: 'Roster', section: 'roster', icon: 'users' },
      { label: 'Tournaments', section: 'tournaments', icon: 'trophy' },
      { label: 'Matches', section: 'matches', icon: 'swords' },
      { label: 'Invitations', section: 'invitations', icon: 'inbox' },
      { label: 'Settings', section: 'settings', icon: 'settings' },
    ],
  },
  organizer: {
    kind: 'organizer',
    label: 'Organizer workspace',
    shortLabel: 'Organizer',
    description: 'Create and operate credible tournaments.',
    accent: 'coral',
    nav: [
      { label: 'Overview', section: '', icon: 'home' },
      { label: 'Tournaments', section: 'tournaments', icon: 'trophy' },
      { label: 'Participants', section: 'participants', icon: 'users' },
      { label: 'Match operations', section: 'matches', icon: 'swords' },
      { label: 'Communications', section: 'communications', icon: 'megaphone' },
      { label: 'Finance', section: 'finance', icon: 'wallet' },
      { label: 'Analytics', section: 'analytics', icon: 'chart' },
      { label: 'Organization', section: 'organization', icon: 'building' },
      { label: 'Staff & access', section: 'staff', icon: 'shield' },
    ],
  },
  creator: {
    kind: 'creator',
    label: 'Creator Studio',
    shortLabel: 'Creator',
    description: 'Turn tournament coverage into trusted content.',
    accent: 'violet',
    nav: [
      { label: 'Overview', section: '', icon: 'home' },
      { label: 'Content', section: 'content', icon: 'content' },
      { label: 'Live', section: 'live', icon: 'radio' },
      { label: 'Coverage', section: 'coverage', icon: 'video' },
      { label: 'Opportunities', section: 'opportunities', icon: 'briefcase' },
      { label: 'Audience', section: 'audience', icon: 'users' },
      { label: 'Reports', section: 'reports', icon: 'chart' },
      { label: 'Profile', section: 'profile', icon: 'profile' },
    ],
  },
  coach: {
    kind: 'coach',
    label: 'Coach workspace',
    shortLabel: 'Coach',
    description: 'Publish expertise and prepare competitors.',
    accent: 'gold',
    nav: [
      { label: 'Overview', section: '', icon: 'home' },
      { label: 'Expertise', section: 'expertise', icon: 'profile' },
      { label: 'Guides', section: 'guides', icon: 'book' },
      { label: 'Analysis', section: 'analysis', icon: 'chart' },
      { label: 'Preparation', section: 'preparation', icon: 'check' },
      { label: 'Results', section: 'results', icon: 'trophy' },
      { label: 'Profile', section: 'profile', icon: 'profile' },
    ],
  },
  sponsor: {
    kind: 'sponsor',
    label: 'Company workspace',
    shortLabel: 'Sponsor',
    description: 'Reach credible gaming communities and measure delivery.',
    accent: 'navy',
    nav: [
      { label: 'Overview', section: '', icon: 'home' },
      { label: 'Marketplace', section: 'marketplace', icon: 'search' },
      { label: 'Briefs', section: 'briefs', icon: 'content' },
      { label: 'Proposals', section: 'proposals', icon: 'inbox' },
      { label: 'Campaigns', section: 'campaigns', icon: 'megaphone' },
      { label: 'Evidence', section: 'evidence', icon: 'check' },
      { label: 'Reports', section: 'reports', icon: 'chart' },
      { label: 'Company & team', section: 'company', icon: 'building' },
    ],
  },
  shop: {
    kind: 'shop',
    label: 'Gaming shop workspace',
    shortLabel: 'Gaming shop',
    description: 'Host local tournaments and build a venue record.',
    accent: 'teal',
    nav: [
      { label: 'Overview', section: '', icon: 'home' },
      { label: 'Local tournaments', section: 'tournaments', icon: 'trophy' },
      { label: 'Venue', section: 'venue', icon: 'venue' },
      { label: 'Community', section: 'community', icon: 'users' },
      { label: 'Staff', section: 'staff', icon: 'shield' },
      { label: 'Analytics', section: 'analytics', icon: 'chart' },
      { label: 'Shop profile', section: 'profile', icon: 'profile' },
    ],
  },
  admin: {
    kind: 'admin',
    label: 'Mechi operations',
    shortLabel: 'Admin',
    description: 'Operate approvals, trust, finance and platform health.',
    accent: 'coral',
    nav: [
      { label: 'Operations', section: '', icon: 'home' },
      { label: 'Tournament approvals', section: 'tournaments', icon: 'trophy' },
      { label: 'Sponsorship approvals', section: 'sponsorships', icon: 'briefcase' },
      { label: 'Verification', section: 'verification', icon: 'check' },
      { label: 'Moderation', section: 'moderation', icon: 'shield' },
      { label: 'Payouts', section: 'payouts', icon: 'coins' },
      { label: 'Risk & audit', section: 'risk', icon: 'chart' },
      { label: 'Platform health', section: 'platform', icon: 'settings' },
    ],
  },
};

export const V5_WORKSPACE_ORDER: V5WorkspaceKind[] = [
  'player',
  'team',
  'organizer',
  'creator',
  'coach',
  'sponsor',
  'shop',
];

export function isV5WorkspaceKind(value: string | undefined): value is V5WorkspaceKind {
  return Boolean(value && value in V5_WORKSPACES);
}

export function getWorkspaceHref(kind: V5WorkspaceKind, section = '') {
  return `/app/${kind}${section ? `/${section}` : ''}`;
}
