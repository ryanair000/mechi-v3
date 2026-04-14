'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Home, Lightbulb, LogOut, Trophy, User, Users } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/lobbies', label: 'Lobbies', icon: Users },
  { href: '/suggest', label: 'Suggest', icon: Lightbulb },
  { href: '/profile', label: 'Profile', icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 flex-col border-r border-[var(--border-color)] bg-[var(--surface-soft)] shadow-[var(--shadow-soft)] backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center justify-between border-b border-[var(--border-color)] px-5">
        <Link href="/dashboard" className="flex items-center">
          <BrandLogo size="md" variant="reversed" />
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
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
      </nav>

      <div className="space-y-1 px-3 pb-4">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--surface)] hover:text-[var(--text-primary)]">
          <Bell size={18} strokeWidth={1.5} />
          Notifications
        </button>
        {user && (
          <>
            <div className="mx-3 my-2 border-t border-[var(--border-color)]" />
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="avatar-shell h-8 w-8 text-xs">
                {user.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.username}</p>
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
