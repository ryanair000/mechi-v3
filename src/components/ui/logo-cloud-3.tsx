import type { ComponentProps } from 'react';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { cn } from '@/lib/utils';

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

type LogoCloudProps = ComponentProps<'div'> & {
  logos: Logo[];
};

const LOGOS: Logo[] = [
  {
    src: '/game-artwork/pubgm-header.svg',
    alt: 'PUBG Mobile Logo',
  },
  {
    src: '/game-artwork/codm-header.svg',
    alt: 'Call of Duty Mobile Logo',
  },
  {
    src: '/game-artwork/efootball-header.svg',
    alt: 'eFootball Logo',
  },
  {
    src: '/game-artwork/freefire-header.svg',
    alt: 'Free Fire Logo',
  },
  {
    src: '/game-artwork/fc26-header.svg',
    alt: 'FC 26 Logo',
  },
  {
    src: '/game-artwork/mk11-header.svg',
    alt: 'Mortal Kombat 11 Logo',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/9/92/UFC_Logo.svg',
    alt: 'UFC 5 Logo',
  },
];

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
  return (
    <div
      {...props}
      className={cn(
        'overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]',
        className
      )}
    >
      <InfiniteSlider gap={42} reverse speed={80} speedOnHover={25}>
        {logos.map((logo) => (
          <img
            alt={logo.alt}
            className="pointer-events-none h-12 w-auto select-none rounded-[var(--radius-control)] border border-white/10 object-contain md:h-14"
            height={logo.height || 'auto'}
            key={`logo-${logo.alt}`}
            loading="lazy"
            src={logo.src}
            width={logo.width || 'auto'}
          />
        ))}
      </InfiniteSlider>
    </div>
  );
}

export function LogoCloud3Section({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      {...props}
      className={cn('relative mx-auto w-full max-w-3xl px-4 py-10 sm:py-12', className)}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-1/2 top-0 -z-10 h-[120vmin] w-[120vmin] -translate-x-1/2 rounded-b-full',
          'bg-[radial-gradient(ellipse_at_center,rgba(50,224,196,0.14),transparent_55%)]',
          'blur-[30px]'
        )}
      />

      <h2 className="mb-5 text-center text-xl font-medium tracking-tight text-[var(--text-primary)] md:text-3xl">
        <span className="text-[var(--text-secondary)]">Trending Games.</span>
        <br />
        <span className="font-semibold">Compete Now.</span>
      </h2>

      <div className="mx-auto my-5 h-px max-w-sm bg-[var(--border-color)] [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />

      <LogoCloud logos={LOGOS} />

      <div className="mt-5 h-px bg-[var(--border-color)] [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
    </section>
  );
}
