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
    src: 'https://svgl.app/library/nvidia-wordmark-light.svg',
    alt: 'Nvidia Logo',
  },
  {
    src: 'https://svgl.app/library/supabase_wordmark_light.svg',
    alt: 'Supabase Logo',
  },
  {
    src: 'https://svgl.app/library/openai_wordmark_light.svg',
    alt: 'OpenAI Logo',
  },
  {
    src: 'https://svgl.app/library/turso-wordmark-light.svg',
    alt: 'Turso Logo',
  },
  {
    src: 'https://svgl.app/library/vercel_wordmark.svg',
    alt: 'Vercel Logo',
  },
  {
    src: 'https://svgl.app/library/github_wordmark_light.svg',
    alt: 'GitHub Logo',
  },
  {
    src: 'https://svgl.app/library/claude-ai-wordmark-icon_light.svg',
    alt: 'Claude AI Logo',
  },
  {
    src: 'https://svgl.app/library/clerk-wordmark-light.svg',
    alt: 'Clerk Logo',
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
            className="pointer-events-none h-4 select-none md:h-5 dark:brightness-0 dark:invert"
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
        <span className="text-[var(--text-secondary)]">Trusted by experts.</span>
        <br />
        <span className="font-semibold">Used by the leaders.</span>
      </h2>

      <div className="mx-auto my-5 h-px max-w-sm bg-[var(--border-color)] [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />

      <LogoCloud logos={LOGOS} />

      <div className="mt-5 h-px bg-[var(--border-color)] [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
    </section>
  );
}
