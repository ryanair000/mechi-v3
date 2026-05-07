'use client';

import type { ReactNode } from 'react';

interface LiveBadgeProps {
  viewerCount?: number | null;
  children?: ReactNode;
  className?: string;
}

export function LiveBadge({ viewerCount, children, className = '' }: LiveBadgeProps) {
  const viewerLabel =
    typeof viewerCount === 'number' ? `${viewerCount.toLocaleString()} watching` : null;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.14)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ff9a9a] ${className}`.trim()}
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-coral)] opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--brand-coral)]" />
      </span>
      <span>LIVE</span>
      {viewerLabel ? <span className="normal-case tracking-normal text-[#ffd5d5]">{viewerLabel}</span> : null}
      {children}
    </span>
  );
}
