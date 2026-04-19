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
  const mainTitle = title || sideTitle;
  const mainSubtitle = subtitle || sideDescription;
  const showSideHeading = Boolean(title || subtitle) && Boolean(sideTitle || sideDescription);
  const showSupportPanel = Boolean(sidePoints.length || showSideHeading);

  return (
    <div className="page-base">
      <nav className="landing-shell flex h-14 items-center justify-between sm:h-16">
        <Link href="/" className="flex min-h-11 items-center">
          <BrandLogo size="sm" />
        </Link>
        <ThemeToggle />
      </nav>

      <div className="landing-shell pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 sm:pb-10 sm:pt-3">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start">
          <section className="card px-4 py-5 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-xl">
              {mainTitle || mainSubtitle ? (
                <div className="mb-6">
                  {mainTitle ? (
                    <h1 className="text-[1.75rem] font-black leading-tight text-[var(--text-primary)] sm:text-[2rem]">
                      {mainTitle}
                    </h1>
                  ) : null}
                  {mainSubtitle ? (
                    <p className={cn('text-sm leading-6 text-[var(--text-secondary)]', mainTitle ? 'mt-2' : '')}>
                      {mainSubtitle}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!showSideHeading && sidePoints.length ? (
                <div className="subtle-card mb-6 p-4 lg:hidden">
                  <p className="app-page-eyebrow">Starter checklist</p>
                  <div className="mt-2 grid gap-2">
                    {sidePoints.map((point) => (
                      <div
                        key={point}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)]"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {children}
            </div>
          </section>

          {showSupportPanel ? (
            <aside className="subtle-card hidden h-fit p-5 lg:flex lg:flex-col lg:gap-5">
              <BrandLogo size="sm" />

              {showSideHeading ? (
                <div>
                  {sideTitle ? (
                    <h2 className="text-[1.35rem] font-black leading-tight text-[var(--text-primary)]">
                      {sideTitle}
                    </h2>
                  ) : null}
                  {sideDescription ? (
                    <p className={cn('text-sm leading-6 text-[var(--text-secondary)]', sideTitle ? 'mt-2' : '')}>
                      {sideDescription}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <p className="app-page-eyebrow">Starter checklist</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Keep the setup focused so the account starts clean and usable right away.
                  </p>
                </div>
              )}

              {sidePoints.length ? (
                <div className="grid gap-2.5">
                  {sidePoints.map((point) => (
                    <div
                      key={point}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3.5 py-3 text-sm font-semibold text-[var(--text-primary)]"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
