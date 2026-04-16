'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { Bell, LogOut } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--surface-soft)] pt-[env(safe-area-inset-top)] shadow-[var(--shadow-soft)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center rounded-xl px-1 py-1">
          <BrandLogo size="md" showIcon={false} />
        </Link>

        <div className="flex items-center gap-2">
          <button className="icon-button h-10 w-10" aria-label="Notifications">
            <Bell size={14} />
          </button>
          {user && (
            <button
              onClick={logout}
              className="icon-button h-10 w-10 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-500"
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
