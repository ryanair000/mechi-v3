import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { BarChart2, ChevronRight, MessageCircle, ScrollText, Shield, Swords, Trophy, Users } from 'lucide-react';
import { verifyToken } from '@/lib/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { createServiceClient } from '@/lib/supabase';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: BarChart2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/matches', label: 'Matches', icon: Swords },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/admin/logs', label: 'Audit Log', icon: ScrollText },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  const supabase = createServiceClient();

  if (!payload?.sub) {
    redirect('/dashboard');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', payload.sub)
    .single();

  if (!profile || profile.is_banned || (profile.role !== 'admin' && profile.role !== 'moderator')) {
    redirect('/dashboard');
  }

  return (
    <div className="page-base min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-[var(--border-color)] bg-[var(--surface-soft)] p-4 lg:block">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center">
            <BrandLogo size="sm" variant="reversed" />
          </Link>
          <span className="rounded-full bg-[var(--danger-soft)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-500">
            {profile.role}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2 px-3 text-xs font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
          <Shield size={13} /> Admin
        </div>
        <nav className="space-y-1">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={13} className="opacity-0 transition-opacity group-hover:opacity-50" />
            </Link>
          ))}
        </nav>
        <Link href="/dashboard" className="brand-link mt-8 inline-flex px-3 text-sm font-semibold">
          Back to app
        </Link>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <BrandLogo size="sm" />
            <Link href="/dashboard" className="brand-link text-sm font-black">
              App
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
