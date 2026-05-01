import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Headset,
  MessageCircle,
  RadioTower,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import {
  ONLINE_TOURNAMENT_CASH_PRIZE_POOL,
  ONLINE_TOURNAMENT_EVENT_DATES,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_GAME_LIST_LABEL,
  ONLINE_TOURNAMENT_PUBLIC_PATH,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  ONLINE_TOURNAMENT_SLUG,
  ONLINE_TOURNAMENT_STREAM_CHANNEL,
  ONLINE_TOURNAMENT_TITLE,
  ONLINE_TOURNAMENT_YOUTUBE_URL,
  formatEatDateTime,
  getOnlineTournamentDisplayStatus,
  getOnlineTournamentWindowState,
  type OnlineTournamentGameKey,
} from '@/lib/online-tournament';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type RegistrationRow = {
  game: OnlineTournamentGameKey | string | null;
  eligibility_status: string | null;
  check_in_status: string | null;
};

type GameDeskRow = {
  key: OnlineTournamentGameKey;
  label: string;
  time: string;
  registered: number;
  verified: number;
  pending: number;
  checkedIn: number;
  slots: number;
  spotsLeft: number;
};

type EphremDeskData = {
  eventStatus: string;
  registered: number;
  verified: number;
  pendingReview: number;
  checkedIn: number;
  slots: number;
  spotsLeft: number;
  activeTournaments: number;
  pendingTournaments: number;
  pendingPayouts: number;
  gameRows: GameDeskRow[];
  dataIssue: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatEventStatus() {
  const status = getOnlineTournamentDisplayStatus();

  switch (status) {
    case 'open':
      return 'Registration open';
    case 'active':
      return 'Event active';
    case 'completed':
      return 'Event completed';
    default:
      return 'Event status';
  }
}

function buildGameRows(registrations: RegistrationRow[]): GameDeskRow[] {
  return ONLINE_TOURNAMENT_GAMES.map((game) => {
    const rows = registrations.filter(
      (registration) =>
        registration.game === game.game && registration.eligibility_status !== 'disqualified'
    );
    const verified = rows.filter(
      (registration) => registration.eligibility_status === 'verified'
    ).length;
    const pending = rows.filter(
      (registration) => registration.eligibility_status === 'pending'
    ).length;
    const checkedIn = rows.filter(
      (registration) => registration.check_in_status === 'checked_in'
    ).length;

    return {
      key: game.game,
      label: game.label,
      time: `${game.dateLabel}, ${game.timeLabel}`,
      registered: rows.length,
      verified,
      pending,
      checkedIn,
      slots: game.slots,
      spotsLeft: Math.max(0, game.slots - rows.length),
    };
  });
}

function buildDeskData(registrations: RegistrationRow[] = []): EphremDeskData {
  const gameRows = buildGameRows(registrations);

  return {
    eventStatus: formatEventStatus(),
    registered: gameRows.reduce((total, game) => total + game.registered, 0),
    verified: gameRows.reduce((total, game) => total + game.verified, 0),
    pendingReview: gameRows.reduce((total, game) => total + game.pending, 0),
    checkedIn: gameRows.reduce((total, game) => total + game.checkedIn, 0),
    slots: gameRows.reduce((total, game) => total + game.slots, 0),
    spotsLeft: gameRows.reduce((total, game) => total + game.spotsLeft, 0),
    activeTournaments: 0,
    pendingTournaments: 0,
    pendingPayouts: 0,
    gameRows,
    dataIssue: false,
  };
}

async function getEphremDeskData(): Promise<EphremDeskData> {
  const supabase = createServiceClient();
  const hideE2EFixtures = shouldHideE2EFixtures();

  const tournamentCountQuery = (filters: {
    status?: string;
    approvalStatus?: string;
    payoutStatus?: string;
  }) => {
    let query = supabase.from('tournaments').select('id', { count: 'exact', head: true });

    if (hideE2EFixtures) {
      query = query.not('title', 'ilike', '%e2e%').not('slug', 'ilike', '%e2e%');
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.approvalStatus) {
      query = query.eq('approval_status', filters.approvalStatus);
    }

    if (filters.payoutStatus) {
      query = query.eq('payout_status', filters.payoutStatus);
    }

    return query;
  };

  try {
    const [
      registrationsResult,
      { count: activeTournaments },
      { count: pendingTournaments },
      { count: pendingPayouts },
    ] = await Promise.all([
      supabase
        .from('online_tournament_registrations')
        .select('game, eligibility_status, check_in_status')
        .eq('event_slug', ONLINE_TOURNAMENT_SLUG),
      tournamentCountQuery({ status: 'active' }),
      tournamentCountQuery({ approvalStatus: 'pending' }),
      tournamentCountQuery({ payoutStatus: 'pending' }),
    ]);

    if (registrationsResult.error) {
      throw registrationsResult.error;
    }

    return {
      ...buildDeskData((registrationsResult.data ?? []) as RegistrationRow[]),
      activeTournaments: activeTournaments ?? 0,
      pendingTournaments: pendingTournaments ?? 0,
      pendingPayouts: pendingPayouts ?? 0,
    };
  } catch (error) {
    console.error('[AdminEphremDesk] Could not load live dashboard data:', error);
    return {
      ...buildDeskData(),
      dataIssue: true,
    };
  }
}

function getNextGame() {
  const now = new Date();
  return (
    ONLINE_TOURNAMENT_GAMES.find((game) => getOnlineTournamentWindowState(game, now).startsAt >= now) ??
    ONLINE_TOURNAMENT_GAMES[ONLINE_TOURNAMENT_GAMES.length - 1]
  );
}

export default async function AdminEphremDeskPage() {
  const data = await getEphremDeskData();
  const nextGame = getNextGame();
  const nextGameTime = nextGame ? formatEatDateTime(nextGame.matchStartsAt) : ONLINE_TOURNAMENT_EVENT_DATES;
  const completionRate = data.slots > 0 ? Math.round((data.registered / data.slots) * 100) : 0;

  const metrics = [
    {
      label: 'Registered',
      value: data.registered.toLocaleString(),
      detail: `${data.spotsLeft.toLocaleString()} slots left`,
      icon: Users,
    },
    {
      label: 'Reward checks',
      value: data.verified.toLocaleString(),
      detail: `${data.pendingReview.toLocaleString()} pending`,
      icon: ShieldCheck,
    },
    {
      label: 'Check-ins',
      value: data.checkedIn.toLocaleString(),
      detail: `${completionRate}% filled`,
      icon: CheckCircle2,
    },
    {
      label: 'Bracket alerts',
      value: (data.activeTournaments + data.pendingTournaments + data.pendingPayouts).toLocaleString(),
      detail: `${data.activeTournaments} live, ${data.pendingTournaments} approval, ${data.pendingPayouts} payout`,
      icon: Trophy,
    },
  ];

  const lanes = [
    {
      title: 'Registration review',
      detail: 'Verify social proof, eligibility, duplicate entries, and admin notes.',
      href: '/admin/online-tournament',
      action: 'Open player list',
      icon: ClipboardList,
    },
    {
      title: 'Tournament control',
      detail: 'Approve brackets, watch live events, and clear payout blockers.',
      href: '/admin/tournaments',
      action: 'Open tournaments',
      icon: Trophy,
    },
    {
      title: 'Player support',
      detail: 'Handle stuck registrations, room questions, disputes, and account issues.',
      href: '/admin/support',
      action: 'Open inbox',
      icon: Headset,
    },
    {
      title: 'Public tournament page',
      detail: 'Check the player-facing flow for schedule, prizes, registration, and stream links.',
      href: ONLINE_TOURNAMENT_PUBLIC_PATH,
      action: 'View public page',
      icon: ExternalLink,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="card overflow-hidden p-0">
        <div className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Ephrem tournament desk</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Individual tournament dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              {ONLINE_TOURNAMENT_TITLE} runs {ONLINE_TOURNAMENT_EVENT_DATES} for{' '}
              {ONLINE_TOURNAMENT_GAME_LIST_LABEL}. Prize pool: {formatMoney(ONLINE_TOURNAMENT_CASH_PRIZE_POOL)}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/online-tournament" className="btn-primary min-h-10 px-3 py-2 text-xs">
              <ClipboardList size={14} />
              Registrations
            </Link>
            <Link href={ONLINE_TOURNAMENT_REGISTRATION_PATH} className="btn-outline min-h-10 px-3 py-2 text-xs">
              <ExternalLink size={14} />
              Register page
            </Link>
          </div>
        </div>

        <div className="grid border-t border-[var(--border-color)] sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={`px-5 py-4 ${index > 0 ? 'border-t border-[var(--border-color)] sm:border-t-0 sm:border-l' : ''} ${index === 2 ? 'sm:border-l-0 xl:border-l' : ''}`}
              >
                <div className="flex items-center gap-2 text-[var(--text-soft)]">
                  <Icon size={15} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]">{metric.label}</p>
                </div>
                <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{metric.value}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{metric.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="grid border-t border-[var(--border-color)] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[var(--accent-secondary-text)]">
              <RadioTower size={16} />
              <p className="text-xs font-black uppercase tracking-[0.16em]">{data.eventStatus}</p>
            </div>
            <h2 className="mt-3 text-xl font-black text-[var(--text-primary)]">
              {nextGame?.label ?? 'Event schedule'} is next
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p className="flex items-start gap-2">
                <CalendarDays size={15} className="mt-1 shrink-0 text-[var(--text-soft)]" />
                <span>{nextGameTime}</span>
              </p>
              <p className="flex items-start gap-2">
                <MessageCircle size={15} className="mt-1 shrink-0 text-[var(--text-soft)]" />
                <span>Stream channel: {ONLINE_TOURNAMENT_STREAM_CHANNEL}</span>
              </p>
            </div>
            {data.dataIssue ? (
              <p className="mt-4 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                Live counts are unavailable; the desk is showing fallback slots.
              </p>
            ) : null}
          </div>

          <div className="border-t border-[var(--border-color)] p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <p className="section-title !mb-0">Game slots</p>
              <span className="text-xs font-bold text-[var(--text-soft)]">
                {data.registered}/{data.slots}
              </span>
            </div>

            <div className="mt-4 divide-y divide-[var(--border-color)]">
              {data.gameRows.map((game) => (
                <div key={game.key} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">{game.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{game.time}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-right text-xs">
                    <div>
                      <p className="font-black text-[var(--text-primary)]">{game.registered}</p>
                      <p className="text-[var(--text-soft)]">in</p>
                    </div>
                    <div>
                      <p className="font-black text-[var(--brand-teal)]">{game.verified}</p>
                      <p className="text-[var(--text-soft)]">ok</p>
                    </div>
                    <div>
                      <p className="font-black text-amber-300">{game.pending}</p>
                      <p className="text-[var(--text-soft)]">review</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-title">Main lanes</p>
            <h2 className="text-xl font-black text-[var(--text-primary)]">What Ephrem needs most</h2>
          </div>
          <a
            href={ONLINE_TOURNAMENT_YOUTUBE_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost min-h-10 px-3 py-2 text-xs"
          >
            <RadioTower size={14} />
            Stream channel
          </a>
        </div>

        <div className="mt-4 divide-y divide-[var(--border-color)]">
          {lanes.map((lane) => {
            const Icon = lane.icon;
            return (
              <div key={lane.title} className="grid gap-3 py-4 md:grid-cols-[2rem_1fr_auto] md:items-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] bg-white/[0.03] text-[var(--text-secondary)]">
                  <Icon size={15} />
                </span>
                <div>
                  <p className="text-sm font-black text-[var(--text-primary)]">{lane.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{lane.detail}</p>
                </div>
                <Link href={lane.href} className="btn-outline min-h-10 justify-center px-3 py-2 text-xs">
                  {lane.action}
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
