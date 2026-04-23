import {
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

const TUTORIALS_NAV_ITEM: AppNavItem = {
  href: '/tutorials',
  label: 'Tutorials',
  icon: CirclePlay,
  matchMode: 'prefix',
  description: 'Learn the core Mechi flows without digging through the whole app shell.',
};

const LEADERBOARD_NAV_ITEM: AppNavItem = {
  href: '/leaderboard',
  label: 'Leaderboard',
  icon: Trophy,
  matchMode: 'prefix',
};

const TOURNAMENTS_NAV_ITEM: AppNavItem = {
  href: '/tournaments',
  label: 'Tournaments',
  icon: Swords,
  matchMode: 'prefix',
  description: 'Follow active brackets, join events, and keep tournament movement in view.',
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
  description: 'Call out a specific player and keep direct match setups organized.',
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
  description: 'Track RP, progression, and what your recent activity unlocked.',
};

const REDEEM_NAV_ITEM: AppNavItem = {
  href: '/rewards/catalog',
  label: 'Redeem',
  icon: Gift,
  matchMode: 'prefix',
  description: 'Turn RP into Mechi perks and redeemables without leaving Mechi.',
};

const BOUNTIES_NAV_ITEM: AppNavItem = {
  href: '/bounties',
  label: 'Bounties',
  icon: Zap,
  matchMode: 'prefix',
};

export const SIDEBAR_PRIMARY_ITEMS: AppNavItem[] = [
  DASHBOARD_NAV_ITEM,
  TUTORIALS_NAV_ITEM,
  LEADERBOARD_NAV_ITEM,
];

export const SIDEBAR_SECTIONS: SidebarSectionConfig[] = [
  {
    id: 'compete',
    title: 'Compete',
    icon: Swords,
    items: [
      TOURNAMENTS_NAV_ITEM,
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
  TUTORIALS_NAV_ITEM,
  CHALLENGES_NAV_ITEM,
  TOURNAMENTS_NAV_ITEM,
  REDEEM_NAV_ITEM,
];
