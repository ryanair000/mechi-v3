import {
  BellRing,
  CirclePlay,
  Coins,
  Gamepad2,
  Gift,
  History,
  LayoutDashboard,
  type LucideIcon,
  MessageCircle,
  Swords,
  Trophy,
  UserPlus,
  Users,
  Video,
  Zap,
} from 'lucide-react';

export type NavItemMatchMode = 'exact' | 'prefix';

export type AppNavItem = {
  activeHrefs?: string[];
  description?: string;
  href: string;
  icon: LucideIcon;
  label: string;
  matchMode?: NavItemMatchMode;
};

export type SidebarSectionKey = 'compete' | 'games' | 'growth';

export type SidebarSectionConfig = {
  icon: LucideIcon;
  id: SidebarSectionKey;
  items: AppNavItem[];
  title: string;
};

const DASHBOARD_NAV_ITEM: AppNavItem = {
  href: '/dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
  matchMode: 'exact',
};

const FEED_NAV_ITEM: AppNavItem = {
  activeHrefs: ['/notifications'],
  href: '/feed',
  label: 'Feed',
  icon: BellRing,
  matchMode: 'prefix',
  description: 'Twitter-style activity lane for direct challenges, match review, and bracket movement.',
};

const TUTORIALS_NAV_ITEM: AppNavItem = {
  href: '/tutorials',
  label: 'Tutorials',
  icon: CirclePlay,
  matchMode: 'prefix',
};

const LEADERBOARD_NAV_ITEM: AppNavItem = {
  href: '/leaderboard',
  label: 'Leaderboard',
  icon: Trophy,
  matchMode: 'prefix',
};

const QUEUE_NAV_ITEM: AppNavItem = {
  href: '/queue',
  label: 'Queue',
  icon: Zap,
  matchMode: 'prefix',
};

const TOURNAMENTS_NAV_ITEM: AppNavItem = {
  href: '/tournaments',
  label: 'Tournaments',
  icon: Swords,
  matchMode: 'prefix',
};

const STREAMS_NAV_ITEM: AppNavItem = {
  href: '/streams',
  label: 'Streams',
  icon: Video,
  matchMode: 'prefix',
  description: 'See live brackets, standby broadcasts, and recent replays.',
};

const LOBBIES_NAV_ITEM: AppNavItem = {
  href: '/lobbies',
  label: 'Lobbies',
  icon: Users,
  matchMode: 'prefix',
};

const CHALLENGES_NAV_ITEM: AppNavItem = {
  href: '/challenges',
  label: 'Challenges',
  icon: MessageCircle,
  matchMode: 'prefix',
};

const MATCHES_NAV_ITEM: AppNavItem = {
  href: '/matches',
  label: 'Match History',
  icon: History,
  matchMode: 'prefix',
};

const GAMES_NAV_ITEM: AppNavItem = {
  activeHrefs: ['/suggest'],
  href: '/games',
  label: 'Games',
  icon: Gamepad2,
  matchMode: 'prefix',
};

const FRIENDS_NAV_ITEM: AppNavItem = {
  href: '/share',
  label: 'Friends',
  icon: UserPlus,
  matchMode: 'exact',
  description: 'Search players by username and jump straight to their public card.',
};

const REWARDS_NAV_ITEM: AppNavItem = {
  href: '/rewards',
  label: 'Rewards',
  icon: Coins,
  matchMode: 'exact',
};

const REDEEM_NAV_ITEM: AppNavItem = {
  href: '/rewards/catalog',
  label: 'Redeem',
  icon: Gift,
  matchMode: 'prefix',
  description: 'Turn RP into Mechi perks and partner rewards fulfilled on ChezaHub.',
};

const BOUNTIES_NAV_ITEM: AppNavItem = {
  href: '/bounties',
  label: 'Bounties',
  icon: Zap,
  matchMode: 'prefix',
};

export const SIDEBAR_PRIMARY_ITEMS: AppNavItem[] = [
  DASHBOARD_NAV_ITEM,
  FEED_NAV_ITEM,
  TUTORIALS_NAV_ITEM,
  LEADERBOARD_NAV_ITEM,
];

export const SIDEBAR_SECTIONS: SidebarSectionConfig[] = [
  {
    id: 'compete',
    title: 'Compete',
    icon: Swords,
    items: [
      QUEUE_NAV_ITEM,
      TOURNAMENTS_NAV_ITEM,
      STREAMS_NAV_ITEM,
      LOBBIES_NAV_ITEM,
      CHALLENGES_NAV_ITEM,
      MATCHES_NAV_ITEM,
    ],
  },
  {
    id: 'games',
    title: 'Games',
    icon: Gamepad2,
    items: [GAMES_NAV_ITEM],
  },
  {
    id: 'growth',
    title: 'Growth',
    icon: Gift,
    items: [FRIENDS_NAV_ITEM, REWARDS_NAV_ITEM, REDEEM_NAV_ITEM, BOUNTIES_NAV_ITEM],
  },
];

export const DASHBOARD_FEATURE_ITEMS: AppNavItem[] = [
  FEED_NAV_ITEM,
  FRIENDS_NAV_ITEM,
  STREAMS_NAV_ITEM,
  REDEEM_NAV_ITEM,
];
