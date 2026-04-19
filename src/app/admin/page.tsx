import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  DoorOpen,
  Headset,
  ScrollText,
  Shield,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { expireWaitingQueueEntries, getQueueExpiryCutoffIso } from '@/lib/queue';
import { createServiceClient } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import type { AuditLog } from '@/types';

interface AdminOverviewData {
  totalUsers: number;
  bannedUsers: number;
  newUsers7d: number;
  openRewardReviews: number;
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
    openRewardReviews: 0,
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
    return 'Queue is healthy';
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
  const staleQueueThreshold = getQueueExpiryCutoffIso();
  const nowIso = new Date().toISOString();

  if (!payload?.sub) {
    return buildEmptyOverview();
  }

  await expireWaitingQueueEntries(supabase);

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
    { count: openRewardReviews },
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
    supabase.from('reward_review_queue').select('id', { count: 'exact', head: true }).in('status', ['open', 'reviewing']),
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
    openRewardReviews: openRewardReviews ?? 0,
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

  const attentionCards = [
    {
      href: '/admin/rewards',
      title: 'Reward reviews',
      value: overview.openRewardReviews,
      detail:
        overview.openRewardReviews > 0
          ? 'Suspicious referral or redemption events need a moderator look before points leakage grows.'
          : 'No suspicious reward items are waiting for manual review right now.',
      icon: Shield,
    },
    {
      href: '/admin/queue',
      title: 'Queue backlog',
      value: overview.staleQueueEntries,
      detail:
        overview.staleQueueEntries > 0
          ? `${formatWaitLabel(overview.longestQueueWaitMinutes)}. Review stuck entrants before churn starts.`
          : 'All waiting players are still within the expected matchmaking window.',
      icon: Clock3,
    },
    {
      href: '/admin/lobbies',
      title: 'Overdue lobbies',
      value: overview.overdueLobbies,
      detail:
        overview.overdueLobbies > 0
          ? `${overview.openLobbies.toLocaleString()} open and ${overview.fullLobbies.toLocaleString()} full rooms need a look.`
          : 'No open or full rooms have drifted past their scheduled start time.',
      icon: DoorOpen,
    },
    {
      href: '/admin/matches',
      title: 'Disputed matches',
      value: overview.disputedMatches,
      detail:
        overview.disputedMatches > 0
          ? `${overview.activeMatches.toLocaleString()} live matches are still in progress behind them.`
          : 'No disputes are waiting on manual review right now.',
      icon: Swords,
    },
    {
      href: '/admin/tournaments',
      title: 'Pending payouts',
      value: overview.pendingPayouts,
      detail:
        overview.pendingPayouts > 0
          ? 'Completed events are waiting on payout follow-through.'
          : 'Tournament payouts are caught up for completed events.',
      icon: Trophy,
    },
  ];

  const primaryActions = [
    {
      href: '/admin/rewards',
      title: 'Reward protection',
      detail: `${overview.openRewardReviews.toLocaleString()} suspicious reward items waiting on moderator action.`,
      icon: Shield,
    },
    {
      href: '/admin/queue',
      title: 'Queue control',
      detail: `${overview.waitingQueue.toLocaleString()} players waiting across ranked matchmaking.`,
      icon: Clock3,
    },
    {
      href: '/admin/lobbies',
      title: 'Lobby cleanup',
      detail: `${(overview.openLobbies + overview.fullLobbies + overview.liveLobbies).toLocaleString()} total rooms across open, full, and live states.`,
      icon: DoorOpen,
    },
    {
      href: '/admin/matches',
      title: 'Match review',
      detail: `${overview.disputedMatches.toLocaleString()} disputes and ${overview.activeMatches.toLocaleString()} pending matches in the lane.`,
      icon: Swords,
    },
    {
      href: '/admin/tournaments',
      title: 'Tournament ops',
      detail: `${overview.activeTournaments.toLocaleString()} active brackets and ${overview.pendingPayouts.toLocaleString()} finance follow-ups.`,
      icon: Trophy,
    },
    {
      href: '/admin/users',
      title: 'Player accounts',
      detail: `${overview.totalUsers.toLocaleString()} total players and ${overview.bannedUsers.toLocaleString()} suspended accounts.`,
      icon: Users,
    },
    {
      href: '/admin/support',
      title: 'Support inbox',
      detail: 'Review WhatsApp escalations and human handoffs in one place.',
      icon: Headset,
    },
  ];

