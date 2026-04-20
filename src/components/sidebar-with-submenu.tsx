'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CirclePlay,
  Coins,
  Gamepad2,
  LayoutDashboard,
  Lightbulb,
  type LucideIcon,
  LogOut,
  MessageCircle,
  Settings,
  Share2,
  SunMedium,
  Swords,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationNavButton } from '@/components/NotificationNavButton';
import { getPlan } from '@/lib/plans';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const PRIMARY_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tutorials', label: 'Tutorials', icon: CirclePlay },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const COMPETE_ITEMS: NavItem[] = [
  { href: '/tournaments', label: 'Tournaments', icon: Swords },
  { href: '/lobbies', label: 'Lobbies', icon: Users },
  { href: '/challenges', label: 'Challenges', icon: MessageCircle },
];

const GAME_ITEMS: NavItem[] = [
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/suggest', label: 'Suggest', icon: Lightbulb },
];

const GROWTH_ITEMS: NavItem[] = [
  { href: '/share', label: 'Share', icon: Share2 },
  { href: '/rewards', label: 'Rewards', icon: Coins },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

function getNavItemClass(isActive: boolean) {
  return `flex items-center gap-2.5 rounded-md border px-2.5 py-2.5 text-[12px] font-semibold transition-all ${
    isActive
      ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--text-primary)]'
      : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
  }`;
}

function SidebarSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {title ? (
        <p className="px-2.5 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export default function SidebarWithSubmenu() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const currentPlan = getPlan(user?.plan ?? 'free');
  const profileActive = pathname === '/profile';
  const settingsActive = pathname === '/profile/settings';

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-56 flex-col border-r border-[var(--border-color)] bg-[var(--surface-strong)] lg:flex">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
        <Link href="/dashboard" className="flex items-center">
          <BrandLogo size="sm" variant="full" />
        </Link>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-soft)]">
          <SunMedium size={14} />
        </span>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-2 py-3">
        <SidebarSection>
          {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = isPathActive(pathname, href);
            return (
              <Link key={href} href={href} className={getNavItemClass(isActive)}>
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.65}
                  className={isActive ? 'text-[var(--accent-secondary-text)]' : undefined}
                />
                {label}
              </Link>
            );
          })}
        </SidebarSection>

        <SidebarSection title="Compete">
          {COMPETE_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = isPathActive(pathname, href);
            return (
              <Link key={href} href={href} className={getNavItemClass(isActive)}>
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.65}
                  className={isActive ? 'text-[var(--accent-secondary-text)]' : undefined}
                />
                {label}
              </Link>
            );
          })}
        </SidebarSection>

        <SidebarSection title="Games">
          {GAME_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = isPathActive(pathname, href);
            return (
              <Link key={href} href={href} className={getNavItemClass(isActive)}>
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.65}
                  className={isActive ? 'text-[var(--accent-secondary-text)]' : undefined}
                />
                {label}
              </Link>
            );
          })}
        </SidebarSection>

        <SidebarSection title="Growth">
          {GROWTH_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = isPathActive(pathname, href);
            return (
              <Link key={href} href={href} className={getNavItemClass(isActive)}>
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.65}
                  className={isActive ? 'text-[var(--accent-secondary-text)]' : undefined}
                />
                {label}
              </Link>
            );
          })}
        </SidebarSection>
      </nav>

      <div className="space-y-2 border-t border-[var(--border-color)] px-3 py-3">
        <div className="flex items-center gap-1">
          <NotificationNavButton className="rounded-md border border-[var(--border-color)] bg-transparent hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]" />
          <Link
            href="/profile"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
              profileActive
                ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
                : 'border-[var(--border-color)]'
            }`}
            aria-label="Profile"
            title="Profile"
          >
            <User size={13} />
          </Link>
          <Link
            href="/profile/settings"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
              settingsActive
                ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
                : 'border-[var(--border-color)]'
            }`}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={13} />
          </Link>
        </div>

        {user && (
          <div className="flex items-center gap-2.5 rounded-md border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5">
            <div className="avatar-shell relative h-[30px] w-[30px] overflow-hidden text-[11px] font-black">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={`${user.username} avatar`}
                  fill
                  sizes="30px"
                  className="object-cover"
                />
              ) : (
                user.username?.[0]?.toUpperCase() ?? '?'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[12px] font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {user.username}
              </p>
              <p className="truncate text-[10px] text-[var(--text-soft)]">{currentPlan.name}</p>
            </div>
            <button
              onClick={logout}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-soft)] transition-colors hover:bg-red-500/10 hover:text-red-400"
              aria-label="Sign out"
            >
              <LogOut size={12} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
