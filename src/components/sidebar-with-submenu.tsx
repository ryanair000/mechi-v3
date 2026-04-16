'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  Home,
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
import { ThemeToggle } from '@/components/ThemeToggle';

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
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

export default function SidebarWithSubmenu() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const competeActive = useMemo(
    () => COMPETE_ITEMS.some((item) => isPathActive(pathname, item.href)),
    [pathname]
  );
  const [isCompeteOpen, setIsCompeteOpen] = useState(competeActive);
  const adminActive = isPathActive(pathname, '/admin');

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

        <div>
          <button
            type="button"
            onClick={() => setIsCompeteOpen((open) => !open)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm font-semibold transition-all ${
              competeActive
                ? 'border-[rgba(50,224,196,0.22)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[0_16px_28px_rgba(50,224,196,0.12)]'
                : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
            }`}
            aria-expanded={isCompeteOpen}
            aria-controls="app-compete-submenu"
          >
            <Users
              size={18}
              strokeWidth={competeActive ? 2 : 1.65}
              className={competeActive ? 'text-[var(--accent-secondary-text)]' : undefined}
            />
            <span className="flex-1">Compete</span>
            <ChevronDown
              size={15}
              className={`transition-transform ${isCompeteOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isCompeteOpen && (
            <ul
              id="app-compete-submenu"
              className="ml-4 mt-2 space-y-1 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)]"
            >
              {COMPETE_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = isPathActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'border-[rgba(50,224,196,0.18)] bg-[var(--surface-elevated)] text-[var(--accent-secondary-text)]'
                          : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2 : 1.6} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      <div className="space-y-2 px-1 pb-1">
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-soft)]">
          <button type="button" className="icon-button h-10 w-10" aria-label="Notifications" title="Notifications">
            <Bell size={16} />
          </button>
          <Link href="/profile" className="icon-button h-10 w-10" aria-label="Settings" title="Settings">
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
                <p className="truncate text-[11px] text-[var(--text-soft)]">Ready to compete</p>
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
