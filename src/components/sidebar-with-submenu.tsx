'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CirclePlay,
  Home,
  Gamepad2,
  Lightbulb,
  type LucideIcon,
  LogOut,
  MessageCircle,
  Settings,
  Share2,
  Swords,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationNavButton } from '@/components/NotificationNavButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getPlan } from '@/lib/plans';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const PRIMARY_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
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

const SHARE_ITEMS: NavItem[] = [
  { href: '/share', label: 'Share', icon: Share2 },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

function getNavItemClass(isActive: boolean) {
  return `flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition-all ${
    isActive
      ? 'border-[rgba(50,224,196,0.2)] bg-[var(--accent-secondary-soft)] text-[var(--text-primary)]'
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
        <p className="px-3.5 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
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
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[17rem] flex-col border-r border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3 lg:flex">
      <div className="flex items-center justify-between rounded-[1.35rem] border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3">
        <Link href="/dashboard" className="flex items-center">
          <BrandLogo size="md" variant="full" />
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-1 py-4">
        <SidebarSection>
          {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = isPathActive(pathname, href);
            return (
              <Link key={href} href={href} className={getNavItemClass(isActive)}>
                <Icon
                  size={18}
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
                  size={18}
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
                  size={18}
                  strokeWidth={isActive ? 2 : 1.65}
                  className={isActive ? 'text-[var(--accent-secondary-text)]' : undefined}
                />
                {label}
              </Link>
            );
          })}
        </SidebarSection>

        <SidebarSection title="Share">
          {SHARE_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = isPathActive(pathname, href);
            return (
              <Link key={href} href={href} className={getNavItemClass(isActive)}>
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.65}
                  className={isActive ? 'text-[var(--accent-secondary-text)]' : undefined}
                />
                {label}
              </Link>
            );
          })}
        </SidebarSection>
      </nav>

      <div className="space-y-2 px-1 pb-1">
        <div className="flex items-center gap-1 px-1 py-1">
          <NotificationNavButton />
          <Link
            href="/profile"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
              profileActive
                ? 'bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]'
                : ''
            }`}
            aria-label="Profile"
            title="Profile"
          >
            <User size={16} />
          </Link>
          <Link
            href="/profile/settings"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
              settingsActive
                ? 'bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]'
                : ''
            }`}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={16} />
          </Link>
        </div>

        {user && (
          <>
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-3 shadow-[var(--shadow-soft)]">
              <div className="avatar-shell relative h-8 w-8 overflow-hidden text-xs">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={`${user.username} avatar`}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  user.username?.[0]?.toUpperCase() ?? '?'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {user.username}
                </p>
                <p className="truncate text-[11px] text-[var(--text-soft)]">{currentPlan.name}</p>
              </div>
              <button
                onClick={logout}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-soft)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
