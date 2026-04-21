'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

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

  return (
    <div className="page-base flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="w-full transition-transform duration-200 md:origin-center md:scale-50">
        <div className="flex min-h-[calc(100svh-2rem)] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:flex-row">
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

          <div className="flex flex-1 flex-col justify-center overflow-y-auto p-8">
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
    </div>
  );
}
