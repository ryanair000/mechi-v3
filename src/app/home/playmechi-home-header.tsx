'use client';

import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';

const PLAYMECHI_HOME_NAV_ITEMS = [
  { href: '/weekendcup', label: 'TOURNAMENTS' },
  { href: '/android-testers', label: 'ANDROID' },
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
