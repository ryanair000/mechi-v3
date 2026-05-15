'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { CountryLanguageBar } from '@/components/CountryLanguageBar';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

type NavLinkItem = {
  href: string;
  label: string;
  description?: string;
};

type NavDropdownItem = {
  label: string;
  items: NavLinkItem[];
};

export type HomeFloatingHeaderNavItem = NavLinkItem | NavDropdownItem;

const DEFAULT_NAV_ITEMS: HomeFloatingHeaderNavItem[] = [
  { href: '#how-it-works', label: 'HOW IT WORKS' },
  { href: '#supported', label: 'GAMES' },
  { href: '/android-testers', label: 'ANDROID' },
  { href: '#pricing', label: 'PRICING' },
  { href: '#ranks', label: 'RANKS' },
];
const SWAHILI_DEFAULT_NAV_ITEMS: HomeFloatingHeaderNavItem[] = [
  { href: '#how-it-works', label: 'JINSI INAVYOFANYA KAZI' },
  { href: '#supported', label: 'MICHEZO' },
  { href: '/android-testers', label: 'ANDROID' },
  { href: '#pricing', label: 'BEI' },
  { href: '#ranks', label: 'RANKI' },
];
const DISPLAY_FONT_STYLE = { fontFamily: 'var(--font-display)' } as const;

const HEADER_TEXT_CLASS =
  'inline-flex min-h-[2.3rem] items-center rounded-[0.85rem] px-3 py-1.5 font-[var(--font-display)] text-[0.88rem] font-extrabold uppercase tracking-[0.16em] text-[color:rgba(193,203,218,0.96)] transition-colors hover:text-[var(--text-primary)]';
const SIGN_IN_BUTTON_CLASS =
  'inline-flex min-h-[2.3rem] items-center justify-center rounded-[0.85rem] border border-[rgba(50,224,196,0.32)] bg-[rgba(17,27,46,0.88)] px-[1.125rem] py-1.5 font-[var(--font-display)] text-[0.88rem] font-extrabold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)] transition-all hover:border-[rgba(50,224,196,0.46)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)]';
const JOIN_BUTTON_CLASS =
  'btn-primary min-h-[2.3rem] rounded-[0.85rem] px-[1.125rem] shadow-none font-[var(--font-display)] text-[0.88rem] font-extrabold uppercase tracking-[0.16em] text-[#08111d]';
const DROPDOWN_PANEL_CLASS =
  'pointer-events-none invisible absolute left-1/2 top-[calc(100%+0.65rem)] z-50 min-w-[15rem] -translate-x-1/2 rounded-[1rem] border border-[rgba(129,148,178,0.18)] bg-[rgba(11,20,36,0.96)] p-2 opacity-0 shadow-[0_20px_60px_rgba(2,8,23,0.45)] backdrop-blur-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100';
const DROPDOWN_LINK_CLASS =
  'flex rounded-[0.85rem] px-3 py-2.5 text-left transition-colors hover:bg-[rgba(50,224,196,0.1)] focus-visible:bg-[rgba(50,224,196,0.1)] focus-visible:outline-none';

function isDropdownNavItem(item: HomeFloatingHeaderNavItem): item is NavDropdownItem {
  return 'items' in item;
}

interface HomeFloatingHeaderProps {
  navItems?: HomeFloatingHeaderNavItem[];
  signInHref?: string;
  joinHref?: string;
  joinLabel?: string;
  showLogo?: boolean;
}

