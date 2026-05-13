'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
} from '@/lib/weekend-cup';

type WeekendCupHeaderProps = {
  optionsHref?: string;
  voteHref?: string;
  registerHref?: string;
};

export function WeekendCupHeader({
  optionsHref = '#options',
  voteHref = '#vote',
  registerHref = WEEKEND_CUP_REGISTRATION_PATH,
}: WeekendCupHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navItems = [
    { href: optionsHref, label: 'OPTIONS' },
    { href: voteHref, label: 'VOTE' },
    { href: registerHref, label: 'REGISTER' },
  ];
  const primaryNavItems = navItems.filter((item) => item.label !== 'REGISTER');

  return (
    <header className="sticky top-2 z-50 sm:top-4">
      <div className="relative mx-auto w-full max-w-[1380px] px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-px w-screen -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(50,224,196,0.22)] to-transparent"
        />
        <nav className="relative rounded-[2rem] border border-[rgba(112,139,174,0.22)] bg-[rgba(17,26,44,0.96)] px-4 py-3 shadow-[0_22px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:px-5">
          <div className="flex min-h-[56px] items-center gap-5">
            <Link
              href={WEEKEND_CUP_PUBLIC_PATH}
              className="flex shrink-0 items-center rounded-[1rem] px-1 py-1"
              aria-label="Weekend Cup home"
            >
              <BrandLogo size="sm" variant="symbol" />
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-[2.2rem] lg:flex">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[var(--radius-control)] px-3 py-2 text-base font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              <Link
                href={registerHref}
                className="hidden min-h-14 items-center justify-center rounded-[1rem] border border-[rgba(50,224,196,0.34)] bg-[rgba(17,35,55,0.88)] px-6 text-base font-black uppercase tracking-[0.18em] text-[var(--accent-secondary-text)] transition-all hover:border-[rgba(50,224,196,0.55)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)] sm:inline-flex"
              >
                Register
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                className="icon-button h-11 w-11 lg:hidden"
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
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