  const snapshotCards = [
    {
      label: 'New players this week',
      value: overview.newUsers7d.toLocaleString(),
      detail: `${overview.totalUsers.toLocaleString()} total player accounts`,
    },
    {
      label: 'Matches tracked',
      value: overview.totalMatches.toLocaleString(),
      detail: `${overview.activeMatches.toLocaleString()} still live or waiting on completion`,
    },
    {
      label: 'Active tournaments',
      value: overview.activeTournaments.toLocaleString(),
      detail: `${overview.totalTournaments.toLocaleString()} tournament records overall`,
    },
    {
      label: 'Prize paid out',
      value: `KSh ${overview.totalPrizeDistributed.toLocaleString()}`,
      detail: `${overview.bannedUsers.toLocaleString()} accounts currently suspended`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="card p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="brand-kicker">Admin control room</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-[3rem]">
              Keep the platform calm, clear, and easy to operate.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Start with what needs intervention, jump straight into the operational lane you need,
              then use the activity feed to verify what changed.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
              <p className="section-title">Queue pulse</p>
              <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
                {formatWaitLabel(overview.longestQueueWaitMinutes)}
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
              <p className="section-title">Live rooms</p>
              <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
                {(overview.openLobbies + overview.fullLobbies + overview.liveLobbies).toLocaleString()}
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
              <p className="section-title">Access</p>
              <p className="mt-2 text-lg font-black text-[var(--text-primary)]">
                {overview.role}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-title">Needs attention</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Start with the lanes most likely to create player friction.
            </p>
          </div>
          <AlertTriangle size={18} className="text-[var(--brand-coral)]" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {attentionCards.map(({ href, title, value, detail, icon: Icon }) => {
            const isActive = value > 0;

            return (
              <Link
                key={href}
                href={href}
                className={`rounded-[var(--radius-card)] border p-4 transition-colors ${
                  isActive
                    ? 'border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.08)] hover:bg-[rgba(255,107,107,0.12)]'
                    : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="section-title">{title}</p>
                    <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">
                      {value.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-panel)] ${
                      isActive
                        ? 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]'
                        : 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
                <span className="brand-link mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                  Open lane
                  <ArrowRight size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Primary lanes</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                The areas most admins will jump between during live operations.
              </p>
            </div>
            <Shield size={18} className="text-[var(--brand-teal)]" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {primaryActions.map(({ href, title, detail, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 transition-colors hover:bg-[var(--surface)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-panel)] bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-black text-[var(--text-primary)]">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {overview.role === 'admin' ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin/whatsapp" className="brand-link text-sm font-semibold">
                WhatsApp tools
              </Link>
              <Link href="/admin/logs" className="brand-link text-sm font-semibold">
                Audit log
              </Link>
            </div>
          ) : null}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Recent admin activity</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Quick confirmation of the latest staff actions across the platform.
              </p>
            </div>
            <ScrollText size={18} className="text-[var(--brand-teal)]" />
          </div>

          {overview.role !== 'admin' ? (
            <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <p className="text-base font-semibold text-[var(--text-primary)]">
                Full audit visibility is admin-only.
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Queue, lobby, match, tournament, and support tools remain available from the lanes on
                the left.
              </p>
            </div>
          ) : overview.recentLogs.length === 0 ? (
            <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 text-sm text-[var(--text-secondary)]">
              No admin actions logged yet.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
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
                    className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          {formatActionLabel(log.action)}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                          {(log.admin?.username ?? 'Unknown admin')} acted on {log.target_type}
                          {subject ? `: ${subject}` : log.target_id ? `: ${log.target_id.slice(0, 8)}...` : ''}.
                        </p>
                      </div>
                      <span className="text-xs text-[var(--text-soft)]">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-title">Platform snapshot</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              A compact read on player growth, live competition, and finance state.
            </p>
          </div>
          <Users size={18} className="text-[var(--brand-teal)]" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {snapshotCards.map(({ label, value, detail }) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4"
            >
              <p className="section-title">{label}</p>
              <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">{value}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