export function HomeFloatingHeader({
  navItems,
  signInHref = '/login',
  joinHref = '/register',
  joinLabel,
  showLogo = true,
}: HomeFloatingHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);
  const { user } = useAuth();
  const { locale } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';
  const resolvedNavItems = navItems ?? (isSwahili ? SWAHILI_DEFAULT_NAV_ITEMS : DEFAULT_NAV_ITEMS);
  const resolvedJoinLabel = joinLabel ?? (isSwahili ? 'JIUNGE BURE' : 'JOIN FREE');
  const signInLabel = isSwahili ? 'INGIA' : 'SIGN IN';
  const dashboardLabel = isSwahili ? 'DASHIBODI' : 'DASHBOARD';
  const openMenuLabel = isSwahili ? 'Fungua menyu' : 'Open menu';
  const closeMenuLabel = isSwahili ? 'Funga menyu' : 'Close menu';

  const closeMobileMenu = () => {
    setIsOpen(false);
    setOpenMobileDropdown(null);
  };

  const toggleMobileMenu = () => {
    setIsOpen((current) => {
      const nextOpen = !current;
      if (!nextOpen) {
        setOpenMobileDropdown(null);
      }
      return nextOpen;
    });
  };

  return (
    <header className="sticky top-3 z-50 sm:top-6">
      <div className="relative mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-px w-screen -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(50,224,196,0.28)] to-transparent"
        />
        <div className="rounded-[var(--radius-nav-shell)] border border-[var(--border-color)] bg-[var(--surface-soft)] p-1 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:p-1.5">
          <div className="flex items-center gap-3">
            {showLogo ? (
              <Link href="/" className="flex shrink-0 items-center rounded-[0.85rem] px-1.5 py-1">
                <BrandLogo size="sm" variant="symbol" />
              </Link>
            ) : null}

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 md:flex">
              {resolvedNavItems.map((item) => (
                isDropdownNavItem(item) ? (
                  <div key={item.label} className="group relative">
                    <button
                      type="button"
                      className={`${HEADER_TEXT_CLASS} gap-1.5`}
                      style={DISPLAY_FONT_STYLE}
                      aria-haspopup="menu"
                    >
                      <span>{item.label}</span>
                      <ChevronDown size={15} className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
                    </button>
                    <div className={DROPDOWN_PANEL_CLASS} role="menu" aria-label={item.label}>
                      <div className="grid gap-1">
                        {item.items.map((dropdownItem) => (
                          <Link
                            key={`${item.label}-${dropdownItem.href}`}
                            href={dropdownItem.href}
                            className={DROPDOWN_LINK_CLASS}
                            role="menuitem"
                          >
                            <span className="flex flex-col">
                              <span
                                className="font-[var(--font-display)] text-[0.9rem] font-extrabold uppercase tracking-[0.14em] text-[var(--text-primary)]"
                                style={DISPLAY_FONT_STYLE}
                              >
                                {dropdownItem.label}
                              </span>
                              {dropdownItem.description ? (
                                <span className="mt-1 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">
                                  {dropdownItem.description}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={HEADER_TEXT_CLASS}
                    style={DISPLAY_FONT_STYLE}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <CountryLanguageBar className="hidden lg:flex" />
              <ThemeToggle className="!h-[2.3rem] !min-h-[2.3rem] !w-[2.3rem] !min-w-[2.3rem] !rounded-[0.85rem] !border-[rgba(129,148,178,0.18)] !bg-[rgba(17,27,46,0.88)] !text-[color:rgba(193,203,218,0.96)]" />
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href={user ? '/dashboard' : signInHref}
                  className={SIGN_IN_BUTTON_CLASS}
                  style={DISPLAY_FONT_STYLE}
                >
                  {user ? dashboardLabel : signInLabel}
                </Link>
                {!user ? (
                  <Link href={joinHref} className={JOIN_BUTTON_CLASS} style={DISPLAY_FONT_STYLE}>
                    {resolvedJoinLabel}
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                onClick={toggleMobileMenu}
                className="icon-button h-8 w-8 md:hidden"
                aria-label={isOpen ? closeMenuLabel : openMenuLabel}
                aria-expanded={isOpen}
                aria-controls="home-mobile-nav"
              >
                {isOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>

          {isOpen ? (
            <div id="home-mobile-nav" className="mt-2 grid gap-1 border-t border-[var(--border-color)] pt-2 md:hidden">
              <div className="px-1 pb-1">
                <CountryLanguageBar inline />
              </div>

              {resolvedNavItems.map((item) =>
                isDropdownNavItem(item) ? (
                  <div
                    key={item.label}
                    className="rounded-[0.95rem] border border-[rgba(129,148,178,0.14)] bg-[rgba(17,27,46,0.54)]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMobileDropdown((current) => (current === item.label ? null : item.label))
                      }
                      className={`${HEADER_TEXT_CLASS} flex w-full items-center justify-between gap-2`}
                      style={DISPLAY_FONT_STYLE}
                      aria-expanded={openMobileDropdown === item.label}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        size={15}
                        className={`transition-transform duration-200 ${
                          openMobileDropdown === item.label ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openMobileDropdown === item.label ? (
                      <div className="grid gap-1 px-1 pb-2">
                        {item.items.map((dropdownItem) => (
                          <Link
                            key={`${item.label}-${dropdownItem.href}`}
                            href={dropdownItem.href}
                            onClick={closeMobileMenu}
                            className={DROPDOWN_LINK_CLASS}
                          >
                            <span className="flex flex-col">
                              <span
                                className="font-[var(--font-display)] text-[0.88rem] font-extrabold uppercase tracking-[0.14em] text-[var(--text-primary)]"
                                style={DISPLAY_FONT_STYLE}
                              >
                                {dropdownItem.label}
                              </span>
                              {dropdownItem.description ? (
                                <span className="mt-1 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[var(--text-soft)]">
                                  {dropdownItem.description}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={HEADER_TEXT_CLASS}
                    style={DISPLAY_FONT_STYLE}
                  >
                    {item.label}
                  </Link>
                )
              )}
              <div className="mt-1 grid gap-2 px-1 pb-1 pt-2 sm:flex sm:items-center">
                <Link
                  href={user ? '/dashboard' : signInHref}
                  onClick={closeMobileMenu}
                  className={SIGN_IN_BUTTON_CLASS}
                  style={DISPLAY_FONT_STYLE}
                >
                  {user ? dashboardLabel : signInLabel}
                </Link>
                {!user ? (
                  <Link
                    href={joinHref}
                    onClick={closeMobileMenu}
                    className={JOIN_BUTTON_CLASS}
                    style={DISPLAY_FONT_STYLE}
                  >
                    {resolvedJoinLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <PageBreadcrumbs className="mt-3 px-1 sm:px-2" />
      </div>
    </header>
  );
}
