'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Clock,
  Coins,
  Gamepad2,
  History,
  RefreshCw,
  ShieldCheck,
  Swords,
  Trophy,
  UserCog,
  Zap,
} from 'lucide-react';
import { ActionFeedback } from '@/components/ActionFeedback';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { RatingBadge } from '@/components/RatingBadge';
import {
  GAMES,
  PLATFORMS,
  getConfiguredPlatformForGame,
  getGameIdValue,
} from '@/lib/config';
import { getPlan } from '@/lib/plans';
import type {
  GameKey,
  MatchChallenge,
  MatchWithProfiles,
  Notification,
  PlatformKey,
  Profile,
  QueueEntry,
} from '@/types';

type QueueStatusResponse = {
  activeMatch?: { id: string; game: GameKey; status: string } | null;
  inQueue?: boolean;
  queueEntry?: QueueEntry | null;
};

type CurrentMatchResponse = {
  match?: MatchWithProfiles | null;
};

type ChallengeResponse = {
  inbound?: MatchChallenge[];
  outbound?: MatchChallenge[];
};

type ProfileResponse = {
  profile?: Partial<Profile> & {
    id: string;
    username: string;
    game_ids?: Record<string, string> | null;
    selected_games?: GameKey[] | null;
    platforms?: PlatformKey[] | null;
  };
};

type RewardsResponse = {
  summary?: {
    balances?: {
      available?: number;
      pending?: number;
      lifetime?: number;
    };
    active_codes?: unknown[];
  };
};

type NotificationsResponse = {
  notifications?: Notification[];
  unreadCount?: number;
};

type MatchHistoryEntry = {
  id: string;
  game: GameKey;
  opponent_username: string;
  result?: 'win' | 'loss' | 'draw' | 'cancelled';
  rating_change: number;
  completed_at: string;
  status: string;
};

type MatchHistoryResponse = {
  matches?: MatchHistoryEntry[];
};

type SubscriptionResponse = {
  plan?: string | null;
  plan_expires_at?: string | null;
};

type TournamentSummary = {
  id: string;
  slug: string;
  title: string;
  game: GameKey;
  player_count?: number | null;
  size?: number | null;
  status?: string | null;
};

type TournamentsResponse = {
  tournaments?: TournamentSummary[];
};

type DashboardData = {
  queue: QueueStatusResponse | null;
  currentMatch: CurrentMatchResponse | null;
  challenges: ChallengeResponse | null;
  profile: ProfileResponse['profile'] | null;
  rewards: RewardsResponse['summary'] | null;
  notifications: NotificationsResponse | null;
  matchHistory: MatchHistoryEntry[];
  subscription: SubscriptionResponse | null;
  tournaments: TournamentSummary[];
};

const EMPTY_DATA: DashboardData = {
  queue: null,
  currentMatch: null,
  challenges: null,
  profile: null,
  rewards: null,
  notifications: null,
  matchHistory: [],
  subscription: null,
  tournaments: [],
};

function getDisplayDate(value: string | null | undefined) {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No expiry';

  return date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getTimeLabel(value: string | null | undefined) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';

  return date.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getProfileRating(profile: DashboardData['profile'], game: GameKey) {
  const raw = profile ? (profile as Record<string, unknown>)[`rating_${game}`] : null;
  return typeof raw === 'number' ? raw : 500;
}

function getGameLabel(game: GameKey | null | undefined) {
  return game ? GAMES[game]?.label ?? game : 'Game';
}

function getPlatformLabel(platform: PlatformKey | null | undefined) {
  return platform ? PLATFORMS[platform]?.label ?? platform : 'Any platform';
}

function getMatchHref(matchId: string | null | undefined) {
  return matchId ? `/dashboard/matches/${encodeURIComponent(matchId)}` : '/dashboard/matches';
}

async function readJson<T>(authFetch: ReturnType<typeof useAuthFetch>, url: string): Promise<T | null> {
  const response = await authFetch(url, { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as T | null;
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-page-container space-y-4 pb-10 pt-3">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="h-56 rounded-xl shimmer" />
        <div className="h-56 rounded-xl shimmer" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-xl shimmer" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-72 rounded-xl shimmer xl:col-span-2" />
        <div className="h-72 rounded-xl shimmer" />
      </div>
    </div>
  );
}

function CommandCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`card p-4 sm:p-5 ${className}`.trim()}>{children}</section>;
}

