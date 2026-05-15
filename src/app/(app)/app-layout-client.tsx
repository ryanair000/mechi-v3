'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AppMobileUtilityHeader } from '@/components/AppMobileUtilityHeader';
import { useAuth } from '@/components/AuthProvider';
import { BottomNav } from '@/components/BottomNav';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { Sidebar } from '@/components/Sidebar';
import { BrandLogo } from '@/components/BrandLogo';
import { getLoginPath } from '@/lib/navigation';

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      const query = searchParams.toString();
      const nextPath = query ? `${pathname}?${query}` : pathname;
      router.replace(getLoginPath(nextPath, 'signin_required'));
    }
  }, [loading, pathname, router, searchParams, user]);

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

  if (!user) {
    return null;
  }

  return (
    <div
      className="page-base app-prototype-shell relative min-h-screen"
      data-theme="dark"
      style={{ colorScheme: 'dark' }}
    >
      <div className="app-shell-grid" />
      <div className="relative z-10">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((current) => !current)} />
        <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-56'}`}>
          <AppMobileUtilityHeader />
          <main className="min-h-screen overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] pt-2 lg:pb-8 lg:pt-0">
            <div className="page-container pb-2 pt-2 sm:pt-3">
              <PageBreadcrumbs />
            </div>
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
