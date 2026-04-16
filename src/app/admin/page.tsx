import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  DoorOpen,
  MessageCircle,
  Shield,
  Swords,
  Trophy,
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
  waitingQueue: number;
  longestQueueWaitMinutes: number;
  staleQueueEntries: number;
  openLobbies: number;
  fullLobbies: number;
  liveLobbies: number;
  overdueLobbies: number;
  pendingPayouts: number;
  recentLogs: AuditLog[];
  role: string;
}

function buildEmptyOverview(role = 'moderator'): AdminOverviewData {
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
    waitingQueue: 0,
    longestQueueWaitMinutes: 0,
    staleQueueEntries: 0,
    openLobbies: 0,
    fullLobbies: 0,
    liveLobbies: 0,
    overdueLobbies: 0,
    pendingPayouts: 0,
    recentLogs: [],
    role,
  };
}

function formatActionLabel(action: string) {
  return action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatWaitLabel(minutes: number) {
  if (minutes <= 0) {
    return 'Fresh queue';
  }

  if (minutes < 60) {
    return `${minutes} min longest wait`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr longest wait`;
  }

  return `${hours} hr ${remainingMinutes} min longest wait`;
}

async function getOverviewData(): Promise<AdminOverviewData> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  const supabase = createServiceClient();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const staleQueueThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  if (!payload?.sub) {
    return buildEmptyOverview();
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
    { count: waitingQueue },
    oldestQueueResult,
    { count: staleQueueEntries },
    { count: openLobbies },
    { count: fullLobbies },
    { count: liveLobbies },
    { count: overdueLobbies },
    { count: pendingPayouts },
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
    supabase.from('queue').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
    supabase
      .from('queue')
      .select('joined_at')
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lt('joined_at', staleQueueThreshold),
    supabase.from('lobbies').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('lobbies').select('id', { count: 'exact', head: true }).eq('status', 'full'),
    supabase.from('lobbies').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase
      .from('lobbies')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'full'])
      .lt('scheduled_for', nowIso),
    supabase.from('tournaments').select('id', { count: 'exact', head: true }).eq('payout_status', 'pending'),
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

  const oldestQueueJoinedAt = oldestQueueResult.data?.joined_at ?? null;
  const longestQueueWaitMinutes = oldestQueueJoinedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(oldestQueueJoinedAt).getTime()) / 60_000))
    : 0;

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
    waitingQueue: waitingQueue ?? 0,
    longestQueueWaitMinutes,
    staleQueueEntries: staleQueueEntries ?? 0,
    openLobbies: openLobbies ?? 0,
    fullLobbies: fullLobbies ?? 0,
    liveLobbies: liveLobbies ?? 0,
    overdueLobbies: overdueLobbies ?? 0,
    pendingPayouts: pendingPayouts ?? 0,
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
      detail: `${overview.newUsers7d.toLocaleString()} joined in the last 7 days`,
      accent: 'var(--brand-teal)',
      icon: Users,
    },
    {
      label: 'Queue',
      value: overview.waitingQueue.toLocaleString(),
      detail: `${overview.staleQueueEntries.toLocaleString()} waiting longer than 10 minutes`,
      accent: '#60A5FA',
      icon: Clock3,
    },
    {
      label: 'Lobbies',
      value: overview.openLobbies.toLocaleString(),
      detail: `${overview.fullLobbies.toLocaleString()} full, ${overview.liveLobbies.toLocaleString()} in progress`,
      accent: 'var(--brand-coral)',
      icon: DoorOpen,
    },
    {
      label: 'Live matches',
      value: overview.activeMatches.toLocaleString(),
      detail: `${overview.disputedMatches.toLocaleString()} disputed right now`,
      accent: '#F59E0B',
      icon: Swords,
    },
    {
      label: 'Tournaments',
      value: overview.activeTournaments.toLocaleString(),
      detail: `${overview.pendingPayouts.toLocaleString()} pending payout reviews`,
      accent: '#F97316',
      icon: Trophy,
    },
    {
      label: 'Safety',
      value: overview.bannedUsers.toLocaleString(),
      detail: `KSh ${overview.totalPrizeDistributed.toLocaleString()} paid out so far`,
      accent: '#F87171',
      icon: Shield,
    },
  ];

  const heroLinks = [
    {
      href: '/admin/queue',
      title: 'Queue ops',
      body: 'Cancel stuck entries, inspect waiting times, and rerun matchmaking when the pool needs a push.',
      icon: Clock3,
    },
    {
      href: '/admin/lobbies',
      title: 'Lobby ops',
      body: 'Clean up bad rooms, remove members, and keep team titles from drifting into chaos.',
      icon: DoorOpen,
    },
  ];

  const fastActions = [
    { href: '/admin/users', title: 'Review players', meta: 'Search, filter, ban, or update roles.' },
    { href: '/admin/queue', title: 'Clear queue issues', meta: 'Find long waits and cancel broken entries.' },
    { href: '/admin/lobbies', title: 'Clean rooms', meta: 'Close stale lobbies or remove bad actors.' },
    { href: '/admin/matches', title: 'Resolve matches', meta: 'Handle disputes and stuck pending matches.' },
    { href: '/admin/tournaments', title: 'Watch brackets', meta: 'Inspect tournament health and payout state.' },
    ...(overview.role === 'admin'
      ? [
          { href: '/admin/whatsapp', title: 'Test WhatsApp', meta: 'Preview sandbox alerts and delivery wiring.' },
          { href: '/admin/logs', title: 'Audit trail', meta: 'Review the latest staff actions across ops.' },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_0.85fr] lg:p-6">
          <div>
            <p className="brand-kicker">Admin control room</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-[3.2rem]">
              Run the platform without losing the plot.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Watch queue health, clean up lobby mess, moderate players, and keep tournament ops moving
              before problems spill into the live competition lane.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="brand-chip px-3 py-1.5">{overview.totalMatches.toLocaleString()} matches tracked</span>
              <span className="brand-chip-coral px-3 py-1.5">{overview.role} access</span>
              <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                {formatWaitLabel(overview.longestQueueWaitMinutes)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {heroLinks.map(({ href, title, body, icon: Icon }) => (
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

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Urgent lanes</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The quickest places to jump when live competition starts feeling off.
              </p>
            </div>
            <AlertTriangle size={18} className="text-[var(--brand-coral)]" />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <Link
              href="/admin/queue"
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 transition-colors hover:bg-[var(--surface)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(96,165,250,0.12)] text-[#60A5FA]">
                  <Clock3 size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[var(--text-primary)]">Stuck queue</p>
                  <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                    {overview.staleQueueEntries.toLocaleString()} entries have been waiting more than 10 minutes.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[var(--text-soft)]">
                    {formatWaitLabel(overview.longestQueueWaitMinutes)}
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/admin/lobbies"
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 transition-colors hover:bg-[var(--surface)]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.12)] text-[var(--brand-coral)]">
                  <DoorOpen size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[var(--text-primary)]">Bad room cleanup</p>
                  <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                    {overview.overdueLobbies.toLocaleString()} open or full rooms are already past their expected start time.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-[var(--text-soft)]">
                    {overview.openLobbies.toLocaleString()} open, {overview.fullLobbies.toLocaleString()} full, {overview.liveLobbies.toLocaleString()} live
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Fast actions</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The control-room links that matter most when ops needs a decision.
              </p>
            </div>
            <Shield size={18} className="text-[var(--brand-teal)]" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {fastActions.map((item) => (
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
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Competition health</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                A quick read on the live ops stack across lobbies, ranked runs, and brackets.
              </p>
            </div>
            <Trophy size={18} className="text-[var(--brand-coral)]" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Queue pressure
              </p>
              <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">
                {overview.waitingQueue.toLocaleString()}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Waiting players across ranked matchmaking.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Room activity
              </p>
              <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">
                {overview.openLobbies + overview.fullLobbies + overview.liveLobbies}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Open, full, and in-progress lobbies in the system right now.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Tournament finance
              </p>
              <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">
                {overview.pendingPayouts.toLocaleString()}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Completed events still waiting on payout follow-through.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Suspended accounts
              </p>
              <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">
                {overview.bannedUsers.toLocaleString()}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Accounts currently blocked from entering the competition lanes.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Recent admin activity</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {overview.role === 'admin'
                  ? 'The latest staff actions across moderation and ops.'
                  : 'Admins can view the full audit trail. Moderators stay focused on ops tools.'}
              </p>
            </div>
            <Shield size={18} className="text-[var(--brand-teal)]" />
          </div>

          {overview.role !== 'admin' ? (
            <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Audit log is admin-only.</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                You can still handle queues, lobbies, users, matches, and tournaments from here.
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
                const subject =
                  typeof details.username === 'string'
                    ? details.username
                    : typeof details.title === 'string'
                      ? details.title
                      : typeof details.roomCode === 'string'
                        ? details.roomCode
                        : null;

                return (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {formatActionLabel(log.action)}
                      </p>
                      <span className="text-[11px] text-[var(--text-soft)]">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                      {(log.admin?.username ?? 'Unknown admin')} acted on {log.target_type}
                      {subject ? `: ${subject}` : log.target_id ? `: ${log.target_id.slice(0, 8)}...` : ''}.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {overview.role === 'admin' ? (
        <section className="card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
              <MessageCircle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[var(--text-primary)]">WhatsApp control lane</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Sandbox-test 1:1 alerts, inspect recipient errors, and keep the lobby-group setup in one place.
              </p>
              <Link href="/admin/whatsapp" className="brand-link-coral mt-3 inline-flex items-center gap-1 text-xs font-semibold">
                Open WhatsApp tools
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
