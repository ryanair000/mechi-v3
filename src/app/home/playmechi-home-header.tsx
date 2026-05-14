'use client';

import { useAuth } from '@/components/AuthProvider';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';
import {
  ONLINE_TOURNAMENT_DISPUTE_PATH,
  ONLINE_TOURNAMENT_PUBLIC_PATH,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
} from '@/lib/online-tournament';

const PLAYMECHI_HOME_NAV_ITEMS = [
  { href: `${ONLINE_TOURNAMENT_PUBLIC_PATH}#prizes`, label: 'PRIZES' },
  { href: `${ONLINE_TOURNAMENT_PUBLIC_PATH}#rules`, label: 'RULES' },
  { href: `${ONLINE_TOURNAMENT_PUBLIC_PATH}#stream`, label: 'STREAM' },
  { href: ONLINE_TOURNAMENT_DISPUTE_PATH, label: 'REPORT' },
  { href: '/blog', label: 'BLOG' },
  { href: '/android-testers', label: 'ANDROID' },
  { href: '/platform', label: 'PLATFORM' },
];

const PLAYMECHI_SIGN_IN_PATH = getLoginPath(ONLINE_TOURNAMENT_REGISTRATION_PATH);

export function PlayMechiHomeHeader() {
  const { user } = useAuth();
  const joinHref = user
    ? ONLINE_TOURNAMENT_REGISTRATION_PATH
    : getRegisterPath({ next: ONLINE_TOURNAMENT_REGISTRATION_PATH });

  return (
    <HomeFloatingHeader
      navItems={PLAYMECHI_HOME_NAV_ITEMS}
      signInHref={PLAYMECHI_SIGN_IN_PATH}
      joinHref={joinHref}
    />
  );
}
