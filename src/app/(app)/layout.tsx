'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';
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
          <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">{children}</main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
