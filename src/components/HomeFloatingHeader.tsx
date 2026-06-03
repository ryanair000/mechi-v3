'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HeaderNotificationButton } from '@/components/HeaderNotificationButton';

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
  { href: '/tournaments', label: 'TOURNAMENTS' },
  { href: '/how-mechi-works', label: 'HOW IT WORKS' },
  { href: '/pricing', label: 'PRICING' },
  { href: '/android-testers', label: 'ANDROID APP' },
  { href: '/support', label: 'SUPPORT' },
];
const SWAHILI_DEFAULT_NAV_ITEMS: HomeFloatingHeaderNavItem[] = [
  { href: '/tournaments', label: 'MASHINDANO' },
  { href: '/how-mechi-works', label: 'JINSI INAVYOFANYA KAZI' },
  { href: '/pricing', label: 'BEI' },
  { href: '/android-testers', label: 'ANDROID APP' },
  { href: '/support', label: 'MSAADA' },
];
const DISPLAY_FONT_STYLE = { fontFamily: 'var(--font-display)' } as const;

const HEADER_TEXT_CLASS =
  'inline-flex min-h-[2.3rem] items-center rounded-[0.85rem] px-3 py-1.5 font-[var(--font-display)] text-[0.88rem] font-extrabold uppercase tracking-[0.16em] text-[var(--text-primary)] transition-colors hover:text-[var(--text-primary)]';
const SIGN_IN_BUTTON_CLASS =
  'inline-flex min-h-[2.3rem] items-center justify-center rounded-[0.85rem] border border-[rgba(50,224,196,0.32)] bg-[rgba(17,27,46,0.88)] px-[1.125rem] py-1.5 font-[var(--font-display)] text-[0.88rem] font-extrabold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)] transition-all hover:border-[rgba(50,224,196,0.46)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)]';
const JOIN_BUTTON_CLASS =
  'btn-primary min-h-[2.3rem] rounded-[0.85rem] px-[1.125rem] shadow-none font-[var(--font-display)] text-[0.88rem] font-extrabold uppercase tracking-[0.16em] text-[#08111d]';
const DROPDOWN_PANEL_CLASS =
  'pointer-events-none invisible absolute left-1/2 top-full z-50 min-w-[15rem] -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100';
const COMPACT_DROPDOWN_PANEL_CLASS =
  'pointer-events-none invisible absolute left-0 top-full z-50 min-w-[11.25rem] pt-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100';
const DROPDOWN_LINK_CLASS =
  'flex rounded-[0.85rem] px-3 py-2.5 text-left transition-colors hover:bg-[rgba(50,224,196,0.1)] focus-visible:bg-[rgba(50,224,196,0.1)] focus-visible:outline-none';
const DROPDOWN_PANEL_INNER_CLASS =
  'rounded-[1rem] border border-[rgba(129,148,178,0.18)] bg-[rgba(11,20,36,0.96)] p-2 shadow-[0_20px_60px_rgba(2,8,23,0.45)] backdrop-blur-xl';

function isDropdownNavItem(item: HomeFloatingHeaderNavItem): item is NavDropdownItem {
  return 'items' in item;
}

interface HomeFloatingHeaderProps {
  navItems?: HomeFloatingHeaderNavItem[];
  signInHref?: string;
  joinHref?: string;
  joinLabel?: string;
  showLogo?: boolean;
  showJoinButton?: boolean;
  showRegionalControls?: boolean;
  compact?: boolean;
}

