import { getPlan } from '@/lib/plans';
import type { Plan } from '@/types';

interface PlanBadgeProps {
  plan: Plan;
  size?: 'sm' | 'md';
}

export function PlanBadge({ plan, size = 'sm' }: PlanBadgeProps) {
  const config = getPlan(plan);
  if (!config.badge) return null;

  const sizeClass = size === 'md' ? 'px-3 py-1 text-[11px]' : 'px-2.5 py-0.5 text-[10px]';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-[0.14em] ${sizeClass}`}
      style={{
        background: `${config.badgeColor ?? '#ffffff'}1c`,
        border: `1px solid ${(config.badgeColor ?? '#ffffff')}33`,
        color: config.badgeColor ?? 'var(--text-primary)',
      }}
    >
      {config.badge}
    </span>
  );
}
