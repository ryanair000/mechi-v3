'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  TournamentMemberList,
  type TournamentMemberListItem,
} from '@/components/ui/tournament-member-list';
import {
  ONLINE_TOURNAMENT_CASH_PRIZE_POOL,
  ONLINE_TOURNAMENT_ARENA_PATH,
  ONLINE_TOURNAMENT_GAMES,
  ONLINE_TOURNAMENT_REGISTRATION_API_PATH,
  ONLINE_TOURNAMENT_TITLE,
  ONLINE_TOURNAMENT_WHATSAPP_GROUP_URL,
  getFallbackOnlineTournamentSummary,
  getOnlineTournamentTotals,
  type OnlineTournamentGameConfig,
  type OnlineTournamentRegistrationSummary,
} from '@/lib/online-tournament';
import { getOnlineTournamentArenaHref } from '@/lib/online-tournament-ops';
import {
  PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT,
  WEEKEND_CUP_ROUTE_ENABLED,
} from '@/lib/upcoming-playmechi-tournaments';
import {
  WEEKEND_CUP_GAMES,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_TITLE,
} from '@/lib/weekend-cup';

type OnlineTournamentUserRegistration = {
  game?: string | null;
  in_game_username?: string | null;
};

const STATUS_FILTERS = ['all', 'open', 'active', 'completed'] as const;
const WEEKEND_CUP_FILL_LABEL = '20% full';

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
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('open');
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

  const showOnlineTournament = status === 'all' || status === 'completed';
  const showUpcomingWeekendCup =
    WEEKEND_CUP_ROUTE_ENABLED &&
    PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT &&
    (status === 'all' || status === 'open');
  const onlineTournamentTotals = getOnlineTournamentTotals(onlineTournament);
  const weekendCupItems: TournamentMemberListItem[] = showUpcomingWeekendCup
    ? WEEKEND_CUP_GAMES.map((game) => {
        const isMysteryGame = game.game === 'mystery';
        return {
          actionHref: isMysteryGame
            ? `${WEEKEND_CUP_PUBLIC_PATH}#vote`
            : `${WEEKEND_CUP_REGISTRATION_PATH}?game=${game.game}`,
          actionLabel: isMysteryGame ? 'Vote' : 'Register',
          actionVariant: isMysteryGame ? 'muted' : 'primary',
          anchorId: `weekendcup-${game.game}`,
          detailHref: isMysteryGame
            ? `${WEEKEND_CUP_PUBLIC_PATH}#vote`
            : `${WEEKEND_CUP_REGISTRATION_PATH}?game=${game.game}`,
          gameLabel: game.label,
          id: `weekendcup-${game.game}`,
          metaLabel: isMysteryGame ? 'Mystery vote' : 'Paid entry',
          prizeLabel: getOnlineTournamentGamePrizeLabel(game),
          progress: 20,
          secondaryActionHref: isMysteryGame ? WEEKEND_CUP_PUBLIC_PATH : `${WEEKEND_CUP_REGISTRATION_PATH}?game=${game.game}`,
          secondaryActionLabel: isMysteryGame ? 'Preview' : 'Open form',
          slotsLabel: WEEKEND_CUP_FILL_LABEL,
          startsLabel: `${game.dateLabel.replace(' 2026', '')}, ${game.timeLabel}`,
          statusClassName: getStatusClasses('open'),
          statusLabel: 'Open',
          tagLabel: isMysteryGame ? 'Vote live' : null,
          title: WEEKEND_CUP_TITLE,
        };
      })
    : [];
  const onlineTournamentItems: TournamentMemberListItem[] = showOnlineTournament
    ? ONLINE_TOURNAMENT_GAMES.map((game) => {
        const gameSummary = onlineTournament.games[game.game];
        const registered = Number(gameSummary?.registered ?? 0);
        const slots = Number(gameSummary?.slots ?? game.slots);
        const progress = Math.min(100, (registered / Math.max(1, slots)) * 100);
        const userRegistration = getOnlineTournamentRegistration(onlineTournament, game.game);

        return {
          actionHref: getOnlineTournamentArenaHref(game.game),
          actionLabel: userRegistration ? 'View' : 'Open',
          actionVariant: 'muted',
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
          statusClassName: getStatusClasses('completed'),
          statusLabel: 'Previous',
          tagLabel: null,
          title: ONLINE_TOURNAMENT_TITLE,
        };
      })
    : [];
  const tournamentListItems = [...weekendCupItems, ...onlineTournamentItems];
  const hasVisibleTournaments = tournamentListItems.length > 0;

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
              className="btn-primary w-full justify-center !rounded-[1rem] sm:w-auto"
            >
              Open Weekend Cup
            </Link>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {PRIMARY_UPCOMING_PLAYMECHI_TOURNAMENT.games.map((game) => (
              <div
                key={game.key}
                className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-[var(--text-primary)]">{game.label}</p>
                  <span className="brand-chip !rounded-[1rem] px-2.5 py-1">{WEEKEND_CUP_FILL_LABEL}</span>
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

      <section className="card circuit-panel overflow-hidden p-0">
        <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div
            className="relative min-h-[260px] bg-cover bg-center"
            style={{ backgroundImage: 'url(/dashboard-promos/playmechi-launch-mobile-gaming.jpg)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="section-title text-white/78">Previous Tournament</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-white">
                {ONLINE_TOURNAMENT_TITLE}
              </h2>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={15} className="text-[var(--brand-teal)]" />
                8-10 May 2026
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={15} className="text-[var(--brand-teal)]" />
                {onlineTournamentTotals.registered} registered
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(96,165,250,0.24)] bg-[rgba(96,165,250,0.12)] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#93c5fd]">
              <Clock3 size={14} />
              Previous tournament
            </div>

            <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Launch weekend is wrapped, but the rooms, results, and recap trail are still open
              if you want to revisit the first PlayMechi run.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {ONLINE_TOURNAMENT_GAMES.map((game) => (
                <div
                  key={game.game}
                  className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-4 shadow-[var(--shadow-soft)]"
                >
                  <p className="text-sm font-black text-[var(--text-primary)]">{game.label}</p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">{game.dateLabel}</p>
                  <p className="mt-3 text-xs font-semibold text-[var(--accent-secondary-text)]">
                    {getOnlineTournamentGamePrizeLabel(game)}
                  </p>
                </div>
              ))}
            </div>

            <Link href={ONLINE_TOURNAMENT_ARENA_PATH} className="btn-outline inline-flex !rounded-[1rem]">
              Open last tournament
            </Link>
          </div>
        </div>
      </section>

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
