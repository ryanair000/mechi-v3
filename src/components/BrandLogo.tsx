import Image from 'next/image';

type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg';
type BrandLogoVariant = 'full' | 'reversed' | 'mono' | 'symbol';

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  showTagline?: boolean;
  size?: BrandLogoSize;
  variant?: BrandLogoVariant;
}

const iconSizeClasses: Record<BrandLogoSize, string> = {
  xs: 'h-8 w-8 rounded-xl',
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-10 w-10 rounded-2xl',
  lg: 'h-12 w-12 rounded-[1.15rem]',
};

const labelSizeClasses: Record<BrandLogoSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-[1.7rem]',
};

const taglineSizeClasses: Record<BrandLogoSize, string> = {
  xs: 'text-[9px]',
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-xs',
};

const gapClasses: Record<BrandLogoSize, string> = {
  xs: 'gap-2',
  sm: 'gap-2.5',
  md: 'gap-3',
  lg: 'gap-3.5',
};

const imageSizes: Record<BrandLogoSize, string> = {
  xs: '32px',
  sm: '36px',
  md: '40px',
  lg: '48px',
};

const tileToneClasses: Record<BrandLogoVariant, string> = {
  full: 'border-transparent bg-transparent shadow-none',
  reversed: 'border-transparent bg-transparent shadow-none',
  mono: 'border-transparent bg-transparent shadow-none',
  symbol: 'border-transparent bg-transparent shadow-none',
};

const imageToneClasses: Record<BrandLogoVariant, string> = {
  full: 'object-contain',
  reversed: 'object-contain',
  mono: 'object-contain grayscale contrast-125 brightness-90',
  symbol: 'object-contain',
};

const labelToneClasses: Record<BrandLogoVariant, string> = {
  full: 'text-[var(--text-primary)]',
  reversed: 'text-white',
  mono: 'text-[var(--text-primary)]',
  symbol: 'text-[var(--text-primary)]',
};

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export function BrandLogo({
  className,
  iconClassName,
  labelClassName,
  showIcon,
  showLabel,
  showTagline = false,
  size = 'sm',
  variant = 'full',
}: BrandLogoProps) {
  const shouldShowIcon = showIcon ?? true;
  const shouldShowLabel = showLabel ?? variant !== 'symbol';

  return (
    <span
      className={cn(
        'inline-flex items-center',
        shouldShowIcon && shouldShowLabel ? gapClasses[size] : undefined,
        className
      )}
    >
      {shouldShowIcon ? (
        <span
          style={{
            position: 'relative',
            width: imageSizes[size],
            height: imageSizes[size],
          }}
          className={cn(
            'relative block shrink-0 overflow-hidden border',
            iconSizeClasses[size],
            tileToneClasses[variant],
            iconClassName
          )}
        >
          <Image
            src="/mechi-logo.png"
            alt="Mechi logo"
            fill
            sizes={imageSizes[size]}
            className={imageToneClasses[variant]}
            preload={size === 'lg'}
          />
        </span>
      ) : null}

      {shouldShowLabel ? (
        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              'brand-logo-wordmark leading-none font-extrabold',
              labelSizeClasses[size],
              labelToneClasses[variant],
              labelClassName
            )}
          >
            Mechi
          </span>
          {showTagline ? (
            <span
              className={cn(
                'mt-1 font-semibold uppercase tracking-[0.22em]',
                taglineSizeClasses[size],
                variant === 'reversed' ? 'text-white/65' : 'text-[var(--text-soft)]'
              )}
            >
              Compete. Connect. Rise.
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
