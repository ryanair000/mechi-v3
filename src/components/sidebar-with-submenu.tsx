'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import {
  type AppNavItem,
  SIDEBAR_PRIMARY_ITEMS,
  SIDEBAR_SECTIONS,
  type SidebarSectionConfig,
  type SidebarSectionKey,
} from '@/lib/app-shell-nav';
import { getPlan } from '@/lib/plans';
import { cn } from '@/lib/utils';

function matchesNavHref(pathname: string, href: string, matchMode: AppNavItem['matchMode']) {
  if (matchMode === 'exact') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(href);
}

function isPathActive(pathname: string, item: AppNavItem) {
  if (matchesNavHref(pathname, item.href, item.matchMode)) {
    return true;
  }

  return item.activeHrefs?.some((href) => matchesNavHref(pathname, href, 'prefix')) ?? false;
}

function hasActiveItem(pathname: string, items: AppNavItem[]) {
  return items.some((item) => isPathActive(pathname, item));
}

function getNavItemClass(isActive: boolean, collapsed: boolean) {
  return cn(
    'flex items-center rounded-md border py-2.5 text-[12px] font-semibold transition-all',
    collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
    isActive
      ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--text-primary)]'
      : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
  );
}

function SidebarSection({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {children}
    </div>
  );
}

function SidebarNavLink({
  collapsed,
  href,
  icon: Icon,
  isActive,
  label,
}: AppNavItem & {
  collapsed: boolean;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={getNavItemClass(isActive, collapsed)}
      aria-label={collapsed ? label : undefined}
      title={label}
    >
      <Icon
        size={16}
        strokeWidth={isActive ? 2 : 1.65}
        className={cn('shrink-0', isActive ? 'text-[var(--accent-secondary-text)]' : undefined)}
      />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </Link>
  );
}

function SidebarAccordionSection({
  active,
  collapsed,
  icon: Icon,
  items,
  onToggle,
  open,
  pathname,
  title,
}: SidebarSectionConfig & {
  active: boolean;
  collapsed: boolean;
  onToggle: () => void;
  open: boolean;
  pathname: string;
}) {
  if (collapsed) {
    return (
      <SidebarSection>
        {items.map((item) => (
          <SidebarNavLink
            key={item.href}
            {...item}
            collapsed
            isActive={isPathActive(pathname, item)}
          />
        ))}
      </SidebarSection>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left transition-all',
          active
            ? 'border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.07)] text-[var(--text-primary)]'
            : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
        )}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`}
      >
        <span className="flex items-center gap-2.5">
          <Icon
            size={15}
            strokeWidth={active ? 2 : 1.75}
            className={active ? 'text-[var(--accent-secondary-text)]' : undefined}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{title}</span>
        </span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 text-[var(--text-soft)] transition-transform', open ? 'rotate-180' : undefined)}
        />
      </button>

      {open ? (
        <div className="space-y-1 pl-3">
          {items.map((item) => (
            <SidebarNavLink
              key={item.href}
              {...item}
              collapsed={false}
              isActive={isPathActive(pathname, item)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface SidebarWithSubmenuProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function SidebarWithSubmenu({ collapsed, onToggle }: SidebarWithSubmenuProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const currentPlan = getPlan(user?.plan ?? 'free');
  const profileActive = pathname === '/profile';
  const settingsActive = pathname === '/profile/settings';
  const [sectionOverrides, setSectionOverrides] = useState<Partial<Record<SidebarSectionKey, boolean>>>({});

  function toggleSection(sectionKey: SidebarSectionKey) {
    setSectionOverrides((current) => {
      const section = SIDEBAR_SECTIONS.find((item) => item.id === sectionKey);
      const isOpenByDefault = section ? hasActiveItem(pathname, section.items) : false;
      const isOpen = current[sectionKey] ?? isOpenByDefault;

      return {
        ...current,
        [sectionKey]: !isOpen,
      };
    });
  }

  return (
    <aside
      className={cn(
        'fixed bottom-0 left-0 top-0 z-40 hidden flex-col border-r border-[var(--border-color)] bg-[var(--surface-strong)] transition-[width] duration-200 lg:flex',
        collapsed ? 'w-20' : 'w-56'
      )}
    >
      <div
        className={cn(
          'flex border-b border-[var(--border-color)] py-3',
          collapsed ? 'flex-col items-center gap-3 px-3' : 'items-center justify-between px-4'
        )}
      >
        <Link href="/dashboard" className="flex items-center" title="Dashboard">
          <BrandLogo size="sm" variant={collapsed ? 'symbol' : 'full'} />
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      <nav className={cn('flex-1 space-y-1.5 overflow-y-auto py-3', collapsed ? 'px-3' : 'px-2')}>
        <SidebarSection>
          {SIDEBAR_PRIMARY_ITEMS.map((item) => {
            return (
              <SidebarNavLink
                key={item.href}
                {...item}
                collapsed={collapsed}
                isActive={isPathActive(pathname, item)}
              />
            );
          })}
        </SidebarSection>

        {SIDEBAR_SECTIONS.map((section) => (
          <SidebarAccordionSection
            key={section.id}
            {...section}
            pathname={pathname}
            collapsed={collapsed}
            active={hasActiveItem(pathname, section.items)}
            open={sectionOverrides[section.id] ?? hasActiveItem(pathname, section.items)}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </nav>

      <div className={cn('space-y-2 border-t border-[var(--border-color)] py-3', collapsed ? 'px-3' : 'px-3')}>
        <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
          <div className="group relative">
            <Link
              href="/profile"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
                profileActive
                  ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
                  : 'border-[var(--border-color)] bg-[var(--surface-elevated)]'
              }`}
              aria-label="Profile"
              title="Profile"
            >
              <User size={14} />
            </Link>
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Profile
            </span>
          </div>
          <div className="group relative">
            <Link
              href="/profile/settings"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
                settingsActive
                  ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
                  : 'border-[var(--border-color)] bg-[var(--surface-elevated)]'
              }`}
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={14} />
            </Link>
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Settings
            </span>
          </div>
          {collapsed ? (
            <button
              onClick={logout}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          ) : null}
        </div>

        {user && !collapsed ? (
          <div className="flex items-center gap-2.5 rounded-md border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5">
            <div className="avatar-shell relative h-[30px] w-[30px] overflow-hidden text-[11px] font-black">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={`${user.username} avatar`}
                  fill
                  sizes="30px"
                  className="object-cover"
                />
              ) : (
                user.username?.[0]?.toUpperCase() ?? '?'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[12px] font-bold text-[var(--text-primary)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {user.username}
              </p>
              <p className="truncate text-[10px] text-[var(--text-soft)]">{currentPlan.name}</p>
            </div>
            <button
              onClick={logout}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-soft)] transition-colors hover:bg-red-500/10 hover:text-red-400"
              aria-label="Sign out"
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
