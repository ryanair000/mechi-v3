'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  MonitorPlay,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { getModeratorLoginPath } from '@/lib/navigation';
import { ONLINE_TOURNAMENT_GAME_BY_KEY, type OnlineTournamentGameKey } from '@/lib/online-tournament';

type ModeratorNavRole = 'admin' | 'moderator' | string;

type ModeratorNavItem = {
  adminOnly?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
};

function getModeratorNavItems(assignedGame: OnlineTournamentGameKey): ModeratorNavItem[] {
  const game = ONLINE_TOURNAMENT_GAME_BY_KEY[assignedGame];
  const gameParam = encodeURIComponent(assignedGame);

  return [
    {
      href: `/moderators?game=${gameParam}`,
      label: `${game.shortLabel} Desk`,
      icon: ShieldCheck,
    },
    {
      href: `/moderators/check-in?game=${gameParam}`,
      label: `${game.shortLabel} Check-in`,
      icon: ClipboardCheck,
    },
    {
      href: `/moderators/tournament?game=${gameParam}`,
      label: `${game.shortLabel} Tournament`,
      icon: MonitorPlay,
    },
    { href: '/dashboard', label: 'Back to App', icon: LayoutDashboard },
  ];
}

function isActive(pathname: string, href: string) {
  const path = href.split('?')[0] ?? href;
  return pathname === path || (path !== '/moderators' && pathname.startsWith(path));
}

export function ModeratorNavigation({
  assignedGame = 'codm',
  collapsed = false,
  role,
  variant = 'desktop',
}: {
  assignedGame?: OnlineTournamentGameKey;
  collapsed?: boolean;
  role: ModeratorNavRole;
  variant?: 'desktop' | 'mobile';
}) {
  const pathname = usePathname();
  const navItems = getModeratorNavItems(assignedGame);
  const items = navItems.filter((item) => !item.adminOnly || role === 'admin');

  if (variant === 'mobile') {
    return (
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-xs font-bold whitespace-nowrap ${
                active
                  ? 'border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.12)] text-[var(--text-primary)]'
                  : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)]'
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? label : undefined}
            title={collapsed ? label : undefined}
            className={`group flex items-center rounded-md border py-2.5 text-sm font-bold transition-colors ${
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            } ${
              active
                ? 'border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.1)] text-[var(--text-primary)]'
                : 'border-transparent text-white/68 hover:border-[var(--border-color)] hover:bg-white/[0.03] hover:text-white'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                active
                  ? 'border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                  : 'border-[var(--border-color)] bg-white/[0.03] text-white/55 group-hover:text-white'
              }`}
            >
              <Icon size={15} />
            </span>
            {collapsed ? <span className="sr-only">{label}</span> : <span className="flex-1">{label}</span>}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => {
          fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
            window.location.href = getModeratorLoginPath('/moderators');
          });
        }}
        aria-label={collapsed ? 'Sign out' : undefined}
        title={collapsed ? 'Sign out' : undefined}
        className={`group flex w-full items-center rounded-md border border-transparent py-2.5 text-left text-sm font-bold text-white/55 transition-colors hover:border-[var(--border-color)] hover:bg-white/[0.03] hover:text-white ${
          collapsed ? 'justify-center px-0' : 'gap-3 px-3'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-color)] bg-white/[0.03] text-white/55 group-hover:text-white">
          <LogOut size={15} />
        </span>
        {collapsed ? <span className="sr-only">Sign out</span> : <span className="flex-1">Sign out</span>}
      </button>
    </div>
  );
}
