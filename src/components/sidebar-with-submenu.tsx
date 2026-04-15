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
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
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
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 flex-col border-r border-[var(--border-color)] bg-[var(--surface-soft)] shadow-[var(--shadow-soft)] backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center justify-between border-b border-[var(--border-color)] px-5">
        <Link href="/dashboard" className="flex items-center">
          <BrandLogo size="md" variant="reversed" />
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = isPathActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}

        {user?.role === 'admin' || user?.role === 'moderator' ? (
          <Link
            href="/admin"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              adminActive
                ? 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
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
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
              competeActive
                ? 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
            }`}
            aria-expanded={isCompeteOpen}
            aria-controls="app-compete-submenu"
          >
            <Users size={18} strokeWidth={competeActive ? 2 : 1.5} />
            <span className="flex-1">Compete</span>
            <ChevronDown
              size={15}
              className={`transition-transform ${isCompeteOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isCompeteOpen && (
            <ul id="app-compete-submenu" className="ml-4 mt-1 space-y-1 border-l border-[var(--border-color)] pl-3">
              {COMPETE_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = isPathActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
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

      <div className="space-y-1 px-3 pb-4">
        <div className="flex items-center gap-2 px-3 py-1">
          <button type="button" className="icon-button h-10 w-10" aria-label="Notifications" title="Notifications">
            <Bell size={16} />
          </button>
          <Link href="/profile" className="icon-button h-10 w-10" aria-label="Settings" title="Settings">
            <Settings size={16} />
          </Link>
        </div>

        {user && (
          <>
            <div className="mx-3 my-2 border-t border-[var(--border-color)]" />
            <div className="flex items-center gap-3 px-3 py-2">
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
