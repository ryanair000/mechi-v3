'use client';

import Link from 'next/link';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="nav-panel sticky top-0 z-40 border-b lg:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center">
          <BrandLogo size="sm" variant="reversed" />
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <button className="icon-button h-8 w-8" aria-label="Notifications">
            <Bell size={14} />
          </button>
          {user && (
            <button
              onClick={logout}
              className="icon-button h-8 w-8 hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-500"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
