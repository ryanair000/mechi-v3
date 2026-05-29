'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { ModeratorNavigation } from '@/components/ModeratorNavigation';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import type { ModeratorTournamentKey } from '@/lib/moderator-tournaments';
import type { OnlineTournamentGameKey } from '@/lib/online-tournament';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

type ModeratorShellProfile = {
  role: UserRole;
  username: string;
};

type ModeratorShellTournament = {
  game: OnlineTournamentGameKey;
  key?: ModeratorTournamentKey;
  label: string;
  shortLabel: string;
};

type ModeratorShellClientProps = {
  children: ReactNode;
  profile: ModeratorShellProfile;
  tournament: ModeratorShellTournament;
};

export function ModeratorShellClient({ children, profile, tournament }: ModeratorShellClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleLabel = sidebarCollapsed ? 'Expand moderator sidebar' : 'Collapse moderator sidebar';

  return (
    <div
      className="page-base app-prototype-shell relative min-h-screen"
      data-theme="dark"
      style={{ colorScheme: 'dark' }}
    >
      <div className="app-shell-grid" />

      <aside
        className={cn(
          'hidden border-r border-[var(--border-color)] bg-[rgba(7,12,22,0.88)] transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col',
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'
        )}
      >
        <div className={cn('border-b border-[var(--border-color)] py-4', sidebarCollapsed ? 'px-3' : 'px-4')}>
          <div className={cn('flex gap-2', sidebarCollapsed ? 'flex-col items-center' : 'items-center justify-between')}>
            <Link
              href="/dashboard"
              aria-label="Mechi dashboard"
              className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : undefined)}
            >
              <BrandLogo size="sm" variant={sidebarCollapsed ? 'symbol' : 'reversed'} />
            </Link>
            <button
              type="button"
              aria-label={toggleLabel}
              title={toggleLabel}
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-color)] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-3 py-4">
          <div
            className={cn(
              'mb-3 flex items-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]',
              sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-2'
            )}
          >
            <ShieldCheck size={13} />
            {sidebarCollapsed ? <span className="sr-only">Moderator desk</span> : 'Moderator desk'}
          </div>

          {sidebarCollapsed ? (
            <div
              title={`${profile.username} (${profile.role}) - ${tournament.label}`}
              className="mb-5 flex h-11 w-11 items-center justify-center self-center rounded-md border border-[var(--border-color)] bg-white/[0.03] text-[var(--accent-secondary-text)]"
            >
              <ShieldCheck size={17} />
              <span className="sr-only">
                {profile.username}, {profile.role}, {tournament.label}
              </span>
            </div>
          ) : (
            <div className="mb-5 rounded-[0.55rem] border border-[var(--border-color)] bg-white/[0.03] px-3 py-3">
              <p className="text-sm font-black text-[var(--text-primary)]">{profile.username}</p>
              <p className="mt-1 text-xs font-bold capitalize text-[var(--accent-secondary-text)]">
                {profile.role}
              </p>
              <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                {tournament.label}
              </p>
            </div>
          )}

          <nav aria-label="Moderator sections" className="flex-1">
            <ModeratorNavigation
              assignedGame={tournament.game}
              collapsed={sidebarCollapsed}
              role={profile.role}
              tournamentKey={tournament.key}
              username={profile.username}
            />
          </nav>
        </div>
      </aside>

      <main
        className={cn(
          'relative min-h-screen overflow-x-hidden transition-[padding] duration-200',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        )}
      >
        <header className="app-utility-header sticky top-0 z-20 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <BrandLogo size="sm" />
            <span className="brand-chip-coral px-2.5 py-1">{tournament.shortLabel}</span>
          </div>
          <div className="border-t border-[var(--border-color)] px-4 pb-3 pt-3 sm:px-6">
            <ModeratorNavigation
              assignedGame={tournament.game}
              role={profile.role}
              tournamentKey={tournament.key}
              username={profile.username}
              variant="mobile"
            />
          </div>
        </header>

        <div className="mx-auto w-full max-w-[92rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <PageBreadcrumbs className="pb-4" />
          {children}
        </div>
      </main>
    </div>
  );
}
