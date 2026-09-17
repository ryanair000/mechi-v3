'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  Gamepad2,
  Play,
  RefreshCw,
  Scale,
  ShieldCheck,
  Trophy,
  Users,
  WalletCards,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import { cn } from '@/lib/utils';
import type {
  TournamentControlParticipant,
  TournamentControlResponse,
  TournamentControlTab,
} from '@/lib/tournament-control';

type ControlApiError = { error?: string };

const TABS: Array<{
  id: TournamentControlTab;
  label: string;
  icon: typeof Trophy;
}> = [
  { id: 'overview', label: 'Overview', icon: Trophy },
  { id: 'participants', label: 'Participants', icon: Users },
  { id: 'finance', label: 'Finance', icon: WalletCards },
  { id: 'disputes', label: 'Disputes', icon: Scale },
];

const currencyFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('en-KE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Africa/Nairobi',
});

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
function formatDate(value: string | null) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not scheduled' : dateFormatter.format(date);
}

function statusTone(status: string) {
  if (['paid', 'free', 'checked_in', 'completed', 'approved', 'released'].includes(status)) {
    return 'border-[rgba(50,224,196,0.24)] bg-[var(--success-soft)] text-[var(--accent-secondary-text)]';
  }
  if (['failed', 'refunded', 'cancelled', 'rejected', 'disputed'].includes(status)) {
    return 'border-[rgba(239,68,68,0.24)] bg-[var(--danger-soft)] text-[#fca5a5]';
  }
  if (['active', 'full', 'processing'].includes(status)) {
    return 'border-[rgba(96,165,250,0.24)] bg-[rgba(96,165,250,0.14)] text-[#93c5fd]';
  }
  return 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        statusTone(status)
      )}
    >
      {formatLabel(status)}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="card min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {value}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary)]">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">{hint}</p>
    </article>
  );
}

