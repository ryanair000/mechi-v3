'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, Trophy, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { V5Logo } from './V5Logo';
import styles from './V5Public.module.css';

const navigation = [
  { label: 'Compete', href: '/app/player' },
  { label: 'Tournaments', href: '/tournaments' },
  { label: 'Rankings', href: '/leaderboard' },
  { label: 'Watch', href: '/streams' },
  { label: 'Community', href: '/community' },
] as const;

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function V5PublicHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [drawerTop, setDrawerTop] = useState(68);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  const openMenu = useCallback(() => {
    const bottom = headerRef.current?.getBoundingClientRect().bottom ?? 68;
    setDrawerTop(Math.max(0, Math.round(bottom)));
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(focusableSelector);
    const focusFrame = window.requestAnimationFrame(() => firstFocusable?.focus());

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;
      const panelFocusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      const focusable = menuButtonRef.current
        ? [menuButtonRef.current, ...panelFocusable]
        : panelFocusable;
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 960) {
        closeMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [closeMenu, isOpen]);

  return (
    <>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <Link className={styles.announcement} href="/app/organizer/tournaments/new">
        <Trophy size={14} aria-hidden="true" />
        <span>Host a free tournament today</span>
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
      <header className={styles.header} ref={headerRef}>
        <div className={styles.headerInner}>
          <V5Logo priority />
          <nav className={styles.nav} aria-label="Main navigation">
            {navigation.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  className={active ? styles.navLinkActive : undefined}
                  aria-current={active ? 'page' : undefined}
                  key={item.label}
                  href={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className={styles.headerActions}>
            <Link className={styles.buttonGhost} href="/login">Sign in</Link>
            <Link className={styles.button} href="/register">Join free</Link>
          </div>
          <button
            ref={menuButtonRef}
            className={styles.mobileMenuButton}
            type="button"
            aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
            aria-controls="v5-mobile-navigation"
            aria-expanded={isOpen}
            onClick={isOpen ? () => closeMenu() : openMenu}
          >
            {isOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </header>
      {isOpen ? (
        <div
          className={styles.mobileLayer}
          style={{ '--mobile-drawer-top': `${drawerTop}px` } as CSSProperties}
        >
          <button
            className={styles.mobileBackdrop}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => closeMenu()}
          />
          <div
            ref={panelRef}
            id="v5-mobile-navigation"
            className={styles.mobilePanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="v5-mobile-navigation-title"
          >
            <div className={styles.mobilePanelHeader}>
              <h2 id="v5-mobile-navigation-title">Navigation</h2>
            </div>
            <nav aria-label="Mobile navigation">
              {navigation.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    className={`${styles.mobileLink} ${active ? styles.mobileLinkActive : ''}`}
                    aria-current={active ? 'page' : undefined}
                    key={item.label}
                    href={item.href}
                    onClick={() => closeMenu(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className={styles.mobileAccountActions}>
              <Link className={styles.mobileSignIn} href="/login" onClick={() => closeMenu(false)}>Sign in</Link>
              <Link className={styles.mobileJoin} href="/register" onClick={() => closeMenu(false)}>Join free</Link>
            </div>
            <div className={styles.mobileThemeRow}>
              <span>Appearance</span>
              <ThemeToggle variant="pill" className={styles.mobileThemeControl} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
