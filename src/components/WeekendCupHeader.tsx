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
    <header className="sticky top-2 z-50 sm:top-3">
      <div className="relative mx-auto w-full max-w-[980px] px-3 sm:px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-px w-screen -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(50,224,196,0.22)] to-transparent"
        />
        <nav className="relative rounded-[1.6rem] border border-[rgba(112,139,174,0.22)] bg-[rgba(17,26,44,0.96)] p-1 shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex min-h-[40px] items-center gap-2.5 lg:gap-3">
            <Link
              href={WEEKEND_CUP_PUBLIC_PATH}
              className="flex shrink-0 items-center rounded-[1rem] px-2 py-1 sm:px-2.5"
              aria-label="Weekend Cup home"
            >
              <BrandLogo size="xs" variant="symbol" />
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 lg:flex xl:gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[0.9rem] px-1.5 py-1 text-[0.64rem] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] xl:text-[0.68rem]"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <Link
                href={user ? '/dashboard' : signInHref}
                className="hidden min-h-[36px] items-center justify-center rounded-[0.9rem] border border-[rgba(50,224,196,0.34)] bg-[rgba(17,35,55,0.88)] px-3.5 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--accent-secondary-text)] transition-all hover:border-[rgba(50,224,196,0.55)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)] sm:inline-flex lg:px-4"
              >
                {user ? 'Dashboard' : 'Sign in'}
              </Link>
              <Link
                href={registerHref}
                className="hidden min-h-[36px] items-center justify-center rounded-[0.9rem] bg-[#ff6268] px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#07111e] shadow-[0_12px_28px_rgba(255,98,104,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#ff7479] sm:inline-flex lg:px-[1.125rem]"
              >
                Register
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                className="icon-button h-9 w-9 lg:hidden"
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
              className="mt-3 grid gap-2 border-t border-[rgba(112,139,174,0.2)] pt-3 lg:hidden"
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
