'use client';

import Link from 'next/link';
import { RefreshCcw, ShieldAlert } from 'lucide-react';
import { useEffect } from 'react';
import { BrandLogo } from '@/components/BrandLogo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppErrorBoundary]', error);
  }, [error]);

  return (
    <div className="page-base flex min-h-screen items-center justify-center px-4 py-8">
      <section className="card w-full max-w-2xl p-6 text-center sm:p-8">
        <div className="mx-auto flex w-fit items-center gap-3 rounded-[var(--radius-control)] border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-red-300">
          <ShieldAlert size={18} />
          <BrandLogo size="sm" variant="symbol" />
        </div>
        <p className="section-title mt-5">Something broke</p>
        <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
          We hit a bad state on this screen.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          Nothing is happening in the background now. Retry this screen, head back home, or open
          the dashboard and try the next action from there.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => reset()} className="btn-primary justify-center">
            <RefreshCcw size={15} />
            Try again
          </button>
          <Link href="/" className="btn-outline justify-center">
            Home
          </Link>
          <Link href="/dashboard" className="btn-ghost justify-center">
            Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
