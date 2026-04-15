import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  AlertTriangle,
  ArrowRight,
  Shield,
  Swords,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import type { AuditLog } from '@/types';

interface AdminOverviewData {
  totalUsers: number;
  bannedUsers: number;
  newUsers7d: number;
  totalMatches: number;
  disputedMatches: number;
  activeMatches: number;
  totalTournaments: number;
  activeTournaments: number;
  totalPrizeDistributed: number;
  recentLogs: AuditLog[];
  role: string;
}

async function getOverviewData(): Promise<AdminOverviewData> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  const supabase = createServiceClient();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  if (!payload?.sub) {
    return {
      totalUsers: 0,
      bannedUsers: 0,
      newUsers7d: 0,
      totalMatches: 0,
      disputedMatches: 0,
      activeMatches: 0,
      totalTournaments: 0,
      activeTournaments: 0,
      totalPrizeDistributed: 0,
      recentLogs: [],
      role: 'moderator',
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', payload.sub)
    .single();
  const role = typeof profile?.role === 'string' ? profile.role : 'moderator';

  const [
    { count: totalUsers },
    { count: bannedUsers },
    { count: newUsers7d },
    { count: totalMatches },
    { count: disputedMatches },
    { count: activeMatches },
    { count: totalTournaments },
    { count: activeTournaments },
    prizeResult,
    logsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    supabase.from('matches').select('id', { count: 'exact', head: true }),
    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'disputed'),
    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('tournaments').select('id', { count: 'exact', head: true }),
    supabase.from('tournaments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tournaments').select('prize_pool').eq('status', 'completed'),
    role === 'admin'
      ? supabase
          .from('admin_audit_logs')
          .select('*, admin:admin_id(id, username)')
          .order('created_at', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const totalPrizeDistributed = (prizeResult.data ?? []).reduce(
    (total, tournament) => total + ((tournament.prize_pool as number | null) ?? 0),
    0
  );

  return {
    totalUsers: totalUsers ?? 0,
    bannedUsers: bannedUsers ?? 0,
    newUsers7d: newUsers7d ?? 0,
    totalMatches: totalMatches ?? 0,
    disputedMatches: disputedMatches ?? 0,
    activeMatches: activeMatches ?? 0,
    totalTournaments: totalTournaments ?? 0,
    activeTournaments: activeTournaments ?? 0,
    totalPrizeDistributed,
    recentLogs: (logsResult.data ?? []) as AuditLog[],
    role,
  };
}

export default async function AdminOverviewPage() {
  const overview = await getOverviewData();

  const statCards = [
    {
      label: 'Players',
      value: overview.totalUsers.toLocaleString(),
      detail: `${overview.newUsers7d.toLocaleString()} joined this week`,
      accent: 'var(--brand-teal)',
      icon: Users,
    },
    {
      label: 'Live matches',
      value: overview.activeMatches.toLocaleString(),
      detail: `${overview.disputedMatches.toLocaleString()} disputed right now`,
      accent: '#60A5FA',
      icon: Swords,
    },
    {
      label: 'Tournaments',
      value: overview.activeTournaments.toLocaleString(),
      detail: `${overview.totalTournaments.toLocaleString()} total created`,
      accent: 'var(--brand-coral)',
      icon: Trophy,
    },
    {
      label: 'Flagged accounts',
      value: overview.bannedUsers.toLocaleString(),
      detail: `KSh ${overview.totalPrizeDistributed.toLocaleString()} paid out so far`,
      accent: '#F87171',
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-6">
          <div>
            <p className="brand-kicker">Admin control room</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-[3.2rem]">
              Keep Mechi safe, clean, and moving.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Review disputes, manage user access, and spot tournament issues before they spill
              into the player experience.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="brand-chip px-3 py-1.5">{overview.totalMatches.toLocaleString()} matches tracked</span>
              <span className="brand-chip-coral px-3 py-1.5">{overview.role} access</span>
              <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                {overview.bannedUsers.toLocaleString()} suspended accounts
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              {
                href: '/admin/users',
                title: 'Users',
                body: 'Ban, unban, or adjust roles when the platform needs moderation backup.',
                icon: Users,
              },
              {
                href: '/admin/matches',
                title: 'Disputes',
                body: 'Jump into contested results and unblock players waiting on admin review.',
                icon: AlertTriangle,
              },
            ].map(({ href, title, body, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 transition-colors hover:border-[rgba(50,224,196,0.24)] hover:bg-[var(--surface)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-[var(--text-primary)]">{title}</p>
                    <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{body}</p>
                    <span className="brand-link mt-3 inline-flex items-center gap-1 text-xs font-black">
                      Open
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, detail, accent, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="section-title">{label}</p>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ background: `${accent}1f`, color: accent }}
              >
                <Icon size={18} />
              </div>
            </div>
            <p className="mt-4 text-3xl font-black tracking-tight text-[var(--text-primary)]">{value}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Fast actions</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The admin paths you’ll use most when the platform needs quick decisions.
              </p>
            </div>
            <UserPlus size={18} className="text-[var(--brand-coral)]" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { href: '/admin/users', title: 'Review players', meta: 'Search, filter, ban, or update roles.' },
              { href: '/admin/matches', title: 'Resolve matches', meta: 'Handle disputes and overrides.' },
              { href: '/admin/tournaments', title: 'Check brackets', meta: 'Cancel broken events or inspect winners.' },
              {
                href: overview.role === 'admin' ? '/admin/logs' : '/admin',
                title: overview.role === 'admin' ? 'Audit trail' : 'Moderator lane',
                meta:
                  overview.role === 'admin'
                    ? 'Review the latest admin actions.'
                    : 'Audit logs unlock once you have admin role.',
              },
            ].map((item) => (
              <Link
                key={item.href + item.title}
                href={item.href}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4 transition-colors hover:bg-[var(--surface)]"
              >
                <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">{item.meta}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Recent admin activity</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {overview.role === 'admin'
                  ? 'A quick read on the latest actions taken across the moderation team.'
                  : 'Admins can view the full audit trail. Moderators only see operational tools.'}
              </p>
            </div>
            <Shield size={18} className="text-[var(--brand-teal)]" />
          </div>

          {overview.role !== 'admin' ? (
            <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Audit log is admin-only.</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                You can still handle disputes, users, and tournaments, but audit history stays
                locked to admin accounts.
              </p>
            </div>
          ) : overview.recentLogs.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
              No admin actions logged yet.
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {overview.recentLogs.map((log) => {
                const details = log.details ?? {};
                const username =
                  typeof details.username === 'string'
                    ? details.username
                    : typeof details.title === 'string'
                      ? details.title
                      : null;

                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{log.action}</p>
                      <span className="text-[11px] text-[var(--text-soft)]">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                      {(log.admin?.username ?? 'Unknown admin')} acted on {log.target_type}
                      {username ? `: ${username}` : log.target_id ? `: ${log.target_id.slice(0, 8)}…` : ''}.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