function SectionTitle({
  action,
  icon: Icon,
  title,
}: {
  action?: React.ReactNode;
  icon: typeof Zap;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--accent-secondary-text)]">
          <Icon size={15} />
        </span>
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--text-primary)]">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function StatCard({
  detail,
  href,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  href: string;
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <Link href={href} className="card-hover block p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-soft)]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{value}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--accent-secondary-text)]">
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{detail}</p>
    </Link>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-color)] px-4 py-5 text-center text-sm text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

export function DashboardHomeClient() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      try {
        const [
          queue,
          currentMatch,
          challenges,
          profile,
          rewards,
          notifications,
          matchHistory,
          subscription,
          tournaments,
        ] = await Promise.all([
          readJson<QueueStatusResponse>(authFetch, '/api/queue/status'),
          readJson<CurrentMatchResponse>(authFetch, '/api/matches/current'),
          readJson<ChallengeResponse>(authFetch, '/api/challenges'),
          readJson<ProfileResponse>(authFetch, '/api/users/profile'),
          readJson<RewardsResponse>(authFetch, '/api/rewards/summary'),
          readJson<NotificationsResponse>(authFetch, '/api/notifications?limit=5'),
          readJson<MatchHistoryResponse>(authFetch, '/api/matches/history?limit=4'),
          readJson<SubscriptionResponse>(authFetch, '/api/subscriptions'),
          readJson<TournamentsResponse>(authFetch, '/api/tournaments?status=open&limit=3'),
        ]);

        setData({
          queue,
          currentMatch,
          challenges,
          profile: profile?.profile ?? null,
          rewards: rewards?.summary ?? null,
          notifications,
          matchHistory: matchHistory?.matches ?? [],
          subscription,
          tournaments: tournaments?.tournaments ?? [],
        });
      } catch {
        setError('Could not load the dashboard right now.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const selectedGames = useMemo(
    () => data.profile?.selected_games ?? user?.selected_games ?? [],
    [data.profile?.selected_games, user?.selected_games]
  );
  const gameIds = useMemo(
    () => data.profile?.game_ids ?? user?.game_ids ?? {},
    [data.profile?.game_ids, user?.game_ids]
  );
  const platforms = useMemo(
    () => data.profile?.platforms ?? user?.platforms ?? [],
    [data.profile?.platforms, user?.platforms]
  );
  const primaryGame = selectedGames[0] ?? null;
  const primaryRating = primaryGame ? getProfileRating(data.profile, primaryGame) : 500;
  const plan = getPlan(data.subscription?.plan ?? data.profile?.plan ?? user?.plan ?? 'free');
  const currentMatch = data.currentMatch?.match ?? data.queue?.activeMatch ?? null;
  const inboundChallenges = data.challenges?.inbound ?? [];
  const outboundChallenges = data.challenges?.outbound ?? [];
  const unreadCount = data.notifications?.unreadCount ?? 0;
  const queueEntry = data.queue?.queueEntry ?? null;
  const setup = useMemo(() => {
    const selected = selectedGames.filter((game) => Boolean(GAMES[game]));
    const missingGames = selected.filter((game) => {
      const platform = getConfiguredPlatformForGame(game, gameIds, platforms);
      return !platform || !getGameIdValue(gameIds, game, platform).trim();
    });

    return {
      selectedCount: selected.length,
      missingCount: missingGames.length,
      complete: selected.length > 0 && missingGames.length === 0,
    };
  }, [gameIds, platforms, selectedGames]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard-page-container space-y-4 pb-10 pt-3">
      {error ? (
        <ActionFeedback
          tone="error"
          title={error}
          detail="Refresh the dashboard or open the target section from the navigation."
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <CommandCard className="overflow-hidden">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-secondary-text)]">
                Command center
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-normal text-[var(--text-primary)] sm:text-4xl">
                {currentMatch ? 'Your match is live.' : `Ready, ${user?.username ?? 'player'}?`}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                {currentMatch
                  ? `${getGameLabel(currentMatch.game)} is waiting for your next action.`
                  : queueEntry
                    ? `${getGameLabel(queueEntry.game)} matchmaking is active on ${getPlatformLabel(queueEntry.platform)}.`
                    : 'Pick the next action from your live queue, challenges, matches, and rewards.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard({ silent: true })}
              disabled={refreshing}
              className="icon-button h-10 w-10 shrink-0"
              aria-label="Refresh dashboard"
              title="Refresh dashboard"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : undefined} />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/dashboard/play" className="btn-primary px-4 py-2 text-sm">
              <Zap size={14} />
              Play now
            </Link>
            <Link href="/dashboard/challenges" className="btn-outline px-4 py-2 text-sm">
              <Swords size={14} />
              Challenges
            </Link>
            <Link href="/dashboard/matches" className="btn-outline px-4 py-2 text-sm">
              <History size={14} />
              Matches
            </Link>
          </div>

          {currentMatch ? (
            <Link
              href={getMatchHref(currentMatch.id)}
              className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.08)] px-4 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block font-bold text-[var(--text-primary)]">
                  Continue {getGameLabel(currentMatch.game)}
                </span>
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                  Match ID {currentMatch.id.slice(0, 8)}
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-[var(--accent-secondary-text)]" />
            </Link>
          ) : null}
        </CommandCard>

        <CommandCard>
          <SectionTitle icon={ShieldCheck} title="Player State" />
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-[var(--text-primary)]">{plan.name}</p>
                <span className="brand-chip px-2.5 py-1">{setup.complete ? 'Ready' : 'Setup'}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {plan.id === 'free'
                  ? `${plan.dailyMatchLimit} ranked matches per day`
                  : 'Unlimited ranked matchmaking access'}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--text-soft)]">Primary rank</p>
                  <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                    {getGameLabel(primaryGame)}
                  </p>
                </div>
                <RatingBadge rating={primaryRating} showRating />
              </div>
            </div>
            <div className="text-xs leading-5 text-[var(--text-secondary)]">
              <p>{setup.selectedCount} selected game{setup.selectedCount === 1 ? '' : 's'}</p>
              <p>{setup.missingCount} missing game ID{setup.missingCount === 1 ? '' : 's'}</p>
              <p>Plan expires: {getDisplayDate(data.subscription?.plan_expires_at ?? data.profile?.plan_expires_at)}</p>
            </div>
          </div>
        </CommandCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href={currentMatch ? getMatchHref(currentMatch.id) : '/dashboard/play'}
          icon={currentMatch ? Swords : Gamepad2}
          label="Live action"
          value={currentMatch ? 'Match' : queueEntry ? 'Queue' : 'Open'}
          detail={
            currentMatch
              ? `${getGameLabel(currentMatch.game)} needs attention.`
              : queueEntry
                ? `${getGameLabel(queueEntry.game)} queue is running.`
                : 'No live match or queue session.'
          }
        />
        <StatCard
          href="/dashboard/challenges"
          icon={Swords}
          label="Challenges"
          value={String(inboundChallenges.length)}
          detail={`${outboundChallenges.length} sent challenge${outboundChallenges.length === 1 ? '' : 's'} still pending.`}
        />
        <StatCard
          href="/dashboard/notifications"
          icon={Bell}
          label="Unread"
          value={String(unreadCount)}
          detail="Recent match, challenge, and community alerts."
        />
        <StatCard
          href="/dashboard/rewards"
          icon={Coins}
          label="RP balance"
          value={String(data.rewards?.balances?.available ?? 0)}
          detail={`${data.rewards?.balances?.pending ?? 0} RP pending confirmation.`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CommandCard className="xl:col-span-2">
          <SectionTitle
            icon={AlertTriangle}
            title="Next Actions"
            action={
              <Link href="/dashboard/play" className="brand-link text-xs font-black uppercase tracking-[0.12em]">
                Play
              </Link>
            }
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Link href={setup.complete ? '/dashboard/play' : '/dashboard/game-ids'} className="card-hover p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {setup.complete ? 'Queue is available' : 'Finish game IDs'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {setup.complete
                      ? 'Your selected games have the IDs opponents need.'
                      : 'Add missing IDs before opponents can find you cleanly.'}
                  </p>
                </div>
                <UserCog size={16} className="shrink-0 text-[var(--accent-secondary-text)]" />
              </div>
            </Link>

            <Link href="/dashboard/challenges" className="card-hover p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {inboundChallenges.length > 0 ? 'Reply to challenges' : 'Find a rival'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {inboundChallenges.length > 0
                      ? `${inboundChallenges.length} pending challenge${inboundChallenges.length === 1 ? '' : 's'} waiting.`
                      : 'Search players and send a direct challenge.'}
                  </p>
                </div>
                <Swords size={16} className="shrink-0 text-[var(--accent-secondary-text)]" />
              </div>
            </Link>

            <Link href="/dashboard/tournaments" className="card-hover p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Open tournaments</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {data.tournaments.length > 0
                      ? `${data.tournaments.length} visible event${data.tournaments.length === 1 ? '' : 's'} currently open.`
                      : 'No open dashboard tournament surfaced right now.'}
                  </p>
                </div>
                <Trophy size={16} className="shrink-0 text-[var(--accent-secondary-text)]" />
              </div>
            </Link>

            <Link href="/dashboard/rewards/catalog" className="card-hover p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Redeem rewards</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {data.rewards?.active_codes?.length
                      ? `${data.rewards.active_codes.length} active reward code${data.rewards.active_codes.length === 1 ? '' : 's'}.`
                      : 'Use RP for PlayMechi and ChezaHub perks.'}
                  </p>
                </div>
                <Coins size={16} className="shrink-0 text-[var(--accent-secondary-text)]" />
              </div>
            </Link>
          </div>
        </CommandCard>

        <CommandCard>
          <SectionTitle icon={Bell} title="Notifications" />
          <div className="space-y-3">
            {(data.notifications?.notifications ?? []).length > 0 ? (
              (data.notifications?.notifications ?? []).slice(0, 5).map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href?.startsWith('/dashboard') ? notification.href : '/dashboard/notifications'}
                  className="block rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-3"
                >
                  <p className="line-clamp-1 text-sm font-bold text-[var(--text-primary)]">
                    {notification.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                    {notification.body ?? getTimeLabel(notification.created_at)}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyLine>No unread or recent notifications.</EmptyLine>
            )}
          </div>
        </CommandCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CommandCard>
          <SectionTitle icon={History} title="Recent Results" />
          <div className="space-y-3">
            {data.matchHistory.length > 0 ? (
              data.matchHistory.map((match) => (
                <Link
                  key={match.id}
                  href={getMatchHref(match.id)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
                      {match.opponent_username}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--text-soft)]">
                      {getGameLabel(match.game)} - {getTimeLabel(match.completed_at)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs font-black uppercase text-[var(--accent-secondary-text)]">
                    {match.result ?? match.status}
                    {match.rating_change ? (
                      <span className="block text-[10px] text-[var(--text-soft)]">
                        {match.rating_change > 0 ? '+' : ''}{match.rating_change}
                      </span>
                    ) : null}
                  </span>
                </Link>
              ))
            ) : (
              <EmptyLine>No completed matches yet.</EmptyLine>
            )}
          </div>
        </CommandCard>

        <CommandCard>
          <SectionTitle icon={Trophy} title="Open Events" />
          <div className="space-y-3">
            {data.tournaments.length > 0 ? (
              data.tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/dashboard/tournaments`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
                      {tournament.title}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--text-soft)]">
                      {getGameLabel(tournament.game)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md border border-[var(--border-color)] px-2 py-1 text-xs font-bold text-[var(--text-secondary)]">
                    {tournament.player_count ?? 0}/{tournament.size ?? '-'}
                  </span>
                </Link>
              ))
            ) : (
              <EmptyLine>No open events returned.</EmptyLine>
            )}
          </div>
        </CommandCard>

        <CommandCard>
          <SectionTitle icon={Clock} title="Queue Snapshot" />
          {queueEntry ? (
            <div className="rounded-xl border border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.08)] p-4">
              <p className="text-sm font-bold text-[var(--text-primary)]">{getGameLabel(queueEntry.game)}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                {getPlatformLabel(queueEntry.platform)} - joined {getTimeLabel(queueEntry.joined_at)}
              </p>
              <Link href="/dashboard/play" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                Open queue <ChevronRight size={13} />
              </Link>
            </div>
          ) : (
            <EmptyLine>No active queue session.</EmptyLine>
          )}
        </CommandCard>
      </div>
    </div>
  );
}
