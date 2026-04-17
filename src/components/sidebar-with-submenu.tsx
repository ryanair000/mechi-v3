'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Gamepad2,
  Lightbulb,
  type LucideIcon,
  LogOut,
  Settings,
  Shield,
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
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
];

const COMPETE_ITEMS: NavItem[] = [
  { href: '/tournaments', label: 'Tournaments', icon: Swords },
  { href: '/lobbies', label: 'Lobbies', icon: Users },
  { href: '/suggest', label: 'Suggest', icon: Lightbulb },
  { href: '/games', label: 'Games', icon: Gamepad2 },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

export default function SidebarWithSubmenu() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const adminActive = isPathActive(pathname, '/admin');
  const currentPlan = getPlan(user?.plan ?? 'free');

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[17rem] flex-col border-r border-[var(--border-color)] bg-[linear-gradient(180deg,var(--surface-strong),var(--surface-soft))] px-3 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl lg:flex">
      <div className="flex items-center justify-between rounded-[1.35rem] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
        <Link href="/dashboard" className="flex items-center">
          <BrandLogo size="md" variant="full" />
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-1 py-4">
        {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = isPathActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition-all ${
                isActive
                  ? 'border-[rgba(50,224,196,0.22)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[0_16px_28px_rgba(50,224,196,0.12)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.65}
                className={isActive ? 'text-[var(--accent-secondary-text)]' : undefined}
              />
              {label}
            </Link>
          );
        })}

        {COMPETE_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = isPathActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition-all ${
                isActive
                  ? 'border-[rgba(50,224,196,0.22)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[0_16px_28px_rgba(50,224,196,0.12)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.65}
                className={isActive ? 'text-[var(--accent-secondary-text)]' : undefined}
              />
              {label}
            </Link>
          );
        })}

        {user?.role === 'admin' || user?.role === 'moderator' ? (
          <Link
            href="/admin"
            className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition-all ${
              adminActive
                ? 'border-[rgba(255,107,107,0.2)] bg-[var(--surface-elevated)] text-[var(--brand-coral)] shadow-[0_16px_28px_rgba(255,107,107,0.12)]'
                : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Shield size={18} strokeWidth={adminActive ? 2 : 1.5} />
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="space-y-2 px-1 pb-1">
        <div className="flex items-center gap-1 px-1 py-1">
          <NotificationNavButton />
          <Link
            href="/profile"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
              isPathActive(pathname, '/profile')
                ? 'bg-[var(--surface-elevated)] text-[var(--accent-secondary-text)] shadow-[0_12px_24px_rgba(50,224,196,0.12)]'
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
