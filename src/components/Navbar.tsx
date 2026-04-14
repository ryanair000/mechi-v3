'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { Bell, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname === '/dashboard') return 'Home';
    if (pathname === '/leaderboard') return 'Leaderboard';
    if (pathname.startsWith('/lobbies')) return 'Lobbies';
    if (pathname === '/profile') return 'Profile';
    if (pathname === '/suggest') return 'Suggest a Game';
    if (pathname.startsWith('/match')) return 'Match';
    if (pathname.startsWith('/queue')) return 'Finding Match...';
    return 'Mechi';
  };

  return (
    <nav className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-screen-sm mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-xs">M</div>
          <span className="font-black text-white text-base tracking-tight">{getTitle()}</span>
        </Link>

        <div className="flex items-center gap-1">
          <button
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Bell size={15} />
          </button>

          {user && (
            <button
              onClick={logout}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-white/50 transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
