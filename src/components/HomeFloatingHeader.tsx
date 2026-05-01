'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

type NavItem = {
  href: string;
  label: string;
};

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: '#how-it-works', label: 'HOW IT WORKS' },
  { href: '#supported', label: 'GAMES' },
  { href: '#pricing', label: 'PRICING' },
  { href: '#ranks', label: 'RANKS' },
];

const HEADER_TEXT_CLASS =
  'rounded-[var(--radius-control)] px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]';
const SIGN_IN_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-panel)] border border-[rgba(50,224,196,0.28)] bg-[var(--surface-elevated)] px-4 py-2 text-base font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)] transition-all hover:border-[rgba(50,224,196,0.42)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)] sm:text-sm';

interface HomeFloatingHeaderProps {
  navItems?: NavItem[];
  signInHref?: string;
  joinHref?: string;
}

export function HomeFloatingHeader({
  navItems = DEFAULT_NAV_ITEMS,
  signInHref = '/login',
  joinHref = '/register',
}: HomeFloatingHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-2 z-50 sm:top-4">
      <div className="landing-shell relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-px w-screen -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(50,224,196,0.28)] to-transparent"
        />
        <div className="rounded-[var(--radius-nav-shell)] border border-[var(--border-color)] bg-[var(--surface-soft)] p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center rounded-[var(--radius-panel)] px-1.5 py-1">
              <BrandLogo size="sm" variant="symbol" />
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={HEADER_TEXT_CLASS}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <div className="hidden items-center gap-2 sm:flex">
                <Link href={user ? '/dashboard' : signInHref} className={SIGN_IN_BUTTON_CLASS}>
                  {user ? 'DASHBOARD' : 'SIGN IN'}
                </Link>
                {!user ? (
                  <Link href={joinHref} className="btn-primary shadow-none text-sm uppercase tracking-[0.14em]">
                    JOIN FREE
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                className="icon-button h-9 w-9 md:hidden"
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isOpen}
                aria-controls="home-mobile-nav"
              >
                {isOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>

          {isOpen ? (
            <div id="home-mobile-nav" className="mt-2 grid gap-1 border-t border-[var(--border-color)] pt-2 md:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={HEADER_TEXT_CLASS}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-1 grid gap-2 px-1 pb-1 pt-2 sm:flex sm:items-center">
                <Link
                  href={user ? '/dashboard' : signInHref}
                  onClick={() => setIsOpen(false)}
                  className={SIGN_IN_BUTTON_CLASS}
                >
                  {user ? 'DASHBOARD' : 'SIGN IN'}
                </Link>
                {!user ? (
                  <Link
                    href={joinHref}
                    onClick={() => setIsOpen(false)}
                    className="btn-primary shadow-none text-sm uppercase tracking-[0.14em]"
                  >
                    JOIN FREE
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
