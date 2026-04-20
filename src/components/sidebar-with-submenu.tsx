'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  CirclePlay,
  Coins,
  Gamepad2,
  LayoutDashboard,
  Lightbulb,
  type LucideIcon,
  LogOut,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Share2,
  Swords,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationNavButton } from '@/components/NotificationNavButton';
import { getPlan } from '@/lib/plans';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type SidebarSectionKey = 'compete' | 'games' | 'growth';

type SidebarSectionConfig = {
  icon: LucideIcon;
  id: SidebarSectionKey;
  items: NavItem[];
  title: string;
};

const PRIMARY_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tutorials', label: 'Tutorials', icon: CirclePlay },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const COMPETE_ITEMS: NavItem[] = [
  { href: '/tournaments', label: 'Tournaments', icon: Swords },
  { href: '/lobbies', label: 'Lobbies', icon: Users },
  { href: '/challenges', label: 'Challenges', icon: MessageCircle },
];

const GAME_ITEMS: NavItem[] = [
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/suggest', label: 'Suggest', icon: Lightbulb },
];

const GROWTH_ITEMS: NavItem[] = [
  { href: '/share', label: 'Share', icon: Share2 },
  { href: '/rewards', label: 'Rewards', icon: Coins },
];

const COLLAPSIBLE_SECTIONS: SidebarSectionConfig[] = [
  { id: 'compete', title: 'Compete', icon: Swords, items: COMPETE_ITEMS },
  { id: 'games', title: 'Games', icon: Gamepad2, items: GAME_ITEMS },
  { id: 'growth', title: 'Growth', icon: Share2, items: GROWTH_ITEMS },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
}

function hasActiveItem(pathname: string, items: NavItem[]) {
  return items.some((item) => isPathActive(pathname, item.href));
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
}: NavItem & {
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
        {items.map(({ href, icon, label }) => (
          <SidebarNavLink
            key={href}
            href={href}
            icon={icon}
            label={label}
            collapsed
            isActive={isPathActive(pathname, href)}
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
          {items.map(({ href, icon, label }) => (
            <SidebarNavLink
              key={href}
              href={href}
              icon={icon}
              label={label}
              collapsed={false}
              isActive={isPathActive(pathname, href)}
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
      const section = COLLAPSIBLE_SECTIONS.find((item) => item.id === sectionKey);
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
          {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
            return (
              <SidebarNavLink
                key={href}
                href={href}
                icon={Icon}
                label={label}
                collapsed={collapsed}
                isActive={isPathActive(pathname, href)}
              />
            );
          })}
        </SidebarSection>

        {COLLAPSIBLE_SECTIONS.map((section) => (
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
          <NotificationNavButton className="rounded-md border border-[var(--border-color)] bg-transparent hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]" />
          <Link
            href="/profile"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
              profileActive
                ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
                : 'border-[var(--border-color)]'
            }`}
            aria-label="Profile"
            title="Profile"
          >
            <User size={13} />
          </Link>
          <Link
            href="/profile/settings"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
              settingsActive
                ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
                : 'border-[var(--border-color)]'
            }`}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={13} />
          </Link>
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
