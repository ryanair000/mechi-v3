import {
  Coins,
  Gamepad2,
  Gift,
  History,
  Inbox,
  LayoutDashboard,
  MonitorPlay,
  type LucideIcon,
  MessageCircle,
  Share2,
  Swords,
  Trophy,
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

const LEADERBOARD_NAV_ITEM: AppNavItem = {
  href: '/leaderboard',
  label: 'Leaderboard',
  icon: Trophy,
  matchMode: 'prefix',
};

const STREAM_NAV_ITEM: AppNavItem = {
  href: '/streams',
  label: 'Stream',
  icon: MonitorPlay,
  matchMode: 'prefix',
};

const INBOX_NAV_ITEM: AppNavItem = {
  href: '/inbox',
  label: 'Inbox',
  icon: Inbox,
  matchMode: 'prefix',
};

const TOURNAMENTS_NAV_ITEM: AppNavItem = {
  href: '/tournaments',
  label: 'Tournaments',
  icon: Swords,
  matchMode: 'prefix',
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

const SHARE_NAV_ITEM: AppNavItem = {
  href: '/share',
  label: 'Share',
  icon: Share2,
  matchMode: 'exact',
  description: 'Open public player cards, recent match links, and invite flows.',
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
  INBOX_NAV_ITEM,
  LEADERBOARD_NAV_ITEM,
  STREAM_NAV_ITEM,
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
    items: [SHARE_NAV_ITEM, REWARDS_NAV_ITEM, REDEEM_NAV_ITEM, BOUNTIES_NAV_ITEM],
  },
];

