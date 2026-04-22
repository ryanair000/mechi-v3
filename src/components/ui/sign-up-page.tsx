'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

type SignupPageVariant = 'default' | 'marketing';

interface SignupPageProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  sideTitle?: string;
  sideDescription?: string;
  sidePoints?: string[];
  backHref?: string;
  imageSrc?: string;
  imageAlt?: string;
  variant?: SignupPageVariant;
}

export function SignupPage({
  children,
  title,
  subtitle,
  sideTitle,
  sideDescription,
  sidePoints = [],
  backHref = '/',
  imageSrc = '/mechi-whatsapp-profile.jpg',
  imageAlt = 'Mechi community profile art',
  variant = 'default',
}: SignupPageProps) {
  const router = useRouter();
  const mainTitle = title || sideTitle;
  const mainSubtitle = subtitle || sideDescription;
  const showSideCopy = Boolean(sideTitle || sideDescription || sidePoints.length);
  const isMarketingVariant = variant === 'marketing';
  const showMarketingHighlights = isMarketingVariant && sidePoints.length > 0;

  return (
    <div
      className={
        isMarketingVariant
          ? 'page-base marketing-prototype-shell relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-5 sm:px-6 lg:px-8'
          : 'page-base flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a1b4d] bg-cover bg-center bg-no-repeat p-4 md:h-screen md:min-h-0 md:overflow-hidden'
      }
      style={
        isMarketingVariant
          ? undefined
          : {
              backgroundImage: `linear-gradient(135deg, rgba(7, 16, 42, 0.78) 0%, rgba(27, 54, 133, 0.66) 52%, rgba(10, 22, 54, 0.84) 100%), url('${imageSrc}')`,
            }
      }
    >
      {isMarketingVariant ? (
        <>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[7%] top-[10%] h-56 w-56 rounded-full bg-[rgba(50,224,196,0.14)] blur-[120px] sm:h-72 sm:w-72" />
            <div className="absolute right-[9%] top-[12%] h-56 w-56 rounded-full bg-[rgba(255,107,107,0.12)] blur-[118px] sm:h-72 sm:w-72" />
            <div className="absolute bottom-[8%] left-[24%] h-52 w-52 rounded-full bg-[rgba(52,104,219,0.12)] blur-[132px]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_16%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(130,149,176,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(130,149,176,0.035)_1px,transparent_1px)] bg-[size:88px_88px] opacity-70 [mask-image:radial-gradient(circle_at_top,rgba(0,0,0,0.68),transparent_76%)]" />
          </div>

          <div className="relative z-10 w-full max-w-[1180px] lg:origin-center lg:scale-[0.9] lg:transform-gpu">
            <div className="grid min-h-[calc(100svh-2.5rem)] gap-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[rgba(7,12,24,0.58)] p-4 shadow-[var(--shadow-strong)] backdrop-blur-2xl lg:grid-cols-[minmax(0,1.06fr)_minmax(360px,0.78fr)] lg:gap-6 lg:p-5">
              <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[linear-gradient(135deg,rgba(8,31,41,0.94)_0%,rgba(9,17,31,0.92)_48%,rgba(24,16,34,0.94)_100%)] px-5 py-5 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-y-0 left-[12%] w-px bg-gradient-to-b from-transparent via-[rgba(50,224,196,0.16)] to-transparent" />
                  <div className="absolute left-0 right-0 top-[16%] h-px bg-gradient-to-r from-transparent via-[rgba(130,149,176,0.12)] to-transparent" />
                  <div className="absolute bottom-0 right-0 h-52 w-52 translate-x-1/4 translate-y-1/4 rounded-full bg-[rgba(255,107,107,0.12)] blur-[92px]" />
                </div>

                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <BrandLogo size="lg" showTagline />
                    <button
                      type="button"
                      onClick={() => router.push(backHref)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[rgba(17,27,46,0.72)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)] backdrop-blur-sm hover:border-[rgba(50,224,196,0.24)] hover:text-[var(--text-primary)]"
                      aria-label="Back to home"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Home
                    </button>
                  </div>

                  <div className="mt-10 max-w-2xl lg:mt-14">
                    <p className="section-title">Quick read</p>
                    {showSideCopy ? (
                      <>
                        {sideTitle ? (
                          <h2 className="mt-4 max-w-xl text-[2.4rem] font-black leading-[0.96] text-[var(--text-primary)] sm:text-[3rem] lg:text-[3.6rem]">
                            {sideTitle}
                          </h2>
                        ) : null}
                        {sideDescription ? (
                          <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                            {sideDescription}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                        Clean sign-in and account setup for players moving through Mechi.
                      </p>
                    )}
                  </div>

                  {showMarketingHighlights ? (
                    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {sidePoints.map((point) => (
                        <div
                          key={point}
                          className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[rgba(17,27,46,0.78)] px-4 py-4"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
                            Mechi flow
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">{point}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {showMarketingHighlights ? (
                    <div className="mt-auto hidden pt-8 lg:block">
                      <div className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[rgba(17,27,46,0.72)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        Cleaner queue flow for East African players
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-center overflow-y-auto p-2 md:overflow-hidden lg:p-4">
                <div className="mx-auto w-full max-w-xl">
                  {mainTitle || mainSubtitle ? (
                    <div className="mb-8">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">
                        mechi.club
                      </p>
                      {mainTitle ? (
                        <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">{mainTitle}</h1>
                      ) : null}
                      {mainSubtitle ? (
                        <p className="text-sm leading-6 text-[var(--text-secondary)]">{mainSubtitle}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {children}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="w-full transition-transform duration-200 md:origin-center md:scale-[0.65]">
          <div className="flex min-h-[calc(100svh-2rem)] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:h-[calc(100svh-2rem)] md:min-h-0 md:flex-row">
            <div className="relative hidden flex-1 overflow-hidden md:block">
              <div className="absolute left-6 top-6 z-10">
                <button
                  type="button"
                  onClick={() => router.push(backHref)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-all hover:bg-black/30"
                  aria-label="Back to home"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
              </div>

              <div className="absolute inset-0">
                <Image
                  src={imageSrc}
                  alt={imageAlt}
                  fill
                  priority
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 z-10 p-8 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  mechi.club
                </p>

                {showSideCopy ? (
                  <>
                    {sideTitle ? <h2 className="mt-3 text-3xl font-bold">{sideTitle}</h2> : null}
                    {sideDescription ? (
                      <p className="mt-3 max-w-md text-sm leading-6 text-white/85">{sideDescription}</p>
                    ) : null}
                    {sidePoints.length ? (
                      <div className="mt-5 grid gap-2">
                        {sidePoints.map((point) => (
                          <div
                            key={point}
                            className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-sm"
                          >
                            {point}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/85">
                    Clean sign-in and account setup for players moving through Mechi.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-center overflow-y-auto p-8 md:overflow-hidden">
              <div className="mx-auto w-full max-w-xl">
                {mainTitle || mainSubtitle ? (
                  <div className="mb-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      mechi.club
                    </p>
                    {mainTitle ? (
                      <h1 className="mb-2 text-3xl font-bold text-gray-900">{mainTitle}</h1>
                    ) : null}
                    {mainSubtitle ? (
                      <p className="text-sm leading-6 text-gray-600">{mainSubtitle}</p>
                    ) : null}
                  </div>
                ) : null}

                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
