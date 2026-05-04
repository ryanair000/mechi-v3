import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AndroidTestersClient } from '@/app/android-testers/android-testers-client';
import { BrandLogo } from '@/components/BrandLogo';
import FooterSection from '@/components/footer';

export const metadata: Metadata = {
  title: 'Mechi v4.0.1 Android Early Access | Mechi.club',
  description:
    'Get early access to the Mechi v4.0.1 Android app with your Play Store Google account.',
};

export default function AndroidTestersPage() {
  return (
    <div className="page-base app-prototype-shell">
      <div className="app-shell-grid" aria-hidden="true" />

      <main className="relative z-10">
        <div className="page-container">
          <header className="flex flex-wrap items-center justify-between gap-3 py-2">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <ArrowLeft size={16} />
              Back to Mechi
            </Link>
            <BrandLogo size="sm" />
          </header>

          <section className="grid gap-5 py-7 lg:grid-cols-[minmax(0,0.88fr)_minmax(360px,0.72fr)] lg:items-start">
            <div className="space-y-5">
              <div className="max-w-3xl">
                <span className="brand-kicker">Mechi v4.0.1 Android</span>
                <h1 className="mt-4 text-[2rem] font-black leading-[1.04] tracking-normal text-[var(--text-primary)] sm:text-[3rem]">
                  Get early access before the Android app goes wide.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  Lock in your spot for Mechi v4.0.1. Add the Google account you use on
                  Play Store, then we will send the early access link when your invite is ready.
                </p>
              </div>
            </div>

            <AndroidTestersClient />
          </section>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
