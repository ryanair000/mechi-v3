'use client';

import { useAuth } from '@/components/AuthProvider';
import { HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';
import {
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
} from '@/lib/online-tournament';
import { WEEKEND_CUP_REGISTRATION_PATH } from '@/lib/weekend-cup';

const PLAYMECHI_HOME_NAV_ITEMS = [
  { href: WEEKEND_CUP_REGISTRATION_PATH, label: 'WEEKEND CUP' },
  { href: '/android-testers', label: 'ANDROID' },
  { href: '/leaderboard', label: 'WEKA MAWE' },
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
      showLogo={false}
    />
  );
}
