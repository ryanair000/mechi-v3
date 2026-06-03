'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { NotificationNavButton } from '@/components/NotificationNavButton';
import { colors, spacing, typography } from '@/lib/design-tokens';

interface DashboardTopbarProps {
  onMenuClick: () => void;
}

function titleFromPathname(pathname: string) {
  const segment = pathname.split('/').filter(Boolean).at(-1);

  if (!segment || segment === 'dashboard') {
    return 'Dashboard';
  }

  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function DashboardTopbar({ onMenuClick }: DashboardTopbarProps) {
  const pathname = usePathname();
  const title = useMemo(() => titleFromPathname(pathname), [pathname]);

  return (
    <header
      style={{
        alignItems: 'center',
        backgroundColor: colors.surface.base,
        borderBottom: `1px solid ${colors.border.default}`,
        display: 'flex',
        gap: spacing[3],
        minHeight: '64px',
        padding: `${spacing[3]} ${spacing[5]}`,
      }}
    >
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Toggle dashboard navigation"
        title="Toggle dashboard navigation"
        style={{
          alignItems: 'center',
          backgroundColor: colors.surface.elevated,
          border: `1px solid ${colors.border.default}`,
          borderRadius: '8px',
          color: colors.text.primary,
          cursor: 'pointer',
          display: 'inline-flex',
          height: '36px',
          justifyContent: 'center',
          width: '36px',
        }}
      >
        <Menu size={18} />
      </button>

      <div style={{ minWidth: 0 }}>
        <p
          style={{
            color: colors.text.muted,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.bold,
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          PlayMechi
        </p>
        <h1
          style={{
            color: colors.text.primary,
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h1>
      </div>

      <div style={{ marginLeft: 'auto' }}>
        <NotificationNavButton />
      </div>
    </header>
  );
}
