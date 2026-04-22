'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

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
}: SignupPageProps) {
  const router = useRouter();
  const mainTitle = title || sideTitle;
  const mainSubtitle = subtitle || sideDescription;
  const showSideCopy = Boolean(sideTitle || sideDescription || sidePoints.length);
  const mobilePoints = sidePoints.slice(0, 2);

  return (
    <div className="page-base relative isolate overflow-hidden bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.16),transparent_28%),linear-gradient(135deg,#081120_0%,#102a5c_48%,#09101b_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,107,107,0.18),transparent_18%),radial-gradient(circle_at_15%_80%,rgba(50,224,196,0.12),transparent_22%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[65rem] items-center px-4 py-5 sm:px-6 lg:px-8 xl:max-w-[69rem]">
        <div className="grid w-full overflow-hidden rounded-[1.6rem] border border-white/10 bg-[rgba(6,12,22,0.78)] shadow-[0_26px_96px_rgba(2,6,23,0.48)] backdrop-blur-2xl lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative hidden min-h-[34rem] overflow-hidden border-r border-white/10 lg:flex">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover scale-[1.04]"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,17,32,0.2)_0%,rgba(8,17,32,0.5)_38%,rgba(8,17,32,0.92)_100%)]" />

            <div className="relative z-10 flex w-full flex-col justify-between p-6 xl:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/55">
                    mechi.club
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-white/72">
                    Account setup for players joining Mechi.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(backHref)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition-all hover:bg-white/14"
                  aria-label="Back to home"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="max-w-md">
                <div className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/72">
                  Mechi onboarding
                </div>

                {showSideCopy ? (
                  <>
                    {sideTitle ? (
                      <h2 className="mt-4 text-[2.7rem] font-semibold leading-tight text-white">
                        {sideTitle}
                      </h2>
                    ) : null}
                    {sideDescription ? (
                      <p className="mt-3 max-w-sm text-sm leading-6 text-white/78">
                        {sideDescription}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <h2 className="mt-4 text-[2.7rem] font-semibold leading-tight text-white">
                    Clean sign-in and account setup for players moving through Mechi.
                  </h2>
                )}
              </div>

              {sidePoints.length ? (
                <div className="grid gap-2.5">
                  {sidePoints.map((point) => (
                    <div
                      key={point}
                      className="flex items-start gap-2.5 rounded-[1.15rem] border border-white/10 bg-white/8 px-3.5 py-3 backdrop-blur-sm"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--brand-teal)]" />
                      <p className="text-[13px] font-medium leading-5.5 text-white/92">{point}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative flex min-h-[100svh] flex-col justify-center lg:min-h-[34rem]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_72%)]" />

            <div className="relative mx-auto w-full max-w-[31rem] px-5 py-6 sm:px-7 lg:px-8 lg:py-9">
              <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    mechi.club
                  </p>
                  <p className="mt-2 text-sm text-white/72">Fast player onboarding</p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(backHref)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition-all hover:bg-white/14"
                  aria-label="Back to home"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>

              {showSideCopy ? (
                <div className="mb-6 rounded-[1.5rem] border border-white/10 bg-white/6 p-4 text-white shadow-[0_18px_44px_rgba(2,6,23,0.18)] backdrop-blur-sm lg:hidden">
                  {sideTitle ? <h2 className="text-2xl font-semibold">{sideTitle}</h2> : null}
                  {sideDescription ? (
                    <p className="mt-2 text-sm leading-6 text-white/78">{sideDescription}</p>
                  ) : null}

                  {mobilePoints.length ? (
                    <div className="mt-4 grid gap-2">
                      {mobilePoints.map((point) => (
                        <div key={point} className="flex items-start gap-2.5 text-sm text-white/88">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-teal)]" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {mainTitle || mainSubtitle ? (
                <div className="mb-6 sm:mb-7">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    mechi.club
                  </p>
                  {mainTitle ? (
                    <h1 className="mb-2.5 text-[2.3rem] font-semibold leading-tight text-white sm:text-[2rem]">
                      {mainTitle}
                    </h1>
                  ) : null}
                  {mainSubtitle ? (
                    <p className="max-w-lg text-[0.95rem] leading-6.5 text-slate-300 sm:text-[0.92rem]">
                      {mainSubtitle}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
