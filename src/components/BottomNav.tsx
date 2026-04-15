'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Shield, Swords, Trophy, User, Users } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/tournaments', label: 'Brackets', icon: Swords },
  { href: '/lobbies', label: 'Lobbies', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-color)] bg-[var(--surface-soft)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors ${
                isActive
                  ? 'text-[var(--brand-coral)]'
                  : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-normal'}`}>{label}</span>
            </Link>
          );
        })}
        {user?.role === 'admin' || user?.role === 'moderator' ? (
          <Link
            href="/admin"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors ${
              pathname.startsWith('/admin')
                ? 'text-[var(--brand-coral)]'
                : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Shield size={18} strokeWidth={pathname.startsWith('/admin') ? 2.5 : 1.5} />
            <span className={`text-[10px] ${pathname.startsWith('/admin') ? 'font-semibold' : 'font-normal'}`}>
              Admin
            </span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
