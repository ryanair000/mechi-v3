'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center font-bold text-emerald-400 text-lg">
            M
          </div>
          <p className="text-white/20 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen bg-gray-950">
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-0 h-[500px]"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(16,185,129,0.05) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10">
        <Sidebar />
        <Navbar />
        <div className="lg:pl-60">
          <main className="pb-20 lg:pb-8">{children}</main>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
