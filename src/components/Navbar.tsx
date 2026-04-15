'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { Bell, LogOut } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 border-b border-white/[0.04] bg-gray-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">M</div>
          <span className="font-bold text-white text-sm tracking-tight">Mechi</span>
        </Link>

        <div className="flex items-center gap-1">
          <button className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.04] text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white" aria-label="Notifications">
            <Bell size={14} />
          </button>
          {user && (
            <button onClick={logout} className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.04] text-white/40 transition-colors hover:bg-red-500/15 hover:text-red-400" aria-label="Sign out">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
