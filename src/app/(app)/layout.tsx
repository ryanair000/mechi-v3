'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppOnboarding } from '@/components/AppOnboarding';
import { AppMobileUtilityHeader } from '@/components/AppMobileUtilityHeader';
import { useAuth } from '@/components/AuthProvider';
import { BottomNav } from '@/components/BottomNav';
import { Sidebar } from '@/components/Sidebar';
import { BrandLogo } from '@/components/BrandLogo';

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
    <div
      className="page-base app-prototype-shell relative min-h-screen"
      data-theme="dark"
      style={{ colorScheme: 'dark' }}
    >
      <div className="app-shell-grid" />
      <div className="relative z-10">
        <Sidebar />
        <div className="lg:pl-56">
          <AppMobileUtilityHeader />
          <main className="min-h-screen overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] pt-2 lg:pb-8 lg:pt-0">
            {children}
          </main>
        </div>
        <BottomNav />
        <AppOnboarding />
      </div>
    </div>
  );
}