function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const progress = Math.min(100, Math.round((value / Math.max(total, 1)) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[var(--text-secondary)]">{label}</span>
        <span className="font-semibold text-[var(--text-primary)]">
          {value}/{total}
        </span>
      </div>
      <div
        aria-label={`${label}: ${progress}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-elevated)]"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[var(--accent-secondary)] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function OverviewPanel({ data }: { data: TournamentControlResponse }) {
  const { metrics, tournament } = data;
  const isReady = data.start.canStart;
  const matchProgress = metrics.matches.total
    ? `${metrics.matches.completed}/${metrics.matches.total}`
    : 'Not generated';

  return (
    <div className="space-y-4 sm:space-y-6">
      <section
        className={cn(
          'card flex flex-col gap-4 border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6',
          isReady
            ? 'border-[rgba(50,224,196,0.25)]'
            : 'border-[rgba(251,191,36,0.24)]'
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-2xl',
              isReady
                ? 'bg-[var(--success-soft)] text-[var(--accent-secondary)]'
                : 'bg-[var(--warning-soft)] text-amber-300'
            )}
          >
            {isReady ? (
              <CheckCircle2 aria-hidden="true" className="size-5" />
            ) : (
              <Clock3 aria-hidden="true" className="size-5" />
            )}
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
              {isReady ? 'Ready to start' : 'Tournament setup in progress'}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {isReady
                ? 'All start requirements are satisfied. Starting will seed confirmed players and generate the bracket.'
                : data.start.blockers[0] ?? 'Review the tournament requirements before starting.'}
            </p>
          </div>
        </div>
        <StatusBadge status={tournament.status} />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          hint={`${Math.max(0, tournament.size - metrics.activePlayers)} slots remaining`}
          icon={Users}
          label="Player slots"
          value={`${metrics.activePlayers}/${tournament.size}`}
        />
        <MetricCard
          hint="Paid or free entries"
          icon={ShieldCheck}
          label="Confirmed"
          value={String(metrics.confirmedPlayers)}
        />
        <MetricCard
          hint="Confirmed players ready"
          icon={Check}
          label="Checked in"
          value={String(metrics.checkedInPlayers)}
        />
        <MetricCard
          hint="Completed bracket matches"
          icon={Gamepad2}
          label="Match progress"
          value={matchProgress}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <article className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
                Readiness
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">Start checklist</h2>
            </div>
            <CalendarClock aria-hidden="true" className="size-5 text-[var(--text-soft)]" />
          </div>

          <div className="mt-6 space-y-5">
            <ProgressBar
              label="Confirmed players"
              total={tournament.size}
              value={metrics.confirmedPlayers}
            />
            <ProgressBar
              label="Checked-in players"
              total={metrics.confirmedPlayers}
              value={metrics.checkedInPlayers}
            />
          </div>

          <ul className="mt-6 space-y-2" aria-label="Tournament start requirements">
            {(data.start.blockers.length > 0
              ? data.start.blockers
              : ['All requirements are complete.']
            ).map((blocker) => (
              <li
                className="flex items-start gap-2 rounded-2xl bg-[var(--surface-elevated)] px-3.5 py-3 text-sm text-[var(--text-secondary)]"
                key={blocker}
              >
                {data.start.blockers.length > 0 ? (
                  <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-300" />
                ) : (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-[var(--accent-secondary)]"
                  />
                )}
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
            Live operations
          </p>
          <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">Match health</h2>
          <dl className="mt-5 divide-y divide-[var(--border-color)]">
            {[
              ['Pending', metrics.matches.pending],
              ['In progress', metrics.matches.active],
              ['Completed', metrics.matches.completed],
              ['Open disputes', metrics.openDisputes],
            ].map(([label, value]) => (
              <div className="flex items-center justify-between gap-3 py-3" key={String(label)}>
                <dt className="text-sm text-[var(--text-secondary)]">{label}</dt>
                <dd className="text-sm font-bold text-[var(--text-primary)]">{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>
    </div>
  );
}

function ParticipantCard({ participant }: { participant: TournamentControlParticipant }) {
  return (
    <article className={cn('card p-4', !participant.isActive && 'opacity-65')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--text-primary)]">{participant.username}</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">
            Joined {formatDate(participant.joinedAt)}
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-elevated)] text-sm font-bold text-[var(--text-secondary)]">
          {participant.seed ? `#${participant.seed}` : '—'}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge status={participant.paymentStatus} />
        <StatusBadge status={participant.checkInStatus} />
      </div>
    </article>
  );
}

function ParticipantsPanel({ data }: { data: TournamentControlResponse }) {
  const activeParticipants = data.participants.filter((participant) => participant.isActive);
  const historicalParticipants = data.participants.filter((participant) => !participant.isActive);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          hint={`${data.tournament.size} total capacity`}
          icon={Users}
          label="Active entries"
          value={String(data.metrics.activePlayers)}
        />
        <MetricCard
          hint="Eligible for bracket seeding"
          icon={ShieldCheck}
          label="Confirmed"
          value={String(data.metrics.confirmedPlayers)}
        />
        <MetricCard
          hint="Ready for match day"
          icon={CheckCircle2}
          label="Checked in"
          value={String(data.metrics.checkedInPlayers)}
        />
        <MetricCard
          hint="Awaiting Paystack confirmation"
          icon={Clock3}
          label="Pending payment"
          value={String(data.metrics.pendingPayments)}
        />
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[var(--border-color)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Participant roster</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Payment and check-in states are read directly from tournament records.
            </p>
          </div>
          <span className="text-sm font-semibold text-[var(--text-secondary)]">
            {activeParticipants.length} active
          </span>
        </div>

        {activeParticipants.length === 0 ? (
          <div className="px-5 py-14 text-center sm:px-6">
            <Users aria-hidden="true" className="mx-auto size-8 text-[var(--text-soft)]" />
            <h3 className="mt-3 font-semibold text-[var(--text-primary)]">No participants yet</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Confirmed registrations will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 sm:hidden">
              {activeParticipants.map((participant) => (
                <ParticipantCard key={participant.id} participant={participant} />
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[720px] text-left">
                <thead className="bg-[var(--surface-elevated)] text-xs uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Player</th>
                    <th className="px-4 py-3.5 font-semibold">Seed</th>
                    <th className="px-4 py-3.5 font-semibold">Payment</th>
                    <th className="px-4 py-3.5 font-semibold">Check-in</th>
                    <th className="px-6 py-3.5 text-right font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {activeParticipants.map((participant) => (
                    <tr className="text-sm" key={participant.id}>
                      <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">
                        {participant.username}
                      </td>
                      <td className="px-4 py-4 text-[var(--text-secondary)]">
                        {participant.seed ? `#${participant.seed}` : 'Not seeded'}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={participant.paymentStatus} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={participant.checkInStatus} />
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--text-secondary)]">
                        {formatDate(participant.joinedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {historicalParticipants.length > 0 ? (
        <details className="card p-5 sm:p-6">
          <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">
            Failed or refunded entries ({historicalParticipants.length})
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {historicalParticipants.map((participant) => (
              <ParticipantCard key={participant.id} participant={participant} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function FinancePanel({ data }: { data: TournamentControlResponse }) {
  const isFreeTournament = data.finance.entryFee === 0 && data.finance.prizePool === 0;
  const hasInvalidFreePrize = data.finance.entryFee === 0 && data.finance.prizePool > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          hint={`${data.finance.paidEntries} paid entries confirmed`}
          icon={Banknote}
          label="Gross collected"
          value={currencyFormatter.format(data.finance.gross)}
        />
        <MetricCard
          hint="Competition prize allocation"
          icon={Trophy}
          label="Prize pool"
          value={currencyFormatter.format(data.finance.prizePool)}
        />
        <MetricCard
          hint="Calculated from confirmed payments"
          icon={WalletCards}
          label="Platform fee"
          value={currencyFormatter.format(data.finance.platformFee)}
        />
        <MetricCard
          hint="Released after results are verified"
          icon={ShieldCheck}
          label="Payout"
          value={formatLabel(data.finance.payoutStatus)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <article className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
                Payment ledger
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                Entry payment status
              </h2>
            </div>
            <StatusBadge status={data.finance.payoutStatus} />
          </div>

          {isFreeTournament ? (
            <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
              <p className="font-semibold text-[var(--text-primary)]">Free tournament</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                This tournament has no entry charge, cash prize, or organizer payout.
              </p>
            </div>
          ) : hasInvalidFreePrize ? (
            <div className="mt-5 rounded-2xl border border-[rgba(251,191,36,0.24)] bg-[var(--warning-soft)] p-4">
              <p className="font-semibold text-[var(--text-primary)]">Configuration needs review</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                A free tournament cannot contain a cash prize. Starting is blocked until this is
                corrected by Mechi.
              </p>
            </div>
          ) : (
            <dl className="mt-5 divide-y divide-[var(--border-color)]">
              {[
                ['Paid', data.finance.paymentBreakdown.paid ?? 0],
                ['Pending', data.finance.paymentBreakdown.pending ?? 0],
                ['Failed', data.finance.paymentBreakdown.failed ?? 0],
                ['Refunded', data.finance.paymentBreakdown.refunded ?? 0],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between gap-3 py-3.5" key={String(label)}>
                  <dt className="text-sm text-[var(--text-secondary)]">{label}</dt>
                  <dd className="text-sm font-bold text-[var(--text-primary)]">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </article>

        <article className="card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
            Payout safety
          </p>
          <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">How funds move</h2>
          <ol className="mt-5 space-y-4">
            {[
              ['Payments confirmed', 'Paystack-confirmed entries are included in the ledger.'],
              ['Results verified', 'Tournament completion and disputes are reviewed.'],
              ['Payout released', 'Mechi releases eligible prize funds after verification.'],
            ].map(([title, description], index) => (
              <li className="flex gap-3" key={title}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-secondary-soft)] text-xs font-bold text-[var(--accent-secondary-text)]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                  <p className="mt-0.5 text-sm leading-5 text-[var(--text-secondary)]">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}

function DisputesPanel({ data }: { data: TournamentControlResponse }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <article className="card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--warning-soft)] text-amber-300">
            <Scale aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
              Fair play
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Dispute overview</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Organizers can monitor dispute volume, while evidence review and final resolution stay
              with Mechi moderators to protect tournament credibility.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-center sm:p-8">
          <p className="text-4xl font-bold text-[var(--text-primary)]">{data.metrics.openDisputes}</p>
          <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">Open disputes</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[var(--text-soft)]">
            This number updates from live match escalation records. Participant details and evidence
            are restricted to the moderation workflow.
          </p>
        </div>
      </article>

      <aside className="card p-5 sm:p-6">
        <ShieldCheck aria-hidden="true" className="size-6 text-[var(--accent-secondary)]" />
        <h2 className="mt-4 text-lg font-bold text-[var(--text-primary)]">Resolution access</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {data.viewer.isModerator
            ? 'Your moderator account can continue to the protected tournament review area.'
            : 'A Mechi moderator reviews evidence, resolves the case, and records the decision.'}
        </p>
        {data.viewer.isModerator ? (
          <Link
            className="btn-outline mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 px-4"
            href="/admin/tournaments"
          >
            Open moderation
            <Eye aria-hidden="true" className="size-4" />
          </Link>
        ) : null}
      </aside>
    </section>
  );
}

function ControlSkeleton() {
  return (
    <div className="page-container" aria-busy="true" aria-label="Loading tournament controls">
      <div className="animate-pulse space-y-5">
        <div className="h-5 w-36 rounded-full bg-[var(--surface-elevated)]" />
        <div className="h-20 rounded-3xl bg-[var(--surface-elevated)]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div className="h-32 rounded-3xl bg-[var(--surface-elevated)]" key={item} />
          ))}
        </div>
        <div className="h-72 rounded-3xl bg-[var(--surface-elevated)]" />
      </div>
    </div>
  );
}

export function TournamentControlClient({ slug }: { slug: string }) {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<TournamentControlResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TournamentControlTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadControlData = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);

      try {
        const response = await authFetch(`/api/tournaments/${encodeURIComponent(slug)}/control`);
        const payload = (await response.json()) as TournamentControlResponse | ControlApiError;
        if (!response.ok) {
          throw new Error('error' in payload ? payload.error ?? 'Could not load tournament controls' : 'Could not load tournament controls');
        }

        setData(payload as TournamentControlResponse);
        setError(null);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Could not load tournament controls';
        setError(message);
        if (quiet) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authFetch, slug]
  );

  useEffect(() => {
    void loadControlData();
  }, [loadControlData]);

  const pageDescription = data
    ? `${formatLabel(data.tournament.game)} · ${formatLabel(data.tournament.platform)} · ${
        data.tournament.region
      }`
    : '';

  const startTournament = async () => {
    if (!data?.start.canStart || starting) return;
    setStarting(true);
    try {
      const response = await authFetch(`/api/tournaments/${encodeURIComponent(slug)}/start`, {
        method: 'POST',
      });
      const payload = (await response.json()) as ControlApiError;
      if (!response.ok) {
        throw new Error(payload.error ?? 'Could not start tournament');
      }
      toast.success('Tournament started and bracket generated');
      await loadControlData(true);
    } catch (startError) {
      toast.error(startError instanceof Error ? startError.message : 'Could not start tournament');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <ControlSkeleton />;
  }

  if (!data || error) {
    return (
      <div className="page-container">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          href={`/t/${slug}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to tournament
        </Link>
        <section className="card mt-6 px-5 py-12 text-center sm:px-8">
          <CircleAlert aria-hidden="true" className="mx-auto size-9 text-[var(--accent-primary)]" />
          <h1 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
            Tournament controls unavailable
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
            {error ?? 'Could not load this tournament.'}
          </p>
          <button
            className="btn-outline mt-5 min-h-11 px-5"
            onClick={() => void loadControlData()}
            type="button"
          >
            Try again
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="pb-5 pt-1 sm:pb-6 sm:pt-3">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          href={`/t/${data.tournament.slug}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to tournament
        </Link>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-secondary-text)]">
                Tournament control
              </p>
              {!data.viewer.isOrganizer ? <StatusBadge status="Moderator view" /> : null}
              {data.tournament.entryFee > 0 ? (
                <StatusBadge status={data.tournament.approvalStatus} />
              ) : null}
            </div>
            <h1 className="font-display mt-2 truncate text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {data.tournament.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <Gamepad2 aria-hidden="true" className="size-4 text-[var(--text-soft)]" />
                {pageDescription}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock aria-hidden="true" className="size-4 text-[var(--text-soft)]" />
                {formatDate(data.tournament.scheduledFor)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              aria-label="Refresh tournament data"
              className="btn-outline inline-flex min-h-11 items-center justify-center gap-2 px-4"
              disabled={refreshing}
              onClick={() => void loadControlData(true)}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={cn('size-4', refreshing && 'animate-spin')}
              />
              Refresh
            </button>
            <Link
              className="btn-outline inline-flex min-h-11 items-center justify-center gap-2 px-4"
              href={`/t/${data.tournament.slug}`}
            >
              <Eye aria-hidden="true" className="size-4" />
              Public page
            </Link>
            {data.viewer.isOrganizer && !['active', 'completed'].includes(data.tournament.status) ? (
              <button
                className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5"
                disabled={!data.start.canStart || starting}
                onClick={() => void startTournament()}
                title={data.start.blockers[0] ?? 'Start tournament'}
                type="button"
              >
                <Play aria-hidden="true" className="size-4" />
                {starting ? 'Starting…' : 'Start tournament'}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <nav
        aria-label="Tournament control sections"
        className="mb-5 overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] p-1.5 sm:mb-6"
      >
        <div className="flex min-w-max gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            const count =
              tab.id === 'participants'
                ? data.metrics.activePlayers
                : tab.id === 'disputes'
                  ? data.metrics.openDisputes
                  : null;
            return (
              <button
                aria-pressed={selected}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors sm:px-4',
                  selected
                    ? 'bg-[var(--surface-strong)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
                )}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon aria-hidden="true" className="size-4" />
                {tab.label}
                {count !== null ? (
                  <span className="rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-xs">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      <section aria-label={`${formatLabel(activeTab)} controls`}>
        {activeTab === 'overview' ? <OverviewPanel data={data} /> : null}
        {activeTab === 'participants' ? <ParticipantsPanel data={data} /> : null}
        {activeTab === 'finance' ? <FinancePanel data={data} /> : null}
        {activeTab === 'disputes' ? <DisputesPanel data={data} /> : null}
      </section>
    </div>
  );
}
