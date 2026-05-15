'use client';

import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';
import { WEEKEND_CUP_REGISTRATION_PATH } from '@/lib/weekend-cup';

const PLAYMECHI_HOME_NAV_ITEMS = [
  { href: '/weekendcup', label: 'TOURNAMENTS' },
  { href: '/android-testers', label: 'ANDROID' },
  { href: '/pricing', label: 'SUBSCRIPTIONS' },
];

const PLAYMECHI_SIGN_IN_PATH = getLoginPath(WEEKEND_CUP_REGISTRATION_PATH);

export function PlayMechiHomeHeader() {
  const joinHref = getRegisterPath({ next: WEEKEND_CUP_REGISTRATION_PATH });

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
