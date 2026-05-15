'use client';

import { Shield } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';

export default function BannedPage() {
  const { logout } = useAuth();

  return (
    <div className="page-base px-5 py-8 sm:py-10">
      <div className="mx-auto max-w-md">
        <PageBreadcrumbs className="mb-5" />
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-red-500/12 text-red-400">
            <Shield size={28} />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Account suspended
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            This account is currently blocked from Mechi. If you think this happened by mistake,
            reach out and we&apos;ll review it.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <a href="mailto:support@mechi.club" className="btn-ghost justify-center">
              Contact support
            </a>
            <button type="button" onClick={logout} className="btn-danger justify-center">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
