'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LogOut } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationNavButton } from '@/components/NotificationNavButton';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--surface-soft)] pt-[env(safe-area-inset-top)] shadow-[var(--shadow-soft)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center rounded-xl px-1 py-1">
          <BrandLogo size="md" showIcon={false} />
        </Link>

        <div className="flex items-center gap-2">
          <NotificationNavButton className="h-10 w-10" />
          {user && (
            <button
              onClick={logout}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-500 ${
                pathname.startsWith('/profile') ? 'hover:bg-[var(--surface-elevated)]' : ''
              }`}
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
