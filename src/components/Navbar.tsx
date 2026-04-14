'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { Bell, LogOut } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-white/[0.04] lg:hidden">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">M</div>
          <span className="font-bold text-white text-sm tracking-tight">Mechi</span>
        </Link>

        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-colors" aria-label="Notifications">
            <Bell size={14} />
          </button>
          {user && (
            <button onClick={logout} className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center text-white/40 transition-colors" aria-label="Sign out">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
