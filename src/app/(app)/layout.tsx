'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { BrandLogo } from '@/components/BrandLogo';

const APP_LIVE_DEAL = {
  title: 'God of War Digital Deluxe Edition',
  currentPrice: '$14.99',
  originalPrice: '$29.99',
  discount: '50% off',
  href: 'https://store.playstation.com/en-us/product/UP9000-CUSA07408_00-GODOFWARDDE00000',
  imageSrc: '/deals/god-of-war-digital-deluxe.png',
} as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="page-base flex min-h-screen items-center justify-center px-4">
        <div className="card flex min-w-[220px] flex-col items-center gap-3 px-6 py-6 text-center">
          <BrandLogo size="md" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">Loading your arena...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page-base relative min-h-screen">
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-0 h-[500px]"
        style={{
          background:
            'radial-gradient(ellipse 68% 42% at 14% -8%, var(--page-glow-1) 0%, transparent 62%), radial-gradient(ellipse 54% 38% at 92% 0%, var(--page-glow-2) 0%, transparent 58%)',
        }}
      />
      <div className="relative z-10">
        <Sidebar />
        <Navbar />
        <div className="lg:pl-[17rem]">
          <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
            <div className="px-4 pt-4 sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(50,224,196,0.2)] bg-[linear-gradient(135deg,rgba(50,224,196,0.12),rgba(255,106,106,0.08))] shadow-[var(--shadow-soft)]">
                <div className="grid gap-4 p-4 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center">
                  <div className="relative h-20 overflow-hidden rounded-[1rem] bg-[var(--surface-strong)]">
                    <Image
                      src={APP_LIVE_DEAL.imageSrc}
                      alt={APP_LIVE_DEAL.title}
                      fill
                      sizes="88px"
                      className="object-cover"
                      priority
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="brand-chip px-3 py-1">Live deal</span>
                      <span className="brand-chip-coral px-3 py-1">{APP_LIVE_DEAL.discount}</span>
                    </div>
                    <p className="mt-2 text-base font-black leading-tight text-[var(--text-primary)] sm:text-lg">
                      {APP_LIVE_DEAL.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {APP_LIVE_DEAL.currentPrice} now, was <span className="line-through">{APP_LIVE_DEAL.originalPrice}</span> on PlayStation Store
                    </p>
                  </div>

                  <div className="flex sm:justify-end">
                    <a
                      href={APP_LIVE_DEAL.href}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary shadow-none"
                    >
                      Open deal
                      <ExternalLink size={15} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
