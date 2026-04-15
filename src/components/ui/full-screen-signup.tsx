'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

interface FullScreenSignupProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  sideTitle: string;
  sideDescription: string;
  sidePoints?: string[];
}

export function FullScreenSignup({
  children,
  title,
  subtitle,
  sideTitle,
  sideDescription,
  sidePoints = [],
}: FullScreenSignupProps) {
  return (
    <div className="page-base">
      <nav className="landing-shell flex h-14 items-center justify-between sm:h-16">
        <Link href="/" className="flex min-h-11 items-center">
          <BrandLogo size="sm" />
        </Link>
        <ThemeToggle />
      </nav>

      <div className="landing-shell pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 sm:pb-10 sm:pt-3">
        <div className="relative overflow-hidden rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-soft)] sm:rounded-[1.6rem] sm:shadow-[var(--shadow-strong)] sm:backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_18%_0%,rgba(255,107,107,0.14),transparent_34%),radial-gradient(circle_at_90%_90%,rgba(50,224,196,0.14),transparent_36%)] sm:block" />
          <div className="pointer-events-none absolute inset-y-0 left-[48%] hidden w-px bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.18),transparent)] lg:block" />

          <div className="relative grid lg:min-h-[calc(100svh-9rem)] lg:grid-cols-[1fr_1.08fr]">
            <aside className="relative hidden overflow-hidden bg-[var(--brand-night)] p-8 text-white lg:flex lg:flex-col lg:justify-between">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.04),transparent_42%)]" />
              <div className="pointer-events-none absolute -bottom-20 -left-8 h-56 w-56 rounded-full bg-[rgba(255,107,107,0.22)] blur-[56px]" />
              <div className="pointer-events-none absolute -right-14 top-14 h-52 w-52 rounded-full bg-[rgba(50,224,196,0.2)] blur-[62px]" />

              <div className="relative">
                <BrandLogo size="md" variant="reversed" showTagline />
                <h1 className="mt-8 max-w-md text-[2rem] font-black leading-tight tracking-normal">
                  {sideTitle}
                </h1>
                {sideDescription ? (
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/72">{sideDescription}</p>
                ) : null}
              </div>

              {sidePoints.length ? (
                <div className="relative mt-8 grid gap-2.5">
                  {sidePoints.map((point) => (
                    <div
                      key={point}
                      className="rounded-xl border border-white/12 bg-white/8 px-3.5 py-3 text-sm font-semibold text-white/90 backdrop-blur-sm"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              ) : null}
            </aside>

            <section
              className={cn(
                'relative flex flex-col justify-start px-3 py-4 sm:px-8 sm:py-8 lg:justify-center',
                'bg-[var(--surface-elevated)]'
              )}
            >
              <div className="mx-auto w-full max-w-xl">
                {title || subtitle ? (
                  <div className="mb-6">
                    {title ? (
                      <h2 className="text-[1.75rem] font-black leading-tight text-[var(--text-primary)] sm:text-[2rem]">
                        {title}
                      </h2>
                    ) : null}
                    {subtitle ? (
                      <p
                        className={cn(
                          'text-sm text-[var(--text-secondary)]',
                          title ? 'mt-1' : ''
                        )}
                      >
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {children}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
