'use client';

import Link from 'next/link';
import { CalendarClock, Radio, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TournamentMemberListItem {
  actionHref: string;
  actionLabel: string;
  actionVariant?: 'primary' | 'muted';
  anchorId?: string;
  detailHref: string;
  gameLabel: string;
  id: string;
  liveHref?: string | null;
  liveLabel?: string | null;
  metaLabel: string;
  prizeLabel: string;
  progress: number;
  registeredLabel?: string | null;
  slotsLabel: string;
  startsLabel: string;
  statusClassName?: string;
  statusLabel: string;
  tagLabel?: string | null;
  title: string;
}

interface TournamentMemberListProps {
  className?: string;
  emptyLabel?: string;
  items: TournamentMemberListItem[];
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'M';
}

function TournamentLine({ item }: { item: TournamentMemberListItem }) {
  const actionIsMuted = item.actionVariant === 'muted';

  return (
    <div
      id={item.anchorId}
      className="grid gap-3 border-b border-[var(--border-color)] px-3 py-4 text-sm transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)] sm:px-5 md:grid-cols-[minmax(0,1.35fr)_118px_150px_120px_104px] md:items-center md:gap-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] text-xs font-black text-[var(--text-primary)]">
          {getInitial(item.gameLabel)}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-[var(--brand-teal)]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={item.detailHref}
              className="min-w-0 truncate font-black text-[var(--text-primary)] transition-colors hover:text-[var(--accent-secondary-text)]"
            >
              {item.title}
            </Link>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]',
                item.statusClassName
              )}
            >
              {item.statusLabel}
            </span>
            {item.tagLabel ? <span className="brand-chip-coral px-2 py-0.5">{item.tagLabel}</span> : null}
            {item.liveHref && item.liveLabel ? (
              <Link
                href={item.liveHref}
                className="inline-flex items-center gap-1 rounded-md border border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#93c5fd]"
              >
                <Radio size={12} />
                {item.liveLabel}
              </Link>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="brand-chip px-2 py-0.5">{item.gameLabel}</span>
            <span className="text-[11px] text-[var(--text-soft)]">{item.metaLabel}</span>
            {item.registeredLabel ? (
              <span className="rounded-md border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] px-2 py-0.5 text-[10px] font-black text-[var(--accent-secondary-text)]">
                {item.registeredLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:contents">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-soft)] md:hidden">
            <Users size={13} />
            Slots
          </div>
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-color)] md:w-16">
            <div className="h-full bg-[var(--brand-teal)]" style={{ width: `${item.progress}%` }} />
          </div>
          <span className="text-xs text-[var(--text-soft)]">{item.slotsLabel}</span>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-soft)] md:hidden">
            <CalendarClock size={13} />
            Starts
          </div>
          <span className="block text-xs font-semibold text-[var(--text-secondary)] md:text-sm md:font-normal">
            {item.startsLabel}
          </span>
        </div>

        <div className="text-right md:text-left">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-soft)] md:hidden">
            Prize
          </div>
          <span className="block text-xs font-black text-[var(--brand-teal)] md:text-right md:text-sm">
            {item.prizeLabel}
          </span>
        </div>
      </div>

      <div className="md:text-right">
        <Link
          href={item.actionHref}
          className={cn(
            'inline-flex min-h-9 w-full items-center justify-center rounded-md border px-3 py-2 text-xs font-black transition-colors md:w-auto',
            actionIsMuted
              ? 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              : 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)] hover:bg-[rgba(50,224,196,0.16)]'
          )}
        >
          {item.actionLabel}
        </Link>
      </div>
    </div>
  );
}

export function TournamentMemberList({
  className,
  emptyLabel = 'No tournaments yet',
  items,
}: TournamentMemberListProps) {
  return (
    <div
      data-slot="tournament-member-list"
      className={cn(
        'w-full overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]',
        className
      )}
    >
      <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1.35fr)_118px_150px_120px_104px] items-center gap-4 border-b border-[var(--border-color)] bg-[var(--surface-strong)] px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)] md:grid">
        <div>Tournament</div>
        <div>Slots</div>
        <div>Starts</div>
        <div className="text-right">Prize</div>
        <div className="text-right">Action</div>
      </div>

      {items.length > 0 ? (
        <div>
          {items.map((item) => (
            <TournamentLine key={item.id} item={item} />
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

export default TournamentMemberList;
