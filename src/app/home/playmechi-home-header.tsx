'use client';

import { type HomeFloatingHeaderNavItem, HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';

const PLAYMECHI_HOME_NAV_ITEMS: HomeFloatingHeaderNavItem[] = [
  {
    label: 'TOURNAMENTS',
    items: [
      {
        href: '/playmechi',
        label: 'PLAYMECHI',
        description: 'Launch tournament lane',
      },
      {
        href: '/weekendcup',
        label: 'WEEKEND CUP',
        description: 'Current weekend bracket',
      },
      {
        href: '/leaderboard',
        label: 'WEKA MAWE',
        description: 'Weekly grind board',
      },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      {
        href: '/dashboard',
        label: 'DASHBOARD',
        description: 'Account, matches, queue',
      },
      {
        href: '/android-testers',
        label: 'ANDROID',
        description: 'Tester lane and beta access',
      },
    ],
  },
  { href: '/pricing', label: 'SUBSCRIPTIONS' },
];

const PLAYMECHI_SIGN_IN_PATH = getLoginPath();

export function PlayMechiHomeHeader() {
  const joinHref = getRegisterPath();

  return (
    <HomeFloatingHeader
      navItems={PLAYMECHI_HOME_NAV_ITEMS}
      signInHref={PLAYMECHI_SIGN_IN_PATH}
      joinHref={joinHref}
      joinLabel="JOIN FREE"
      showLogo
    />
  );
}
