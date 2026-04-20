import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-[background-color,border-color,color,box-shadow] focus:outline-none focus:ring-4 focus:ring-[rgba(50,224,196,0.14)]',
  {
    variants: {
      variant: {
        default:
          'border-[rgba(50,224,196,0.22)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]',
        secondary:
          'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]',
        destructive:
          'border-[rgba(239,68,68,0.18)] bg-[var(--danger-soft)] text-[#d14343]',
        outline: 'border-[var(--border-color)] bg-transparent text-[var(--text-secondary)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
