'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#trust', label: 'Why Mechi' },
  { href: '#supported', label: 'Games' },
];

export function HomeFloatingHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-4 z-50">
      <div className="landing-shell">
        <div className="rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-soft)] p-2 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="rounded-lg px-1 py-1" onClick={() => setIsOpen(false)}>
              <BrandLogo size="sm" />
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/login" className="brand-link text-sm font-semibold">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary text-sm">
                  Join free
                </Link>
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
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-1 flex items-center gap-2 px-1 pb-1 pt-2">
                <Link href="/login" onClick={() => setIsOpen(false)} className="btn-outline text-sm">
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setIsOpen(false)} className="btn-primary text-sm">
                  Join free
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
