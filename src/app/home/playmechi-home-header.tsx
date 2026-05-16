'use client';

import { type HomeFloatingHeaderNavItem, HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';

const PLAYMECHI_SIGN_IN_PATH = getLoginPath();

export function PlayMechiHomeHeader() {
  const { locale } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';
  const joinHref = getRegisterPath();
  const navItems: HomeFloatingHeaderNavItem[] = isSwahili
    ? [
        {
          label: 'TOURNAMENTS',
          items: [
            {
              href: '/playmechi',
              label: 'PlayMechi',
              description: 'Njia ya tournament ya uzinduzi',
            },
            {
              href: '/weekendcup',
              label: 'Weekend Cup',
              description: 'Bracket ya wiki hii',
            },
            {
              href: '/leaderboard',
              label: 'Weka Mawe',
              description: 'Ubao wa wiki',
            },
          ],
        },
        {
          label: 'MFUMO',
          items: [
            {
              href: '/dashboard',
              label: 'Dashibodi',
              description: 'Akaunti, mechi, na queue',
            },
            {
              href: '/android-testers',
              label: 'Android',
              description: 'Njia ya majaribio ya beta',
            },
          ],
        },
      ]
    : [
        {
          label: 'TOURNAMENTS',
          items: [
            {
              href: '/playmechi',
              label: 'PlayMechi',
              description: 'Launch tournament lane',
            },
            {
              href: '/weekendcup',
              label: 'Weekend Cup',
              description: 'Current weekend bracket',
            },
            {
              href: '/leaderboard',
              label: 'Weka Mawe',
              description: 'Weekly grind board',
            },
          ],
        },
        {
          label: 'PLATFORM',
          items: [
            {
              href: '/dashboard',
              label: 'Dashboard',
              description: 'Account, matches, queue',
            },
            {
              href: '/android-testers',
              label: 'Android',
              description: 'Tester lane and beta access',
            },
          ],
        },
      ];

  return (
    <HomeFloatingHeader
      navItems={navItems}
      signInHref={PLAYMECHI_SIGN_IN_PATH}
      joinHref={joinHref}
      joinLabel={isSwahili ? 'JIUNGE' : 'JOIN'}
      showRegionalControls={false}
      compact
      showLogo
    />
  );
}
