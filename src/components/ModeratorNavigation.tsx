'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MonitorPlay,
  ShieldCheck,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { getModeratorLoginPath } from '@/lib/navigation';
import type { ModeratorTournamentKey } from '@/lib/moderator-tournaments';
import { ONLINE_TOURNAMENT_GAME_BY_KEY, type OnlineTournamentGameKey } from '@/lib/online-tournament';
import { WEEKEND_CUP_GAME_BY_KEY } from '@/lib/weekend-cup';

type ModeratorNavRole = 'admin' | 'moderator' | string;

type ModeratorNavItem = {
  adminOnly?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
};

function getModeratorNavItems(
  assignedGame: OnlineTournamentGameKey,
  tournamentKey?: ModeratorTournamentKey,
  username?: string
): ModeratorNavItem[] {
  if (tournamentKey === 'weka_mawe_efootball') {
    return [
      {
        href: '/moderators/weka-mawe',
        label: 'Weka Mawe Desk',
        icon: ShieldCheck,
      },
      { href: '/dashboard', label: 'Back to App', icon: LayoutDashboard },
    ];
  }

  if (tournamentKey === 'days_esports_tz_efootball') {
    return [
      {
        href: '/moderators/tz',
        label: 'TZ Payments',
        icon: CreditCard,
      },
      { href: '/dashboard', label: 'Back to App', icon: LayoutDashboard },
    ];
  }

  const isWeekendCup = tournamentKey?.startsWith('weekendcup_');
  const canSeeAllWeekendCupGames = username?.toLowerCase() === 'ranxxs';
  const game = ONLINE_TOURNAMENT_GAME_BY_KEY[assignedGame] ?? WEEKEND_CUP_GAME_BY_KEY[assignedGame];
  const weekendCupGame = WEEKEND_CUP_GAME_BY_KEY[assignedGame];
  const gameParam = encodeURIComponent(assignedGame);

  if (isWeekendCup) {
    const items: ModeratorNavItem[] = [
      {
        href: '/moderators/weekendcup',
        label: 'Weekend Cup Desk',
        icon: Trophy,
      },
    ];

    if (canSeeAllWeekendCupGames) {
      for (const gameKey of ['pubgm', 'codm', 'freefire'] as const) {
        const gameConfig = WEEKEND_CUP_GAME_BY_KEY[gameKey];
        const encodedGame = encodeURIComponent(gameKey);
        items.push(
          {
            href: `/moderators/weekendcup/lobbies?game=${encodedGame}`,
            label: `${gameConfig.shortLabel} Lobbies`,
            icon: MonitorPlay,
          },
          {
            href: `/moderators/weekendcup/scores?game=${encodedGame}`,
            label: `${gameConfig.shortLabel} Scores`,
            icon: ClipboardCheck,
          }
        );
      }

      items.push({
        href: '/moderators/weekendcup/bracket',
        label: 'eFootball Bracket',
        icon: Trophy,
      });
    } else if (assignedGame === 'efootball') {
      items.push({
        href: '/moderators/weekendcup/bracket',
        label: 'eFootball Bracket',
        icon: Trophy,
      });
    } else {
      items.push(
        {
          href: `/moderators/weekendcup/lobbies?game=${gameParam}`,
          label: `${weekendCupGame.shortLabel} Lobbies`,
          icon: MonitorPlay,
        },
        {
          href: `/moderators/weekendcup/scores?game=${gameParam}`,
          label: `${weekendCupGame.shortLabel} Scores`,
          icon: ClipboardCheck,
        }
      );
    }

    items.push({ href: '/dashboard', label: 'Back to App', icon: LayoutDashboard });
    return items;
  }

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
    {
      href: '/moderators/weekendcup',
      label: 'Weekend Cup',
      icon: Trophy,
    },
    {
      href: '/moderators/tz',
      label: 'TZ Payments',
      icon: CreditCard,
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
  tournamentKey,
  username,
  variant = 'desktop',
}: {
  assignedGame?: OnlineTournamentGameKey;
  collapsed?: boolean;
  role: ModeratorNavRole;
  tournamentKey?: ModeratorTournamentKey;
  username?: string;
  variant?: 'desktop' | 'mobile';
}) {
  const pathname = usePathname();
  const navItems = getModeratorNavItems(assignedGame, tournamentKey, username);
  const items = navItems.filter((item) => !item.adminOnly || role === 'admin');

  if (variant === 'mobile') {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-10 min-w-0 items-center gap-2 rounded-md border px-3 text-xs font-bold ${
                active
                  ? 'border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.12)] text-[var(--text-primary)]'
                  : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)]'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="min-w-0 break-words">{label}</span>
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
