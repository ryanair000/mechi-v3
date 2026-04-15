'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const NAV_ITEMS = [
  { href: '#how-it-works', label: 'HOW IT WORKS' },
  { href: '#supported', label: 'GAMES' },
  { href: '#pricing', label: 'PRICING' },
  { href: '#ranks', label: 'RANKS' },
];

const HEADER_TEXT_CLASS =
  'rounded-lg px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]';
const SIGN_IN_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-xl border border-[rgba(50,224,196,0.28)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(50,224,196,0.12)] transition-all hover:border-[rgba(50,224,196,0.42)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)]';

export function HomeFloatingHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-4 z-50">
      <div className="landing-shell relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[calc(100%+0.35rem)] h-px w-screen -translate-x-1/2 bg-gradient-to-r from-transparent via-[rgba(50,224,196,0.3)] to-transparent"
        />
        <div className="rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-soft)] p-2 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="hidden items-center justify-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={HEADER_TEXT_CLASS}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 sm:flex">
                <Link href={user ? '/dashboard' : '/login'} className={SIGN_IN_BUTTON_CLASS}>
                  {user ? 'DASHBOARD' : 'SIGN IN'}
                </Link>
                {!user ? (
                  <Link href="/register" className="btn-primary text-sm uppercase tracking-[0.14em]">
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
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={HEADER_TEXT_CLASS}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-1 flex items-center gap-2 px-1 pb-1 pt-2">
                <Link
                  href={user ? '/dashboard' : '/login'}
                  onClick={() => setIsOpen(false)}
                  className={SIGN_IN_BUTTON_CLASS}
                >
                  {user ? 'DASHBOARD' : 'SIGN IN'}
                </Link>
                {!user ? (
                  <Link
                    href="/register"
                    onClick={() => setIsOpen(false)}
                    className="btn-primary text-sm uppercase tracking-[0.14em]"
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
