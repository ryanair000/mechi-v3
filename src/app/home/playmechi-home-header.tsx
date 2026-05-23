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
              description: 'Tournament iliyopita',
            },
            {
              href: '/weekendcup',
              label: 'Weekend Cup',
              description: 'Bracket ya wiki hii',
            },
            {
              href: '/playmechi/weka-mawe',
              label: 'Weka Mawe',
              description: 'Bracket ya KSh 100',
            },
          ],
        },
        {
          label: 'MFUMO',
          items: [
            {
              href: '/how-mechi-works',
              label: 'Jinsi Mechi Inavyofanya Kazi',
              description: 'Maelezo rahisi kwa players',
            },
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
              href: '/playmechi/weka-mawe/register',
              label: 'Weka Mawe Weekly',
              description: 'Funga slot ya KSh 100',
            },
          ],
        },
        {
          label: 'CUP',
          items: [
            {
              href: '/weekendcup/register?game=freefire',
              label: 'Free Fire Weekend Cup',
              description: 'Free Fire imethibitishwa',
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
              description: 'Previous launch event',
            },
            {
              href: '/weekendcup',
              label: 'Weekend Cup',
              description: 'Weekend bracket, locked in',
            },
            {
              href: '/playmechi/weka-mawe',
              label: 'Weka Mawe',
              description: 'Weekly KSh 100 bracket',
            },
          ],
        },
        {
          label: 'PLATFORM',
          items: [
            {
              href: '/how-mechi-works',
              label: 'How Mechi Works',
              description: 'Clear player guide',
            },
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
              href: '/playmechi/weka-mawe/register',
              label: 'Weka Mawe Weekly',
              description: 'Lock the KSh 100 slot',
            },
          ],
        },
        {
          label: 'CUP',
          items: [
            {
              href: '/weekendcup/register?game=freefire',
              label: 'Free Fire Weekend Cup',
              description: 'Free Fire confirmed',
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
