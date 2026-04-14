'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, LogOut, User } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-screen-sm mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-emerald flex items-center justify-center text-white font-black text-sm">
            M
          </div>
          <span className="font-black text-gray-900 dark:text-white text-lg tracking-tight">
            Mechi
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user && (
            <>
              {/* Profile link */}
              <Link
                href="/profile"
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <User size={16} />
              </Link>

              {/* Logout */}
              <button
                onClick={logout}
                className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