export function HomeFloatingHeader({
  navItems,
  signInHref = '/login',
  joinHref = '/register',
  joinLabel,
  showLogo = true,
  showJoinButton = false,
  compact = false,
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
  const headerTextClass = compact
    ? 'inline-flex min-h-[1.65rem] items-center rounded-[0.7rem] px-2.5 py-1 font-[var(--font-display)] text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:text-[var(--text-primary)]'
    : HEADER_TEXT_CLASS;
  const signInButtonClass = compact
    ? 'inline-flex min-h-[1.65rem] items-center justify-center rounded-[0.7rem] border border-[rgba(50,224,196,0.32)] bg-[rgba(17,27,46,0.88)] px-3.5 py-1 font-[var(--font-display)] text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)] transition-all hover:border-[rgba(50,224,196,0.46)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)]'
    : SIGN_IN_BUTTON_CLASS;
  const joinButtonClass = compact
    ? 'btn-primary min-h-[1.65rem] rounded-[0.7rem] px-3.5 py-1 shadow-none font-[var(--font-display)] text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-[#08111d]'
    : JOIN_BUTTON_CLASS;
  const logoPaddingClass = compact ? 'rounded-[0.7rem] px-1 py-0.5' : 'rounded-[0.85rem] px-1.5 py-1';
  const shellPaddingClass = compact ? 'p-0.5 sm:p-1' : 'p-1 sm:p-1.5';
  const shellGapClass = compact ? 'gap-2' : 'gap-3';
  const shellContainerWidthClass = compact ? 'max-w-[66rem]' : 'max-w-[88rem]';
  const desktopNavGapClass = compact ? 'gap-1.5' : 'gap-3';
  const desktopNavLayoutClass = compact
    ? 'hidden min-w-0 flex-1 items-center justify-start md:ml-8 md:flex md:max-w-[75%] lg:ml-10'
    : 'hidden min-w-0 flex-1 items-center justify-center md:flex';
  const actionGapClass = compact ? 'gap-1.5' : 'gap-2';
  const actionOffsetClass = compact ? (user ? 'md:mr-5 lg:mr-6' : 'md:mr-7 lg:mr-8') : '';
  const dropdownPanelClass = compact ? COMPACT_DROPDOWN_PANEL_CLASS : DROPDOWN_PANEL_CLASS;
  const themeToggleClass = compact
    ? '!h-[1.8rem] !min-h-[1.8rem] !w-[1.8rem] !min-w-[1.8rem] !rounded-[0.7rem] !border-[rgba(129,148,178,0.18)] !bg-[rgba(17,27,46,0.88)] !text-[color:rgba(193,203,218,0.96)]'
    : '!h-[2.3rem] !min-h-[2.3rem] !w-[2.3rem] !min-w-[2.3rem] !rounded-[0.85rem] !border-[rgba(129,148,178,0.18)] !bg-[rgba(17,27,46,0.88)] !text-[color:rgba(193,203,218,0.96)]';

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
      <div className={`relative mx-auto w-full px-4 sm:px-6 lg:px-8 ${shellContainerWidthClass}`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-px w-screen -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(50,224,196,0.28)] to-transparent"
        />
        <div className={`rounded-[var(--radius-nav-shell)] border border-[var(--border-color)] bg-[var(--surface-soft)] shadow-[var(--shadow-soft)] backdrop-blur-xl ${shellPaddingClass}`}>
          <div className={`flex items-center ${shellGapClass}`}>
            {showLogo ? (
              <Link href="/" className={`flex shrink-0 items-center ${logoPaddingClass}`}>
                <BrandLogo size="sm" variant="symbol" />
              </Link>
            ) : null}

            <div className={`${desktopNavLayoutClass} ${desktopNavGapClass}`}>
              {resolvedNavItems.map((item) => (
                isDropdownNavItem(item) ? (
                  <div key={item.label} className="group relative">
                    <button
                      type="button"
                      className={`${headerTextClass} gap-1.5`}
                      style={DISPLAY_FONT_STYLE}
                      aria-haspopup="menu"
                    >
                      <span>{item.label}</span>
                      <ChevronDown size={15} className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
                    </button>
                    <div className={dropdownPanelClass} role="menu" aria-label={item.label}>
                      <div className={DROPDOWN_PANEL_INNER_CLASS}>
                        <div className="grid gap-1">
                          {item.items.map((dropdownItem) => (
                            <Link
                              key={`${item.label}-${dropdownItem.href}-${dropdownItem.label}`}
                              href={dropdownItem.href}
                              className={DROPDOWN_LINK_CLASS}
                              role="menuitem"
                            >
                              <span className="flex flex-col items-start">
                                <span
                                  className="font-[var(--font-display)] text-[0.9rem] font-bold tracking-[0.01em] text-[var(--text-primary)]"
                                  style={DISPLAY_FONT_STYLE}
                                >
                                  {dropdownItem.label}
                                </span>
                                {dropdownItem.description ? (
                                  <span className="mt-1 text-[0.72rem] font-medium tracking-[0.02em] text-[var(--text-soft)]">
                                    {dropdownItem.description}
                                  </span>
                                ) : null}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={headerTextClass}
                    style={DISPLAY_FONT_STYLE}
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>

            <div className={`ml-auto flex items-center ${actionGapClass} ${actionOffsetClass}`}>
              {user ? <HeaderNotificationButton compact={compact} /> : null}
              <ThemeToggle className={themeToggleClass} />
              <div className={`hidden items-center sm:flex ${actionGapClass}`}>
                <Link
                  href={user ? '/dashboard' : signInHref}
                  className={signInButtonClass}
                  style={DISPLAY_FONT_STYLE}
                >
                  {user ? dashboardLabel : signInLabel}
                </Link>
                {!user && showJoinButton ? (
                  <Link href={joinHref} className={joinButtonClass} style={DISPLAY_FONT_STYLE}>
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
                      className={`${headerTextClass} flex w-full items-center justify-between gap-2`}
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
                            key={`${item.label}-${dropdownItem.href}-${dropdownItem.label}`}
                            href={dropdownItem.href}
                            onClick={closeMobileMenu}
                            className={DROPDOWN_LINK_CLASS}
                          >
                            <span className="flex flex-col items-start">
                              <span
                                className="font-[var(--font-display)] text-[0.88rem] font-bold tracking-[0.01em] text-[var(--text-primary)]"
                                style={DISPLAY_FONT_STYLE}
                              >
                                {dropdownItem.label}
                              </span>
                              {dropdownItem.description ? (
                                <span className="mt-1 text-[0.72rem] font-medium tracking-[0.02em] text-[var(--text-soft)]">
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
                    className={headerTextClass}
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
                  className={signInButtonClass}
                  style={DISPLAY_FONT_STYLE}
                >
                  {user ? dashboardLabel : signInLabel}
                </Link>
                {!user && showJoinButton ? (
                  <Link
                    href={joinHref}
                    onClick={closeMobileMenu}
                    className={joinButtonClass}
                    style={DISPLAY_FONT_STYLE}
                  >
                    {resolvedJoinLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <PageBreadcrumbs className="mt-2 px-1 sm:px-2" />
      </div>
    </header>
  );
}
