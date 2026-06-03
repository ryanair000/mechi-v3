import {
  AtSign,
  Coins,
  Crosshair,
  Gamepad2,
  Gift,
  History,
  LayoutDashboard,
  MessageCircle,
  type LucideIcon,
  Share2,
  ShieldCheck,
  Swords,
  Trophy,
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
  activeHrefs: ['/leaderboard'],
  href: '/dashboard/leaderboard',
  label: 'Leaderboard',
  icon: Trophy,
  matchMode: 'prefix',
};

const TOURNAMENTS_NAV_ITEM: AppNavItem = {
  activeHrefs: ['/tournaments', '/playmechi/tournament'],
  href: '/dashboard/tournaments',
  label: 'Tournaments',
  icon: Swords,
  matchMode: 'prefix',
};

const CODM_MODERATOR_NAV_ITEM: AppNavItem = {
  href: '/moderators',
  label: 'Moderators',
  icon: ShieldCheck,
  matchMode: 'prefix',
};

const SOCIALS_NAV_ITEM: AppNavItem = {
  activeHrefs: ['/socials'],
  href: '/dashboard/socials',
  label: 'Socials',
  icon: AtSign,
  matchMode: 'prefix',
};

const PLAY_NAV_ITEM: AppNavItem = {
  activeHrefs: ['/queue'],
  href: '/dashboard/play',
  label: 'Play',
  icon: Zap,
  matchMode: 'prefix',
};

const CHALLENGES_NAV_ITEM: AppNavItem = {
  activeHrefs: ['/challenges'],
  href: '/dashboard/challenges',
  label: 'Challenges',
  icon: MessageCircle,
  matchMode: 'prefix',
};

const MATCHES_NAV_ITEM: AppNavItem = {
  activeHrefs: ['/matches', '/match'],
  href: '/dashboard/matches',
  label: 'Matches',
  icon: History,
  matchMode: 'prefix',
};

const GAMES_NAV_ITEM: AppNavItem = {
  activeHrefs: ['/games', '/suggest'],
  href: '/dashboard/game-ids',
  label: 'Game IDs',
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
  activeHrefs: ['/rewards'],
  href: '/dashboard/rewards',
  label: 'Rewards',
  icon: Coins,
  matchMode: 'exact',
};

const REDEEM_NAV_ITEM: AppNavItem = {
  activeHrefs: ['/rewards/catalog'],
  href: '/dashboard/rewards/catalog',
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
  PLAY_NAV_ITEM,
  CHALLENGES_NAV_ITEM,
  MATCHES_NAV_ITEM,
];

export const SIDEBAR_MODERATOR_ITEMS: AppNavItem[] = [CODM_MODERATOR_NAV_ITEM];

export const SIDEBAR_SECTIONS: SidebarSectionConfig[] = [
  {
    id: 'compete',
    title: 'Compete',
    icon: Crosshair,
    items: [
      LEADERBOARD_NAV_ITEM,
      TOURNAMENTS_NAV_ITEM,
    ],
  },
  {
    id: 'games',
    title: 'Setup',
    icon: Gamepad2,
    items: [GAMES_NAV_ITEM],
  },
  {
    id: 'growth',
    title: 'Growth',
    icon: Gift,
    items: [SOCIALS_NAV_ITEM, SHARE_NAV_ITEM, REWARDS_NAV_ITEM, REDEEM_NAV_ITEM, BOUNTIES_NAV_ITEM],
  },
];
