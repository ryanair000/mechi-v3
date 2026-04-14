import { PLATFORMS } from '@/lib/config';
import type { PlatformKey } from '@/types';

interface PlatformBadgeProps {
  platform: PlatformKey;
  platformId?: string;
  size?: 'sm' | 'md';
}

export function PlatformBadge({ platform, platformId, size = 'md' }: PlatformBadgeProps) {
  const config = PLATFORMS[platform];
  if (!config) return null;

  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
        <span>{config.icon}</span>
        <span>{config.label}</span>
        {platformId && <span className="text-[var(--text-soft)]">/</span>}
        {platformId && <span className="font-semibold text-[var(--text-primary)]">{platformId}</span>}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
      <span className="text-lg">{config.icon}</span>
      <div className="min-w-0 flex flex-col">
        <span className="text-xs text-[var(--text-soft)]">{config.label}</span>
        {platformId ? (
          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{platformId}</span>
        ) : (
          <span className="text-sm italic text-[var(--text-soft)]">Not set</span>
        )}
      </div>
    </div>
  );
}
