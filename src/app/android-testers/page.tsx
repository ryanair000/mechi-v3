import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Download, MessageSquareText, RefreshCw, ShieldCheck } from 'lucide-react';
import { AndroidTestersClient } from '@/app/android-testers/android-testers-client';
import { BrandLogo } from '@/components/BrandLogo';
import FooterSection from '@/components/footer';

export const metadata: Metadata = {
  title: 'Mechi v4.0.1 Android Early Access | Mechi.club',
  description:
    'Get early access to the Mechi v4.0.1 Android app with your Play Store Google account.',
};

const CHECKPOINTS = [
  {
    title: 'Drop your Play Store email',
    detail: 'Use the Google account already signed in on your Android phone.',
    icon: ShieldCheck,
  },
  {
    title: 'Get the early link',
    detail: 'When your spot opens, Mechi sends the Play Store invite on WhatsApp.',
    icon: MessageSquareText,
  },
  {
    title: 'Stay on the new build',
    detail: 'Install v4.0.1 early and keep getting fresh Android updates as they drop.',
    icon: RefreshCw,
  },
];

const EARLY_ACCESS_NOTES = [
  'Mechi v4.0.1 Android is opening early access for the first wave.',
  'Use your real Play Store email so the invite lands on the right account.',
  'Keep WhatsApp reachable so the early access link does not miss you.',
];

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

              <div className="grid gap-3 sm:grid-cols-3">
                {CHECKPOINTS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.title} className="subtle-card p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)]">
                        <Icon size={18} />
                      </div>
                      <h2 className="mt-4 text-base font-black text-[var(--text-primary)]">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.detail}</p>
                    </div>
                  );
                })}
              </div>

              <div className="subtle-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--accent-primary-soft)] text-[#ffb1b1]">
                    <Download size={18} />
                  </div>
                  <div>
                    <p className="section-title">Early access</p>
                    <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">What you are getting</h2>
                    <div className="mt-3 grid gap-2">
                      {EARLY_ACCESS_NOTES.map((note) => (
                        <p key={note} className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
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
