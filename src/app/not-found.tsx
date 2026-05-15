import Link from 'next/link';
import { Compass, Home, LifeBuoy } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function NotFound() {
  return (
    <div className="page-base flex min-h-screen items-center justify-center px-4 py-8">
      <section className="card w-full max-w-2xl p-6 text-center sm:p-8">
        <div className="mx-auto flex w-fit items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
          <BrandLogo size="sm" variant="symbol" />
        </div>
        <p className="section-title mt-5">Page not found</p>
        <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
          That route is not live here.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
          The link may be old, mistyped, or moved into a different Mechi lane. Use one of the
          safe paths below and keep moving.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/" className="btn-primary justify-center">
            <Home size={15} />
            Home
          </Link>
          <Link href="/dashboard" className="btn-outline justify-center">
            <Compass size={15} />
            Dashboard
          </Link>
          <Link href="/report" className="btn-ghost justify-center">
            <LifeBuoy size={15} />
            Report issue
          </Link>
        </div>
      </section>
    </div>
  );
}
