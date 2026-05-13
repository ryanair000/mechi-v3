'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getLoginPath } from '@/lib/navigation';
import {
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
} from '@/lib/weekend-cup';

type WeekendCupHeaderProps = {
  voteHref?: string;
  registerHref?: string;
};

export function WeekendCupHeader({
  voteHref = '#vote',
  registerHref = WEEKEND_CUP_REGISTRATION_PATH,
}: WeekendCupHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const signInHref = getLoginPath(
    voteHref.startsWith('/') ? voteHref : `${WEEKEND_CUP_PUBLIC_PATH}${voteHref}`
  );
  const navItems = [
    { href: voteHref, label: 'VOTE' },
    { href: '/leaderboard', label: 'LEADERBOARD' },
    { href: '/playmechi', label: 'LAST TOURNAMENT' },
    { href: '/android-testers', label: 'ANDROID' },
    { href: '/platform', label: 'PLATFORM' },
  ];

  return (
    <header className="sticky top-3 z-50 sm:top-5">
      <div className="relative mx-auto w-full max-w-[1140px] px-3 sm:px-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-px w-screen -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(50,224,196,0.22)] to-transparent"
        />
        <nav className="relative rounded-[2.1rem] border border-[rgba(112,139,174,0.22)] bg-[rgba(17,26,44,0.96)] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <div className="flex min-h-[52px] items-center gap-3 lg:gap-4">
            <Link
              href={WEEKEND_CUP_PUBLIC_PATH}
              className="flex shrink-0 items-center rounded-[1.2rem] px-2.5 py-1.5 sm:px-3"
              aria-label="Weekend Cup home"
            >
              <BrandLogo size="sm" variant="symbol" />
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-[0.95rem] xl:flex 2xl:gap-[1.45rem]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[var(--radius-control)] px-2 py-1.5 text-[0.72rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] 2xl:text-[0.8rem]"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <ThemeToggle />
              <Link
                href={user ? '/dashboard' : signInHref}
                className="hidden min-h-[42px] items-center justify-center rounded-[0.95rem] border border-[rgba(50,224,196,0.34)] bg-[rgba(17,35,55,0.88)] px-4 text-[0.78rem] font-black uppercase tracking-[0.18em] text-[var(--accent-secondary-text)] transition-all hover:border-[rgba(50,224,196,0.55)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)] sm:inline-flex 2xl:px-5 2xl:text-[0.82rem]"
              >
                {user ? 'Dashboard' : 'Sign in'}
              </Link>
              <Link
                href={registerHref}
                className="hidden min-h-[42px] items-center justify-center rounded-[0.95rem] bg-[#ff6268] px-5 text-[0.78rem] font-black uppercase tracking-[0.18em] text-[#07111e] shadow-[0_16px_36px_rgba(255,98,104,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#ff7479] sm:inline-flex 2xl:px-6 2xl:text-[0.82rem]"
              >
                Register
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                className="icon-button h-10 w-10 xl:hidden"
                aria-label={isOpen ? 'Close Weekend Cup menu' : 'Open Weekend Cup menu'}
                aria-expanded={isOpen}
                aria-controls="weekendcup-mobile-nav"
              >
                {isOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {isOpen ? (
            <div
              id="weekendcup-mobile-nav"
              className="mt-3 grid gap-2 border-t border-[rgba(112,139,174,0.2)] pt-3 xl:hidden"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-[var(--radius-panel)] px-3 py-3 text-sm font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                <Link
                  href={user ? '/dashboard' : signInHref}
                  onClick={() => setIsOpen(false)}
                  className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-panel)] border border-[rgba(50,224,196,0.34)] bg-[rgba(17,35,55,0.88)] px-4 text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-secondary-text)]"
                >
                  {user ? 'Dashboard' : 'Sign in'}
                </Link>
                <Link
                  href={registerHref}
                  onClick={() => setIsOpen(false)}
                  className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-panel)] bg-[#ff6268] px-4 text-sm font-black uppercase tracking-[0.18em] text-[#07111e]"
                >
                  Register
                </Link>
              </div>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
