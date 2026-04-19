import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  AtSign,
  BarChart2,
  ChevronRight,
  Clock3,
  DoorOpen,
  MessageCircle,
  ScrollText,
  Shield,
  Headset,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { hasPrimaryAdminAccess } from '@/lib/admin-access';
import { verifyToken } from '@/lib/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { createServiceClient } from '@/lib/supabase';
import { APP_URL } from '@/lib/urls';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: BarChart2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/rewards', label: 'Rewards', icon: Shield },
  { href: '/admin/queue', label: 'Queue', icon: Clock3 },
  { href: '/admin/lobbies', label: 'Lobbies', icon: DoorOpen },
  { href: '/admin/matches', label: 'Matches', icon: Swords },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/admin/support', label: 'Support', icon: Headset },
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle, adminOnly: true },
  { href: '/admin/instagram', label: 'Instagram', icon: AtSign, adminOnly: true },
  { href: '/admin/logs', label: 'Audit Log', icon: ScrollText, adminOnly: true },
];

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

  const visibleNav = ADMIN_NAV.filter((item) => !item.adminOnly || profile.role === 'admin');

  return (
    <div className="page-base min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-[var(--border-color)] bg-[var(--surface-soft)] p-4 lg:block">
        <div className="mb-8 flex items-center justify-between">
          <a href={appDashboardUrl} className="flex items-center">
            <BrandLogo size="sm" variant="reversed" />
          </a>
          <span className="rounded-full bg-[var(--danger-soft)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-500">
            {profile.role}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2 px-3 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
          <Shield size={13} /> Control room
        </div>
        <nav className="space-y-1">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-[var(--radius-panel)] px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={13} className="opacity-0 transition-opacity group-hover:opacity-50" />
            </Link>
          ))}
        </nav>
        <a href={appDashboardUrl} className="brand-link mt-8 inline-flex px-3 text-sm font-semibold">
          Back to app
        </a>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <BrandLogo size="sm" />
            <a href={appDashboardUrl} className="brand-link text-sm font-black">
              App
            </a>
          </div>

          <div className="mb-6 lg:hidden">
            <div className="-mx-4 overflow-x-auto pb-1 no-scrollbar sm:-mx-6">
              <nav className="flex gap-2 px-4 sm:px-6" aria-label="Admin sections">
                {visibleNav.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] whitespace-nowrap"
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
