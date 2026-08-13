'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Gamepad2,
  Medal,
  RefreshCw,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuthFetch } from '@/components/AuthProvider';
import { getGameLabel } from '@/lib/dashboard';
import type {
  PlayerDashboardAction,
  PlayerDashboardTodayItem,
} from '@/lib/player-dashboard-priority';
import styles from './Dashboard.module.css';

type Row = Record<string, unknown>;
type ProfileSetup = {
  complete: boolean;
  selected_game_count: number;
  configured_game_count: number;
  blocker?: { label: string; description: string } | null;
};
type ActivitySummary = { incoming_count: number; sent_count: number };
type TeamSummary = {
  membership_count: number;
  invitation_count: number;
  primary_team?: { id: string; name: string; slug: string; role: string } | null;
};

export type PlayerDashboardData = {
  profile: Row;
  profile_setup: ProfileSetup;
  matches: Row[];
  tournaments: Row[];
  recommended: Row[];
  incoming_challenges: Row[];
  one_v_one_summary: ActivitySummary;
  teams: Row[];
  team_summary: TeamSummary;
  next_action: PlayerDashboardAction;
  today: PlayerDashboardTodayItem[];
  unread_notifications: number;
  partial?: boolean;
  partial_sources?: string[];
  generated_at?: string;
};

function formatDate(value: unknown, includeTime = false) {
  if (!value) return 'Schedule to be announced';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Schedule to be announced';
  const formatted = new Intl.DateTimeFormat('en-KE', {
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { year: 'numeric', hour: 'numeric', minute: '2-digit' } : {}),
    timeZone: 'Africa/Nairobi',
  }).format(date);
  return includeTime ? `${formatted} EAT` : formatted;
}

function getTournament(row: Row) {
  return (row.tournament ?? row) as Row;
}

function ActionIcon({ kind }: { kind: string }) {
  if (kind.includes('match') || kind.includes('challenge') || kind === 'result_review') {
    return <Gamepad2 size={24} />;
  }
  if (kind.includes('team')) return <UsersRound size={24} />;
  if (kind === 'profile_setup') return <UserRound size={24} />;
  return <Trophy size={24} />;
}

