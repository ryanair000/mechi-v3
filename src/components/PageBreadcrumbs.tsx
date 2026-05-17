'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { getGameLogoImage } from '@/lib/config';
import { cn } from '@/lib/utils';
import type { GameKey } from '@/types';

type BreadcrumbItem = {
  href: string;
  iconUrl?: string | null;
  label: string;
  current?: boolean;
};

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  'android-testers': 'Android',
  banned: 'Account Status',
  blog: 'Blog',
  bounties: 'Bounties',
  challenges: 'Challenges',
  check: 'Check',
  'check-in': 'Check-In',
  codm: 'CODM',
  community: 'Community',
  complete: 'Complete',
  createdispute: 'Create Dispute',
  dashboard: 'Dashboard',
  dispute: 'Dispute',
  disputes: 'Disputes',
  efootball: 'eFootball',
  failed: 'Failed',
  games: 'Games',
  home: 'Home',
  join: 'Join',
  leaderboard: 'Leaderboard',
  live: 'Live',
  lobbies: 'Lobbies',
  lobby: 'Lobby',
  login: 'Sign In',
  'manual-tests': 'Test Kit',
  matches: 'Matches',
  match: 'Match',
  moderators: 'Moderators',
  moderator: 'Moderator',
  mystery: 'Mystery Game',
  'online-gaming-tournament': 'PlayMechi Launch',
  observability: 'Observability',
  ops: 'Ops',
  payment: 'Payment',
  payments: 'Payments',
  platform: 'Platform',
  playmechi: 'PlayMechi',
  pricing: 'Subscriptions',
  privacy: 'Privacy',
  'privacy-policy': 'Privacy Policy',
  profile: 'Profile',
  pubgm: 'PUBG Mobile',
  queue: 'Queue',
  register: 'Register',
  report: 'Report',
  reports: 'Reports',
  'reset-password': 'Reset Password',
  results: 'Results',
  rewards: 'Rewards',
  share: 'Share',
  signup: 'Sign Up',
  status: 'Status',
  streams: 'Streams',
  suggest: 'Suggestions',
  support: 'Support',
  t: 'Details',
  terms: 'Terms',
  'terms-of-service': 'Terms of Service',
  tournament: 'Tournament',
  tournaments: 'Tournaments',
  user: 'User',
  'user-data-deletion': 'Delete Data',
  vote: 'Vote',
  weekendcup: 'Weekend Cup',
};

function formatSegment(segment: string) {
  const normalized = decodeURIComponent(segment).toLowerCase();
  const mapped = SEGMENT_LABELS[normalized];
  if (mapped) {
    return mapped;
  }

  return decodeURIComponent(segment)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSegmentLogo(segment: string) {
  const normalized = decodeURIComponent(segment).toLowerCase();
  if (!['codm', 'efootball', 'freefire', 'pubgm'].includes(normalized)) {
    return null;
  }

  return getGameLogoImage(normalized as GameKey);
}

function BreadcrumbLabel({ item }: { item: BreadcrumbItem }) {
  if (!item.iconUrl) {
    return item.label;
  }

  return (
    <>
      <span className="sr-only">{item.label}</span>
      <span className="relative block h-4 w-24">
        <Image
          src={item.iconUrl}
          alt=""
          fill
          sizes="96px"
          className="object-contain object-left"
        />
      </span>
    </>
  );
}

function buildBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  if (pathname === '/' || pathname === '/home') {
    return [{ href: '/', label: 'Home', current: true }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ href: '/', label: 'Home' }];
  let href = '';

  for (const segment of segments) {
    href += `/${segment}`;

    if (segment === 'home') {
      continue;
    }

    items.push({
      href,
      iconUrl: getSegmentLogo(segment),
      label: formatSegment(segment),
    });
  }

  if (items.length === 1) {
    items[0] = { ...items[0], current: true };
    return items;
  }

  return items.map((item, index) => ({
    ...item,
    current: index === items.length - 1,
  }));
}

export function PageBreadcrumbs({
  className,
  innerClassName,
}: {
  className?: string;
  innerClassName?: string;
}) {
  const pathname = usePathname();
  const items = buildBreadcrumbItems(pathname || '/');

  return (
    <nav aria-label="Breadcrumb" className={cn('breadcrumb-shell', className)}>
      <ol className={cn('breadcrumb-list', innerClassName)}>
        {items.map((item, index) => (
          <li key={`${item.href}-${item.label}`} className="flex min-w-0 items-center gap-2">
            {index === 0 ? <Home size={13} className="shrink-0 text-[var(--accent-secondary-text)]" /> : null}
            {item.current ? (
              <span
                aria-current="page"
                className="flex min-w-0 items-center truncate font-[var(--font-display)] text-[0.72rem] font-black uppercase tracking-[0.14em] text-[var(--text-primary)]"
              >
                <BreadcrumbLabel item={item} />
              </span>
            ) : (
              <Link
                href={item.href}
                className="flex min-w-0 items-center truncate font-[var(--font-display)] text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
              >
                <BreadcrumbLabel item={item} />
              </Link>
            )}

            {!item.current ? (
              <ChevronRight size={13} className="shrink-0 text-[var(--text-soft)]/80" />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
