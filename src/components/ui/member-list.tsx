'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ContactRound, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MemberListItem {
  avatarUrl?: string | null;
  href?: string;
  id: string;
  latestDate?: string | null;
  latestLabel?: string | null;
  matchWins: number;
  name: string;
  points: number;
  rank: number;
  subtitle?: string | null;
  tournamentWins: number;
  tournamentsPlayed: number;
}

interface MemberListProps {
  className?: string;
  emptyLabel?: string;
  items: MemberListItem[];
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'M';
}

function formatLatestDate(value?: string | null) {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No date';
  }

  return format(date, 'MMM d, yyyy');
}

function MemberLine({ item }: { item: MemberListItem }) {
  const content = (
    <div className="flex w-full items-center gap-3 border-b border-[var(--border-color)] px-3 py-3 text-sm transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)] sm:px-5">
      <div className="w-10 shrink-0 text-xs font-black text-[var(--text-soft)]">
        #{item.rank}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] text-xs font-black text-[var(--text-primary)]">
          {item.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            getInitial(item.name)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-[var(--text-primary)]">{item.name}</p>
          <p className="truncate text-xs text-[var(--text-soft)]">
            {item.subtitle ?? 'Tournament competitor'}
          </p>
        </div>
      </div>

      <div className="hidden w-28 shrink-0 text-right text-xs text-[var(--text-secondary)] sm:block">
        <span className="font-black text-[var(--text-primary)]">{item.points}</span> pts
      </div>
      <div className="hidden w-28 shrink-0 text-right text-xs text-[var(--text-secondary)] md:block">
        {item.tournamentWins} wins
      </div>
      <div className="hidden w-32 shrink-0 text-right text-xs text-[var(--text-secondary)] lg:block">
        {item.tournamentsPlayed} tournaments
      </div>
      <div className="hidden w-44 shrink-0 text-xs text-[var(--text-secondary)] xl:block">
        <div className="flex items-center justify-end gap-1.5">
          <ContactRound size={14} className="text-[var(--text-soft)]" />
          <span className="truncate">{item.latestLabel ?? 'Latest tournament'}</span>
        </div>
        <p className="mt-0.5 text-right text-[11px] text-[var(--text-soft)]">
          {formatLatestDate(item.latestDate)}
        </p>
      </div>

      <div className="sm:hidden">
        <p className="text-right text-xs font-black text-[var(--text-primary)]">{item.points}</p>
        <p className="text-right text-[10px] text-[var(--text-soft)]">pts</p>
      </div>
    </div>
  );

  if (!item.href) {
    return content;
  }

  return (
    <Link href={item.href} className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(50,224,196,0.14)]">
      {content}
    </Link>
  );
}

export function MemberList({ className, emptyLabel = 'No members yet', items }: MemberListProps) {
  return (
    <div
      data-slot="member-list"
      className={cn(
        'w-full overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]',
        className
      )}
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)] sm:px-5">
        <div className="w-10 shrink-0">Rank</div>
        <div className="min-w-0 flex-1">Player</div>
        <div className="hidden w-28 shrink-0 text-right sm:block">Points</div>
        <div className="hidden w-28 shrink-0 text-right md:block">Wins</div>
        <div className="hidden w-32 shrink-0 text-right lg:block">Played</div>
        <div className="hidden w-44 shrink-0 text-right xl:block">Latest</div>
      </div>

      {items.length > 0 ? (
        <div>
          {items.map((item) => (
            <MemberLine key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <Trophy size={30} className="mx-auto text-[var(--text-soft)] opacity-40" />
          <p className="mt-3 text-sm font-semibold text-[var(--text-secondary)]">{emptyLabel}</p>
        </div>
      )}
    </div>
  );
}

export default MemberList;
