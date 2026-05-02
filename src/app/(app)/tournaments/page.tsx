'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { EventCountdownCard } from '@/components/ui/event-countdown-card';
import {
  TournamentMemberList,
  type TournamentMemberListItem,
} from '@/components/ui/tournament-member-list';
import { GAMES } from '@/lib/config';
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
import { resolvePlan } from '@/lib/plans';
import { getTournamentPrizePoolLabel } from '@/lib/tournament-metrics';
import { formatTournamentDateTime } from '@/lib/tournament-schedule';
import type { GameKey, Tournament } from '@/types';

type TournamentListItem = Tournament & {
  confirmed_count?: number;
  player_count?: Array<{ count: number }> | number;
  active_stream?: {
    id: string;
    viewer_count: number;
  } | null;
};

type OnlineTournamentUserRegistration = {
  game?: string | null;
  in_game_username?: string | null;
};

const STATUS_FILTERS = ['all', 'open', 'active', 'completed'] as const;

function getPlayerCount(tournament: TournamentListItem): number {
  const count = tournament.player_count;
  if (Array.isArray(count)) return count[0]?.count ?? 0;
  return typeof count === 'number' ? count : 0;
}

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

function shouldShowTournamentListItem(tournament: TournamentListItem) {
  const title = tournament.title.trim().toLowerCase();
  const prizePool = Number(tournament.prize_pool ?? 0);
  const entryFee = Number(tournament.entry_fee ?? 0);

  return !(title === 'efootball' && tournament.game === 'efootball' && entryFee === 0 && prizePool === 0);
}

function formatTournamentDate(tournament: TournamentListItem) {
  return formatTournamentDateTime(
    tournament.scheduled_for ?? tournament.started_at ?? tournament.created_at,
    'TBA'
  );
}

export default function TournamentsPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [onlineTournament, setOnlineTournament] = useState<OnlineTournamentRegistrationSummary>(
    () => getFallbackOnlineTournamentSummary()
  );
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [loading, setLoading] = useState(true);
  const canHostTournaments = resolvePlan(user?.plan, user?.plan_expires_at) !== 'free';
  const hostHref = canHostTournaments ? '/tournaments/create' : '/pricing';
  const hostLabel = canHostTournaments ? 'Host tournament' : 'Upgrade to host';

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const [res, onlineTournamentRes] = await Promise.all([
        authFetch(`/api/tournaments?status=${status}`),
        authFetch(ONLINE_TOURNAMENT_REGISTRATION_API_PATH),
      ]);
      const data = (await res.json()) as {
        error?: string;
        tournaments?: TournamentListItem[];
      };

      if (!res.ok) {
        toast.error(data.error ?? 'Could not load tournaments');
        setTournaments([]);
        return;
      }

      setTournaments((data.tournaments ?? []).filter(shouldShowTournamentListItem));

      if (onlineTournamentRes.ok) {
        const onlineTournamentData =
          (await onlineTournamentRes.json()) as OnlineTournamentRegistrationSummary;
        setOnlineTournament(onlineTournamentData);
      } else {
        setOnlineTournament(getFallbackOnlineTournamentSummary());
      }
    } catch {
      toast.error('Could not load tournaments');
      setTournaments([]);
      setOnlineTournament(getFallbackOnlineTournamentSummary());
    } finally {
      setLoading(false);
    }
  }, [authFetch, status]);

  useEffect(() => {
    void fetchTournaments();
  }, [fetchTournaments]);

  const onlineTournamentStatus = getOnlineTournamentDisplayStatus();
  const showOnlineTournament =
    status === 'all' || status === onlineTournamentStatus;
  const hasVisibleTournaments = showOnlineTournament || tournaments.length > 0;
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
  const tournamentItems: TournamentMemberListItem[] = tournaments.map((tournament) => {
    const playerCount = getPlayerCount(tournament);
    const progress = Math.min(100, (playerCount / Math.max(1, tournament.size)) * 100);
    const game = GAMES[tournament.game as GameKey];
    const liveHref = tournament.active_stream ? `/t/${tournament.slug}/live` : null;
    const actionHref = liveHref ?? `/t/${tournament.slug}`;
    const actionLabel = liveHref
      ? 'Watch live'
      : tournament.status === 'open'
        ? 'Join'
        : tournament.status === 'full'
          ? 'Watch'
          : 'View';

    return {
      actionHref,
      actionLabel,
      actionVariant: tournament.status === 'open' || liveHref ? 'primary' : 'muted',
      detailHref: `/t/${tournament.slug}`,
      gameLabel: game?.label ?? tournament.game,
      id: tournament.id,
      liveHref,
      liveLabel: tournament.active_stream
        ? `${tournament.active_stream.viewer_count.toLocaleString()} live`
        : null,
      metaLabel:
        tournament.entry_fee > 0
          ? `Entry KES ${tournament.entry_fee.toLocaleString()}`
          : 'Free entry',
      prizeLabel: getTournamentPrizePoolLabel({
        entryFee: tournament.entry_fee,
        prizePool: tournament.prize_pool,
        prizePoolMode: tournament.prize_pool_mode,
      }),
      progress,
      slotsLabel: `${playerCount}/${tournament.size}`,
      startsLabel: formatTournamentDate(tournament),
      statusClassName: getStatusClasses(tournament.status),
      statusLabel: formatTournamentStatus(tournament.status),
      tagLabel: tournament.is_featured ? 'Featured' : null,
      title: tournament.title,
    };
  });
  const tournamentListItems = [...onlineTournamentItems, ...tournamentItems];

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Tournaments</p>
            <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Upcoming competitions
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Host a bracket, track filled slots, and move players into the right tournament detail when it is time to join.
            </p>
          </div>

          <Link href={hostHref} className="btn-primary text-sm">
            <Plus size={14} />
            {hostLabel}
          </Link>
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
          <Link href={hostHref} className="btn-primary mt-5 inline-flex">
            <Plus size={14} />
            {canHostTournaments ? 'Create tournament' : 'Upgrade to host'}
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
