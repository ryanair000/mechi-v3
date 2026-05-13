'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import { EventCountdownCard } from '@/components/ui/event-countdown-card';
import {
  TournamentMemberList,
  type TournamentMemberListItem,
} from '@/components/ui/tournament-member-list';
import {
  ONLINE_TOURNAMENT_CASH_PRIZE_POOL,
  ONLINE_TOURNAMENT_ARENA_PATH,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_REGISTRATION_API_PATH,
  ONLINE_TOURNAMENT_REGISTRATION_PATH,
  ONLINE_TOURNAMENT_TITLE,
  ONLINE_TOURNAMENT_WHATSAPP_GROUP_URL,
  getFallbackOnlineTournamentSummary,
  getOnlineTournamentDisplayStatus,
  getOnlineTournamentTotals,
  type OnlineTournamentDisplayStatus,
  type OnlineTournamentGameConfig,
  type OnlineTournamentRegistrationSummary,
} from '@/lib/online-tournament';
import { getOnlineTournamentArenaHref } from '@/lib/online-tournament-ops';
import {
  PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT,
  WEEKEND_CUP_ROUTE_ENABLED,
} from '@/lib/upcoming-playmechi-tournaments';

type OnlineTournamentUserRegistration = {
  game?: string | null;
  in_game_username?: string | null;
};

const STATUS_FILTERS = ['all', 'open', 'active', 'completed'] as const;

function formatTournamentStatus(status: string) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'full':
      return 'Ongoing';
    case 'active':
      return 'Live';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function formatTournamentFilterLabel(status: (typeof STATUS_FILTERS)[number]) {
  switch (status) {
    case 'all':
      return 'All';
    case 'open':
      return 'Open';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    default:
      return status;
  }
}

function getEmptyStateTitle(status: (typeof STATUS_FILTERS)[number]) {
  if (status === 'all') {
    return 'No brackets yet';
  }

  return `No ${formatTournamentFilterLabel(status).toLowerCase()} brackets yet`;
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'open':
      return 'bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)] border-[rgba(50,224,196,0.2)]';
    case 'active':
      return 'bg-[rgba(96,165,250,0.14)] text-[#93c5fd] border-[rgba(96,165,250,0.2)]';
    case 'full':
      return 'bg-[rgba(255,107,107,0.12)] text-[#ff9a9a] border-[rgba(255,107,107,0.2)]';
    default:
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border-color)]';
  }
}

