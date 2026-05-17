import type { ComponentProps } from 'react';
import Image from 'next/image';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { cn } from '@/lib/utils';

type Logo = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

type LogoCloudProps = ComponentProps<'div'> & {
  logos: Logo[];
};

const LOGOS: Logo[] = [
  {
    src: '/game-logos/pubgm.svg',
    alt: 'PUBG Mobile Logo',
    className: 'brightness-0 invert opacity-70',
    width: 176,
  },
  {
    src: '/game-logos/codm.svg',
    alt: 'Call of Duty Mobile Logo',
    className: 'brightness-0 invert opacity-70',
    width: 252,
  },
  {
    src: '/game-logos/efootball.svg',
    alt: 'eFootball Logo',
    className: 'brightness-0 invert opacity-70',
    width: 110,
  },
  {
    src: '/game-logos/freefire-white.png',
    alt: 'Free Fire Logo',
    className: 'opacity-70',
    width: 208,
  },
  {
    src: '/game-logos/fc26-real.png',
    alt: 'FC 26 Logo',
    className: 'opacity-80',
    width: 214,
  },
  {
    src: '/game-logos/mk11-real.png',
    alt: 'Mortal Kombat 11 Logo',
    className: 'opacity-80',
    width: 220,
  },
  {
    src: '/game-logos/ufc5-real.png',
    alt: 'UFC 5 Logo',
    className: 'opacity-80',
    width: 206,
  },
  {
    src: '/game-logos/tekken8-real.png',
    alt: 'Tekken 8 Logo',
    className: 'opacity-80',
    width: 226,
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
          <Image
            alt={logo.alt}
            className={cn(
              'pointer-events-none h-12 shrink-0 select-none object-contain md:h-14',
              logo.className
            )}
            height={logo.height ?? 56}
            key={`logo-${logo.alt}`}
            src={logo.src}
            unoptimized
            width={logo.width ?? 180}
          />
        ))}
      </InfiniteSlider>
    </div>
  );
}

export function LogoCloud3Section({ className, ...props }: ComponentProps<'section'>) {
  const { locale } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';

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
        <span className="text-[var(--text-secondary)]">
          {isSwahili ? 'Michezo Inayotrend.' : 'Trending Games.'}
        </span>
        <br />
        <span className="font-semibold">{isSwahili ? 'Shindana Sasa.' : 'Compete Now.'}</span>
      </h2>

      <div className="mx-auto my-5 h-px max-w-sm bg-[var(--border-color)] [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />

      <LogoCloud logos={LOGOS} />

      <div className="mt-5 h-px bg-[var(--border-color)] [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
    </section>
  );
}
