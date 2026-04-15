import { PlatformLogo } from '@/components/PlatformLogo';
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
      <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <PlatformLogo platform={platform} size={12} />
        <span>{config.label}</span>
        {platformId ? <span className="text-gray-400">|</span> : null}
        {platformId ? <span className="font-semibold text-gray-900 dark:text-white">{platformId}</span> : null}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
      <PlatformLogo platform={platform} size={18} />
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-gray-500 dark:text-gray-400">{config.label}</span>
        {platformId ? (
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{platformId}</span>
        ) : (
          <span className="text-sm italic text-gray-400">Not set</span>
        )}
      </div>
    </div>
  );
}