export default function TournamentsPage() {
  const authFetch = useAuthFetch();
  const [onlineTournament, setOnlineTournament] = useState<OnlineTournamentRegistrationSummary>(
    () => getFallbackOnlineTournamentSummary()
  );
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [loading, setLoading] = useState(true);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const onlineTournamentRes = await authFetch(ONLINE_TOURNAMENT_REGISTRATION_API_PATH);
      if (onlineTournamentRes.ok) {
        const onlineTournamentData =
          (await onlineTournamentRes.json()) as OnlineTournamentRegistrationSummary;
        setOnlineTournament(onlineTournamentData);
      } else {
        setOnlineTournament(getFallbackOnlineTournamentSummary());
      }
    } catch {
      toast.error('Could not load tournaments');
      setOnlineTournament(getFallbackOnlineTournamentSummary());
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  const onlineTournamentStatus = getOnlineTournamentDisplayStatus();
  const showOnlineTournament =
    status === 'all' || status === onlineTournamentStatus;
  const showUpcomingWeekendCup =
    WEEKEND_CUP_ROUTE_ENABLED &&
    PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT &&
    (status === 'all' || status === 'open');
  const hasVisibleTournaments = showOnlineTournament || Boolean(showUpcomingWeekendCup);
  const onlineTournamentTotals = getOnlineTournamentTotals(onlineTournament);
  const firstOnlineTournamentRegistration = getFirstOnlineTournamentRegistration(onlineTournament);
  const onlineTournamentItems: TournamentMemberListItem[] = showOnlineTournament
    ? ONLINE_TOURNAMENT_GAMES.map((game) => {
        const gameSummary = onlineTournament.games[game.game];
        const registered = Number(gameSummary?.registered ?? 0);
        const slots = Number(gameSummary?.slots ?? game.slots);
        const progress = Math.min(100, (registered / Math.max(1, slots)) * 100);
        const userRegistration = getOnlineTournamentRegistration(onlineTournament, game.game);
        const action = getOnlineTournamentAction(game, onlineTournamentStatus, userRegistration);

        return {
          actionHref: action.href,
          actionLabel: action.label,
          actionVariant: userRegistration ? 'muted' : 'primary',
          anchorId: `playmechi-${game.game}`,
          detailHref: getOnlineTournamentArenaHref(game.game),
          gameLabel: game.label,
          id: `playmechi-${game.game}`,
          metaLabel: 'Free entry',
          prizeLabel: getOnlineTournamentGamePrizeLabel(game),
          progress,
          registeredLabel: userRegistration?.in_game_username
            ? `Registered as ${userRegistration.in_game_username}`
            : null,
          secondaryActionExternal: true,
          secondaryActionHref: ONLINE_TOURNAMENT_WHATSAPP_GROUP_URL,
          secondaryActionLabel: 'WhatsApp',
          slotsLabel: `${registered}/${slots}`,
          startsLabel: `${game.dateLabel.replace(' 2026', '')}, ${game.timeLabel}`,
          statusClassName: getStatusClasses(onlineTournamentStatus),
          statusLabel: formatTournamentStatus(onlineTournamentStatus),
          tagLabel: null,
          title: ONLINE_TOURNAMENT_TITLE,
        };
      })
    : [];
  const tournamentListItems = onlineTournamentItems;

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Tournaments</p>
            <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              PlayMechi competitions
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Official PlayMechi events only: the current tournament flow and Weekend Cup.
            </p>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item}
            onClick={() => setStatus(item)}
            className={`flex-shrink-0 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all ${
              status === item
                ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
            }`}
          >
            {formatTournamentFilterLabel(item)}
          </button>
        ))}
      </div>

      {showOnlineTournament ? (
        <EventCountdownCard
          attendees={onlineTournamentTotals.registered}
          date={new Date(ONLINE_TOURNAMENT_GAMES[0].matchStartsAt)}
          ctaLabel={firstOnlineTournamentRegistration ? 'View your slot' : 'Reserve your spot'}
          href={
            firstOnlineTournamentRegistration?.game
              ? getOnlineTournamentArenaHref(firstOnlineTournamentRegistration.game)
              : `${ONLINE_TOURNAMENT_REGISTRATION_PATH}?game=${ONLINE_TOURNAMENT_GAMES[0].game}`
          }
          title={ONLINE_TOURNAMENT_TITLE}
        />
      ) : null}

      {showUpcomingWeekendCup ? (
        <section className="card circuit-panel p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="section-title">Next Up</p>
              <h2 className="mt-3 text-2xl font-black leading-tight text-[var(--text-primary)] sm:text-3xl">
                {PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT.heroLabel} {PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT.prizePoolLabel}.{' '}
                {PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT.pricingLabel}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT.confirmationLabel}
              </p>
            </div>

            <Link
              href={PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT.publicPath}
              className="btn-primary w-full justify-center sm:w-auto"
            >
              Open Weekend Cup
            </Link>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT.games.map((game) => (
              <div
                key={game.key}
                className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-[var(--text-primary)]">{game.label}</p>
                  <span className="brand-chip px-2.5 py-1">{game.slots} slots</span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">{game.dateLabel}</p>
                <p className="mt-3 text-xs font-semibold text-[var(--accent-secondary-text)]">
                  {game.prizes.join(' | ')}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="card overflow-hidden">
          <div className="space-y-0">
            {[1, 2, 3, 4].map((item, index) => (
              <div
                key={item}
                className={`px-4 py-4 ${index < 3 ? 'border-b border-[var(--border-color)]' : ''}`}
              >
                <div className="h-16 shimmer rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : !hasVisibleTournaments ? (
        <div className="card py-16 text-center">
          <Trophy size={36} className="mx-auto mb-4 text-[var(--text-soft)] opacity-50" />
          <p className="font-black text-[var(--text-primary)]">
            {getEmptyStateTitle(status)}
          </p>
          <p className="mt-2 text-sm text-[var(--text-soft)]">Start one and bring your scene in.</p>
          <Link href={PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT.publicPath} className="btn-primary mt-5 inline-flex">
            Weekend Cup
          </Link>
        </div>
      ) : (
        <TournamentMemberList items={tournamentListItems} emptyLabel={getEmptyStateTitle(status)} />
      )}
    </div>
  );
}

function getOnlineTournamentPrizeLabel() {
  return `KSh ${ONLINE_TOURNAMENT_CASH_PRIZE_POOL.toLocaleString('en-KE')}`;
}

function getOnlineTournamentGamePrizeLabel(game: OnlineTournamentGameConfig) {
  const cashTotal = [game.firstPrize, game.secondPrize, game.thirdPrize].reduce((total, prize) => {
    if (!prize) {
      return total;
    }

    const match = prize.match(/^KSh\s+([\d,]+)/i);
    return match ? total + Number(match[1].replace(/,/g, '')) : total;
  }, 0);

  return cashTotal > 0 ? `KSh ${cashTotal.toLocaleString('en-KE')}` : getOnlineTournamentPrizeLabel();
}

function getOnlineTournamentRegistration(
  summary: OnlineTournamentRegistrationSummary,
  gameKey: string
) {
  const registrations = Array.isArray(summary.registrations)
    ? (summary.registrations as OnlineTournamentUserRegistration[])
    : [];

  return registrations.find((registration) => registration.game === gameKey) ?? null;
}

function getFirstOnlineTournamentRegistration(summary: OnlineTournamentRegistrationSummary) {
  const registrations = Array.isArray(summary.registrations)
    ? (summary.registrations as OnlineTournamentUserRegistration[])
    : [];

  return registrations.find((registration) => Boolean(registration.game)) ?? null;
}

function getOnlineTournamentAction(
  game: OnlineTournamentGameConfig,
  status: OnlineTournamentDisplayStatus,
  registration: OnlineTournamentUserRegistration | null
) {
  if (registration) {
    return {
      href: getOnlineTournamentArenaHref(game.game),
      label: 'View',
      mobileLabel: 'View',
    };
  }

  if (status === 'open') {
    return {
      href: `${ONLINE_TOURNAMENT_REGISTRATION_PATH}?game=${game.game}`,
      label: 'Register',
      mobileLabel: 'Register free',
    };
  }

  return {
    href: ONLINE_TOURNAMENT_ARENA_PATH,
    label: 'View',
    mobileLabel: 'View event',
  };
}
