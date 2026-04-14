'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Users, Lightbulb, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/lobbies', label: 'Lobbies', icon: Users },
  { href: '/suggest', label: 'Suggest', icon: Lightbulb },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="max-w-screen-sm mx-auto px-2 flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px] ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-[10px] font-${isActive ? 'bold' : 'medium'}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
