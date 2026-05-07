import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-semibold transition-[background-color,border-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(50,224,196,0.14)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[0.42]',
  {
    variants: {
      variant: {
        default: 'btn-primary',
        destructive: 'btn-danger',
        outline: 'btn-outline',
        secondary:
          'border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] text-[var(--text-primary)] shadow-[var(--shadow-soft)] hover:border-[rgba(50,224,196,0.22)] hover:bg-[var(--accent-secondary-soft)]',
        ghost: 'btn-ghost',
        link:
          'rounded-none text-[var(--accent-secondary-text)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline',
      },
      size: {
        default: 'min-h-11 px-4 py-2 text-base',
        sm: 'min-h-10 px-3.5 py-2 text-sm',
        lg: 'min-h-12 px-5 py-3 text-base',
        icon: 'h-11 w-11 p-0 text-base',
      },
    },
    compoundVariants: [
      { variant: 'link', size: 'default', className: 'min-h-0 px-0 py-0' },
      { variant: 'link', size: 'sm', className: 'min-h-0 px-0 py-0' },
      { variant: 'link', size: 'lg', className: 'min-h-0 px-0 py-0' },
      { variant: 'link', size: 'icon', className: 'h-auto w-auto p-0' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
