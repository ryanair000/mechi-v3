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
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-gray-950/90 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
      <div className="max-w-screen-sm mx-auto px-1 flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-150 ${isActive ? 'bg-emerald-500/15' : ''}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] font-${isActive ? 'bold' : 'medium'} leading-none`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
