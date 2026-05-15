'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Swords, Trophy, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/feed', label: 'Feed', icon: Home, activeHrefs: ['/dashboard'] },
  { href: '/tournaments', label: 'Tournaments', icon: Swords },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-color)] bg-[rgba(14,22,38,0.96)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-around px-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, activeHrefs = [] }) => {
          const isActive =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            activeHrefs.some(
              (activeHref) => pathname === activeHref || pathname.startsWith(`${activeHref}/`)
            );
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 self-stretch rounded-md px-1 py-2 transition-colors ${
                isActive
                  ? 'bg-[rgba(50,224,196,0.08)] text-[var(--accent-secondary-text)]'
                  : 'text-[var(--text-soft)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.3 : 1.6} />
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-normal'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
