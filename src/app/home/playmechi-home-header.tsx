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
        {
          label: 'REGISTER',
          items: [
            {
              href: '/android-testers',
              label: 'Android Tester',
              description: 'Jiunge na beta ya app',
            },
            {
              href: '/weekendcup/register',
              label: 'Weekend Cup',
              description: 'Funga slot ya mashindano',
            },
            {
              href: '/leaderboard',
              label: 'Weka Mawe Weekly',
              description: 'Ingia kwenye ubao wa wiki',
            },
          ],
        },
        {
          label: 'POLL',
          items: [
            {
              href: '/weekendcup#vote',
              label: 'Weekend Cup Mystery Game Mobile',
              description: 'Piga kura ya mystery slot',
            },
            {
              href: '/weekendcup#vote',
              label: 'Weekend Cup Season 2 Console',
              description: 'Chagua game ya Season 2',
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
              description: 'Main event, ready to run',
            },
            {
              href: '/weekendcup',
              label: 'Weekend Cup',
              description: 'Weekend bracket, locked in',
            },
            {
              href: '/leaderboard',
              label: 'Weka Mawe',
              description: 'Weekly leaderboard push',
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
        {
          label: 'REGISTER',
          items: [
            {
              href: '/android-testers',
              label: 'Android Tester',
              description: 'Join the app beta lane',
            },
            {
              href: '/weekendcup/register',
              label: 'Weekend Cup',
              description: 'Lock your tournament slot',
            },
            {
              href: '/leaderboard',
              label: 'Weka Mawe Weekly',
              description: 'Enter the weekly board',
            },
          ],
        },
        {
          label: 'POLL',
          items: [
            {
              href: '/weekendcup#vote',
              label: 'Weekend Cup Mystery Game Mobile',
              description: 'Vote the mystery slot',
            },
            {
              href: '/weekendcup#vote',
              label: 'Weekend Cup Season 2 Console',
              description: 'Pick the Season 2 game',
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
