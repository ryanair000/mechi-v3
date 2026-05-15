import type { ComponentProps } from 'react';
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
    src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/PUBG_Mobile_simple_logo_black.svg',
    alt: 'PUBG Mobile Logo',
    className: 'brightness-0 invert',
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Call_of_Duty_Mobile_2023_logo.svg',
    alt: 'Call of Duty Mobile Logo',
    className: 'brightness-0 invert',
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/EFootball_logo.svg',
    alt: 'eFootball Logo',
    className: 'brightness-0 invert',
  },
  {
    src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Freefirelogo.png',
    alt: 'Free Fire Logo',
  },
  {
    src: 'https://fifauteam.com/images/fc26/logo/long-white.png',
    alt: 'FC 26 Logo',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Mortal-kombat-11-logo.png',
    alt: 'Mortal Kombat 11 Logo',
  },
  {
    src: 'https://drop-assets.ea.com/images/7Dx4nROmD8Iy61CuHhUdbo/99a1ebf0a07247e13debb95efa0002a4/ufc5-logo-reveal-white-1.png',
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
            className={cn(
              'pointer-events-none h-12 w-auto select-none object-contain md:h-14',
              logo.className
            )}
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
