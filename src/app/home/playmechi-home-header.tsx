'use client';

import { type HomeFloatingHeaderNavItem, HomeFloatingHeader } from '@/components/HomeFloatingHeader';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { getLoginPath, getRegisterPath } from '@/lib/navigation';

const PLAYMECHI_SIGN_IN_PATH = getLoginPath();

export function PlayMechiHomeHeader() {
  const { country, locale } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';
  const isUnitedStates = country === 'united_states';
  const joinHref = getRegisterPath();
  const navItems: HomeFloatingHeaderNavItem[] = isUnitedStates
    ? [
        {
          label: 'COMPETE',
          items: [
            {
              href: '/weekendcup',
              label: 'Weekend Cup',
              description: 'Prize bracket and live schedule',
            },
            {
              href: '/playmechi',
              label: 'PlayMechi',
              description: 'Community tournament hub',
            },
            {
              href: '/dashboard',
              label: 'Ladders',
              description: 'Queue, matches, and ranking',
            },
          ],
        },
        {
          label: 'COMMUNITY',
          items: [
            {
              href: '/android-testers',
              label: 'Android Beta',
              description: 'Join the tester lane',
            },
            {
              href: '/streams',
              label: 'Streams',
              description: 'Watch PlayMechi moments',
            },
          ],
        },
        {
          label: 'JOIN',
          items: [
            {
              href: '/register',
              label: 'Create Account',
              description: 'Build your player profile',
            },
            {
              href: '/weekendcup/register',
              label: 'Weekend Cup',
              description: 'Lock a tournament slot',
            },
          ],
        },
        {
          label: 'VOTE',
          items: [
            {
              href: '/weekendcup#vote',
              label: 'Mystery Game',
              description: 'Pick a future bracket',
            },
            {
              href: '/weekendcup#vote',
              label: 'Console Season',
              description: 'Help shape the next lineup',
            },
          ],
        },
      ]
    : isSwahili
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
      joinLabel={isSwahili ? 'JIUNGE' : isUnitedStates ? 'PLAY' : 'JOIN'}
      showRegionalControls={false}
      compact
      showLogo
    />
  );
}
