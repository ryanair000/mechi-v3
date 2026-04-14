'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { BottomNav } from '@/components/BottomNav';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

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
      <div className="page-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <BrandLogo variant="symbol" size="md" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Loading your Mechi space...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page-base">
      <Sidebar />
      <Navbar />
      <div className="lg:pl-60">
        <main className="pb-20 lg:pb-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
