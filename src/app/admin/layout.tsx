import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Shield, Siren, Wrench } from 'lucide-react';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { verifyToken } from '@/lib/auth';
import { AdminNavigation } from '@/components/AdminNavigation';
import { BrandLogo } from '@/components/BrandLogo';
import { createServiceClient } from '@/lib/supabase';
import { APP_URL } from '@/lib/urls';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const appDashboardUrl = `${APP_URL}/dashboard`;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  const supabase = createServiceClient();

  if (!payload?.sub) {
    redirect(appDashboardUrl);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone, role, is_banned')
    .eq('id', payload.sub)
    .single();

  if (!profile || profile.is_banned || !hasPrimaryAdminAccess(profile)) {
    redirect(appDashboardUrl);
  }

  return (
    <div
      className="page-base app-prototype-shell admin-prototype-shell relative min-h-screen"
      data-theme="dark"
      style={{ colorScheme: 'dark' }}
    >
      <div className="app-shell-grid" />

      <aside className="admin-sidebar hidden border-r border-[var(--border-color)] lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-4">
          <a href={appDashboardUrl} className="flex items-center">
            <BrandLogo size="sm" variant="reversed" />
          </a>
          <span className="brand-chip-coral px-2.5 py-1">{profile.role}</span>
        </div>

        <div className="flex flex-1 flex-col px-3 py-4">
          <div className="mb-3 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            <Shield size={13} />
            Control room
          </div>
          <div className="mb-5 rounded-[0.55rem] border border-[var(--border-color)] bg-white/[0.03] px-3 py-3">
            <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
              <Siren size={14} />
              <p className="text-xs font-bold uppercase tracking-[0.14em]">Live ops + risk</p>
            </div>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
              Start with urgent intervention lanes, then drill into tools only when you need deeper proof
              or system checks.
            </p>
          </div>

          <nav className="space-y-1">
            <AdminNavigation role={profile.role} />
          </nav>

          <div className="admin-sidebar-card mt-auto p-3">
            <div className="flex items-center gap-2 text-[var(--text-soft)]">
              <Wrench size={13} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Access</p>
            </div>
            <p className="mt-2 text-sm font-black text-[var(--text-primary)]">{profile.role}</p>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
              Messaging tests and the audit trail stay available in the lower-weight tools area.
            </p>
            <a href={appDashboardUrl} className="btn-ghost mt-3 w-full justify-center">
              Back to app
            </a>
          </div>
        </div>
      </aside>

      <main className="relative min-h-screen overflow-x-hidden lg:pl-64">
        <header className="app-utility-header sticky top-0 z-20 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <BrandLogo size="sm" />
            <a href={appDashboardUrl} className="btn-outline min-h-9 px-3 py-2 text-xs">
              App
            </a>
          </div>

          <div className="border-t border-[var(--border-color)] px-4 pb-3 pt-3 sm:px-6">
            <div className="rounded-[0.55rem] border border-[var(--border-color)] bg-[rgba(255,255,255,0.02)] p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Decision lanes
              </div>
              <nav aria-label="Admin sections">
                <AdminNavigation role={profile.role} variant="mobile" />
              </nav>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[72rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