export function PlayerDashboard({
  initialData,
}: {
  initialData?: PlayerDashboardData;
}) {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<PlayerDashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authFetch('/api/dashboard/player');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Could not load your player home.');
      }
      setData(payload as PlayerDashboardData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load your player home.'
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (initialData) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [initialData, load]);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) {
    return (
      <div className={styles.centerState}>
        <span><CircleAlert size={25} /></span>
        <h1>We could not load your player home</h1>
        <p>{error || 'Try again in a moment.'}</p>
        <button onClick={() => void load()}>
          <RefreshCw size={17} /> Try again
        </button>
      </div>
    );
  }

  const username = String(data.profile.username ?? 'Player');
  const selectedGames = Array.isArray(data.profile.selected_games)
    ? data.profile.selected_games.map(String)
    : [];
  const completedMatches = data.matches.filter((match) =>
    ['win', 'loss', 'draw'].includes(String(match.result))
  );
  const wins = completedMatches.filter((match) => match.result === 'win').length;
  const winRate = completedMatches.length
    ? Math.round((wins / completedMatches.length) * 100)
    : 0;
  const activeTournaments = data.tournaments
    .filter((item) => ['paid', 'free'].includes(String(item.payment_status)))
    .slice(0, 3);
  const teamCopy = data.team_summary.invitation_count
    ? `${data.team_summary.invitation_count} invitation${data.team_summary.invitation_count === 1 ? '' : 's'} to answer`
    : data.team_summary.primary_team
      ? `${data.team_summary.primary_team.name} · ${data.team_summary.primary_team.role}`
      : 'Create or join a team';

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Player home</p>
          <h1>Hi {username}, what&apos;s next?</h1>
          <p>Your important match, tournament, team, and 1v1 actions in one place.</p>
        </div>
      </header>

      {data.partial ? (
        <div className={styles.notice} role="status">
          <CircleAlert size={16} />
          Some details are temporarily unavailable
          {data.partial_sources?.length
            ? `: ${data.partial_sources.join(', ')}.`
            : '.'}
        </div>
      ) : null}

      <section className={styles.actionHero} aria-labelledby="next-action-title">
        <div className={styles.actionCopy}>
          <span className={styles.actionIcon}>
            <ActionIcon kind={data.next_action.kind} />
          </span>
          <div>
            <p className={styles.eyebrow}>{data.next_action.eyebrow}</p>
            <h2 id="next-action-title">{data.next_action.title}</h2>
            <p>{data.next_action.description}</p>
            <div className={styles.actionMeta}>
              <span><UserRound size={14} /> Next step: {data.next_action.owner}</span>
              {data.next_action.deadline_at ? (
                <span>
                  <Clock3 size={14} />
                  {formatDate(data.next_action.deadline_at, true)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className={styles.actionButtons}>
          {data.next_action.secondary_href ? (
            <Link
              className={styles.secondaryButton}
              href={data.next_action.secondary_href}
            >
              {data.next_action.secondary_label}
            </Link>
          ) : null}
          <Link className={styles.primaryButton} href={data.next_action.href}>
            {data.next_action.label} <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <TodayList items={data.today} />

      <section className={styles.quickActions} aria-label="Ways to play">
        <Link href="/tournaments">
          <span className={styles.quickIcon}><Trophy size={20} /></span>
          <span className={styles.quickCopy}>
            <strong>Join a tournament</strong>
            <small>Find an open event</small>
          </span>
          <ChevronRight size={18} />
        </Link>
        <Link href="/challenges">
          <span className={styles.quickIcon}><Gamepad2 size={20} /></span>
          <span className={styles.quickCopy}>
            <strong>Play 1v1</strong>
            <small>
              {data.one_v_one_summary.incoming_count
                ? `${data.one_v_one_summary.incoming_count} invite${data.one_v_one_summary.incoming_count === 1 ? '' : 's'} to answer`
                : data.one_v_one_summary.sent_count
                  ? `${data.one_v_one_summary.sent_count} sent invite${data.one_v_one_summary.sent_count === 1 ? '' : 's'} waiting`
                  : 'Invite another player'}
            </small>
          </span>
          <ChevronRight size={18} />
        </Link>
        <Link href="/teams">
          <span className={styles.quickIcon}><UsersRound size={20} /></span>
          <span className={styles.quickCopy}>
            <strong>Your team</strong>
            <small>{teamCopy}</small>
          </span>
          <ChevronRight size={18} />
        </Link>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.panel}>
          <PanelHeader
            title="Your tournaments"
            subtitle="The registrations most relevant to you"
            href="/tournaments"
          />
          {activeTournaments.length ? (
            <div className={styles.list}>
              {activeTournaments.map((registration) => {
                const tournament = getTournament(registration);
                return (
                  <Link
                    className={styles.tournamentRow}
                    href={`/t/${String(tournament.slug)}`}
                    key={String(registration.id)}
                  >
                    <span className={styles.gameTile}><Trophy size={20} /></span>
                    <span className={styles.rowCopy}>
                      <strong>{String(tournament.title)}</strong>
                      <small>
                        {getGameLabel(String(tournament.game))} ·{' '}
                        {formatDate(tournament.scheduled_for, true)}
                      </small>
                    </span>
                    <span className={styles.rowStatus}>
                      {String(registration.check_in_status ?? 'registered').replaceAll('_', ' ')}
                    </span>
                    <ChevronRight size={18} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Trophy}
              title="No tournament registrations"
              body="Find a tournament that fits your game and schedule."
              action="Browse tournaments"
              href="/tournaments"
            />
          )}
        </section>

        <section className={styles.panel}>
          <PanelHeader
            title="Recent confirmed results"
            subtitle="Only confirmed results count toward player progress"
            href="/matches"
          />
          {completedMatches.length ? (
            <div className={styles.list}>
              {completedMatches.slice(0, 4).map((match) => {
                const opponent = (match.opponent ?? {}) as Row;
                const result = String(match.result);
                return (
                  <Link
                    className={styles.matchRow}
                    href={`/match/${String(match.id)}`}
                    key={String(match.id)}
                  >
                    <span
                      className={`${styles.resultBadge} ${
                        result === 'win'
                          ? styles.win
                          : result === 'loss'
                            ? styles.loss
                            : styles.pending
                      }`}
                    >
                      {result.slice(0, 1).toUpperCase()}
                    </span>
                    <span className={styles.rowCopy}>
                      <strong>vs {String(opponent.username ?? 'Player')}</strong>
                      <small>
                        {getGameLabel(String(match.game))} · {formatDate(match.created_at)}
                      </small>
                    </span>
                    <span className={styles.ratingChange}>
                      {Number(match.rating_change ?? 0) > 0 ? '+' : ''}
                      {Number(match.rating_change ?? 0)}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Gamepad2}
              title="No confirmed results yet"
              body="Play a 1v1 or tournament match. Confirmed results will appear here."
              action="Play 1v1"
              href="/challenges"
            />
          )}
        </section>
      </div>

      {data.recommended.length ? (
        <RecommendedTournaments items={data.recommended} />
      ) : null}

      <section className={styles.compactProgress} aria-label="Player progress">
        <div>
          <Medal size={21} />
          <span>
            <strong>{winRate}% recent win rate</strong>
            <small>
              {completedMatches.length} confirmed result
              {completedMatches.length === 1 ? '' : 's'}
            </small>
          </span>
        </div>
        <Link href="/profile/settings">
          <ShieldCheck size={21} />
          <span>
            <strong>
              {data.profile_setup.configured_game_count} game
              {data.profile_setup.configured_game_count === 1 ? '' : 's'} ready
            </strong>
            <small>
              {data.profile_setup.complete
                ? selectedGames.map(getGameLabel).join(', ')
                : data.profile_setup.blocker?.label ?? 'Finish player setup'}
            </small>
          </span>
          <ChevronRight size={18} />
        </Link>
        <Link href="/notifications">
          <Bell size={21} />
          <span>
            <strong>
              {data.unread_notifications} unread update
              {data.unread_notifications === 1 ? '' : 's'}
            </strong>
            <small>Match, team, tournament, and support updates</small>
          </span>
          <ChevronRight size={18} />
        </Link>
      </section>
    </div>
  );
}

function TodayList({ items }: { items: PlayerDashboardTodayItem[] }) {
  return (
    <section className={styles.today} aria-labelledby="today-heading">
      <div className={styles.todayHeader}>
        <div>
          <p className={styles.eyebrow}>Today</p>
          <h2 id="today-heading">What needs your attention</h2>
        </div>
        <CalendarClock size={21} />
      </div>
      {items.length ? (
        <div className={styles.todayItems}>
          {items.map((item) => (
            <Link href={item.href} key={item.id}>
              <span className={styles.todayStatus} aria-hidden="true" />
              <span className={styles.todayCopy}>
                <strong>{item.title}</strong>
                <small>
                  {item.detail}
                  {item.deadline_at ? ` · ${formatDate(item.deadline_at, true)}` : ''}
                </small>
              </span>
              <span className={styles.todayAction}>{item.action_label}</span>
              <ChevronRight size={17} />
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.todayEmpty}>
          <CheckCircle2 size={20} />
          <span>
            <strong>No deadline needs attention right now</strong>
            <small>Your next useful action is shown above.</small>
          </span>
        </div>
      )}
    </section>
  );
}

function RecommendedTournaments({ items }: { items: Row[] }) {
  return (
    <section className={styles.recommendations}>
      <PanelHeader
        title="Tournaments you can join"
        subtitle="Open events selected from live tournament data"
        href="/tournaments"
      />
      <div className={styles.cardGrid}>
        {items.map((tournament) => (
          <article className={styles.tournamentCard} key={String(tournament.id)}>
            <div className={styles.cardVisual}>
              <span>{getGameLabel(String(tournament.game))}</span>
              <Trophy size={28} />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.tags}>
                <span>{String(tournament.status)}</span>
                <span>{String(tournament.platform ?? 'All platforms')}</span>
              </div>
              <h3>{String(tournament.title)}</h3>
              <p><CalendarClock size={14} /> {formatDate(tournament.scheduled_for, true)}</p>
              <p>
                <UsersRound size={14} /> {Number(tournament.player_count ?? 0)} of{' '}
                {Number(tournament.size ?? 0)} places taken
              </p>
              <Link href={`/t/${String(tournament.slug)}`}>
                View tournament <ArrowRight size={15} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PanelHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <div className={styles.panelHeader}>
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      <Link href={href}>View all <ArrowRight size={15} /></Link>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  href,
}: {
  icon: typeof Trophy;
  title: string;
  body: string;
  action: string;
  href: string;
}) {
  return (
    <div className={styles.empty}>
      <span><Icon size={22} /></span>
      <div><h3>{title}</h3><p>{body}</p></div>
      <Link href={href}>{action} <ArrowRight size={15} /></Link>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className={styles.dashboard}
      aria-busy="true"
      aria-label="Loading player home"
    >
      <div className={`${styles.skeleton} ${styles.skeletonHeader}`} />
      <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
      <div className={`${styles.skeleton} ${styles.skeletonToday}`} />
      <div className={styles.contentGrid}>
        <div className={`${styles.skeleton} ${styles.skeletonPanel}`} />
        <div className={`${styles.skeleton} ${styles.skeletonPanel}`} />
      </div>
    </div>
  );
}
