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
  { href: '/android-testers', label: 'ANDROID' },
  { href: '#pricing', label: 'PRICING' },
  { href: '#ranks', label: 'RANKS' },
];
const DISPLAY_FONT_STYLE = { fontFamily: 'var(--font-display)' } as const;

const HEADER_TEXT_CLASS =
  'inline-flex min-h-[3.25rem] items-center rounded-[1rem] px-4 py-2 font-[var(--font-display)] text-[0.8rem] font-extrabold uppercase tracking-[0.18em] text-[color:rgba(193,203,218,0.96)] transition-colors hover:text-[var(--text-primary)]';
const SIGN_IN_BUTTON_CLASS =
  'inline-flex min-h-[3.25rem] items-center justify-center rounded-[1rem] border border-[rgba(50,224,196,0.32)] bg-[rgba(17,27,46,0.88)] px-6 py-2 font-[var(--font-display)] text-[0.8rem] font-extrabold uppercase tracking-[0.18em] text-[var(--accent-secondary-text)] transition-all hover:border-[rgba(50,224,196,0.46)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)]';
const JOIN_BUTTON_CLASS =
  'btn-primary min-h-[3.25rem] rounded-[1rem] px-6 shadow-none font-[var(--font-display)] text-[0.8rem] font-extrabold uppercase tracking-[0.18em] text-[#08111d]';

interface HomeFloatingHeaderProps {
  navItems?: NavItem[];
  signInHref?: string;
  joinHref?: string;
  joinLabel?: string;
  showLogo?: boolean;
}

export function HomeFloatingHeader({
  navItems = DEFAULT_NAV_ITEMS,
  signInHref = '/login',
  joinHref = '/register',
  joinLabel = 'JOIN FREE',
  showLogo = true,
}: HomeFloatingHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-3 z-50 sm:top-6">
      <div className="relative mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-px w-screen -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(50,224,196,0.28)] to-transparent"
        />
        <div className="rounded-[var(--radius-nav-shell)] border border-[var(--border-color)] bg-[var(--surface-soft)] p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-2">
          <div className="flex items-center gap-4">
            {showLogo ? (
              <Link href="/" className="flex shrink-0 items-center rounded-[1rem] px-2 py-1.5">
                <BrandLogo size="md" variant="symbol" />
              </Link>
            ) : null}

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={HEADER_TEXT_CLASS}
                  style={DISPLAY_FONT_STYLE}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle className="!h-[3.25rem] !min-h-[3.25rem] !w-[3.25rem] !min-w-[3.25rem] !rounded-[1rem] !border-[rgba(129,148,178,0.18)] !bg-[rgba(17,27,46,0.88)] !text-[color:rgba(193,203,218,0.96)]" />
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href={user ? '/dashboard' : signInHref}
                  className={SIGN_IN_BUTTON_CLASS}
                  style={DISPLAY_FONT_STYLE}
                >
                  {user ? 'DASHBOARD' : 'SIGN IN'}
                </Link>
                {!user ? (
                  <Link href={joinHref} className={JOIN_BUTTON_CLASS} style={DISPLAY_FONT_STYLE}>
                    {joinLabel}
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
                  style={DISPLAY_FONT_STYLE}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-1 grid gap-2 px-1 pb-1 pt-2 sm:flex sm:items-center">
                <Link
                  href={user ? '/dashboard' : signInHref}
                  onClick={() => setIsOpen(false)}
                  className={SIGN_IN_BUTTON_CLASS}
                  style={DISPLAY_FONT_STYLE}
                >
                  {user ? 'DASHBOARD' : 'SIGN IN'}
                </Link>
                {!user ? (
                  <Link
                    href={joinHref}
                    onClick={() => setIsOpen(false)}
                    className={JOIN_BUTTON_CLASS}
                    style={DISPLAY_FONT_STYLE}
                  >
                    {joinLabel}
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
