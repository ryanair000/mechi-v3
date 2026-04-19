'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { NotificationNavButton } from '@/components/NotificationNavButton';
import { ThemeToggle } from '@/components/ThemeToggle';

type HeaderConfig = {
  eyebrow: string;
  title: string;
  backHref?: string;
  backLabel?: string;
};

const HEADER_CONFIGS: Array<{
  matches: (pathname: string) => boolean;
  config: HeaderConfig;
}> = [
  {
    matches: (pathname) => pathname.startsWith('/profile/settings'),
    config: {
      eyebrow: 'Profile',
      title: 'Settings',
      backHref: '/profile',
      backLabel: 'Back to profile',
    },
  },
  {
    matches: (pathname) => pathname.startsWith('/lobbies/create'),
    config: {
      eyebrow: 'Lobbies',
      title: 'Create lobby',
      backHref: '/lobbies',
      backLabel: 'Back to lobbies',
    },
  },
  { matches: (pathname) => pathname.startsWith('/dashboard'), config: { eyebrow: 'Home', title: 'Dashboard' } },
  { matches: (pathname) => pathname.startsWith('/leaderboard'), config: { eyebrow: 'Compete', title: 'Leaderboard' } },
  { matches: (pathname) => pathname.startsWith('/tournaments'), config: { eyebrow: 'Compete', title: 'Tournaments' } },
  { matches: (pathname) => pathname.startsWith('/lobbies'), config: { eyebrow: 'Compete', title: 'Lobbies' } },
  { matches: (pathname) => pathname.startsWith('/games'), config: { eyebrow: 'Library', title: 'Games' } },
  { matches: (pathname) => pathname.startsWith('/suggest'), config: { eyebrow: 'Library', title: 'Suggest a game' } },
  { matches: (pathname) => pathname.startsWith('/tutorials'), config: { eyebrow: 'Learn', title: 'Tutorials' } },
  { matches: (pathname) => pathname.startsWith('/challenges'), config: { eyebrow: 'Compete', title: 'Challenges' } },
  { matches: (pathname) => pathname.startsWith('/share'), config: { eyebrow: 'Community', title: 'Share' } },
  { matches: (pathname) => pathname.startsWith('/profile'), config: { eyebrow: 'Player', title: 'Profile' } },
  { matches: (pathname) => pathname.startsWith('/notifications'), config: { eyebrow: 'Inbox', title: 'Notifications' } },
];

function getFallbackTitle(pathname: string) {
  const segment = pathname.split('/').filter(Boolean).at(-1);

  if (!segment) {
    return { eyebrow: 'App', title: 'Mechi' };
  }

  return {
    eyebrow: 'App',
    title: segment
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
  };
}

export function AppMobileUtilityHeader() {
  const pathname = usePathname();
  const config: HeaderConfig =
    HEADER_CONFIGS.find((entry) => entry.matches(pathname))?.config ?? getFallbackTitle(pathname);

  return (
    <header className="app-utility-header lg:hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          {config.backHref ? (
            <Link
              href={config.backHref}
              className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft size={14} />
              {config.backLabel}
            </Link>
          ) : null}
          <p className="app-page-eyebrow">{config.eyebrow}</p>
          <h1 className="truncate text-lg font-bold text-[var(--text-primary)]">{config.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationNavButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
