'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Gamepad2,
  Swords,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { V5AppShell } from '@/components/v5/app/V5AppShell';
import {
  V5PlayerTournamentFlow,
  type PlayerTournament,
} from '@/components/v5/app/V5PlayerTournamentFlow';
import styles from './V5WorkspaceRoute.module.css';

interface PlayerRegistration {
  id: string;
  title: string;
  game: string | null;
  status: string;
  payment_status: string | null;
  registered_at: string;
  href: string;
  detail: string | null;
}

interface CurrentMatch {
  id: string;
  game?: string | null;
  status?: string | null;
}

interface MatchHistoryItem {
  id: string;
  game: string;
  opponent_username: string;
  result: string;
  rating_change: number;
  completed_at: string;
  status: string;
}

interface TournamentLeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  username: string | null;
  scoreText: string;
  verifiedText: string;
}

interface TournamentLeaderboardGame {
  game: string;
  label: string;
  leaderboard: TournamentLeaderboardEntry[];
  players: number;
  verifiedResults: number;
}

interface TournamentLeaderboardPayload {
  leaderboards: TournamentLeaderboardGame[];
  summary: {
    games?: number;
    players?: number;
    verifiedResults?: number;
  };
}

export function V5PlayerTournamentsRoute() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const joinSlug = searchParams.get('join');
  const [tournaments, setTournaments] = useState<PlayerTournament[]>([]);
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [loading, setLoading] = useState(!joinSlug);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (joinSlug) {
      setTournaments([]);
      setRegistrations([]);
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      setError(false);
      const [tournamentResult, historyResult] = await Promise.all([
        fetch('/api/tournaments?status=all&limit=24', { credentials: 'include' })
          .then(async (response) => ({
            ok: response.ok,
            payload: response.ok ? await response.json() : { tournaments: [] },
          }))
          .catch(() => ({ ok: false, payload: { tournaments: [] } })),
        authFetch('/api/v5/player-history')
          .then(async (response) => ({
            ok: response.ok,
            payload: response.ok ? await response.json() : { registrations: [] },
          }))
          .catch(() => ({ ok: false, payload: { registrations: [] } })),
      ]);

      if (!active) return;
      setTournaments(Array.isArray(tournamentResult.payload?.tournaments) ? tournamentResult.payload.tournaments : []);
      setRegistrations(Array.isArray(historyResult.payload?.registrations) ? historyResult.payload.registrations : []);
      setError(!tournamentResult.ok || !historyResult.ok);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [authFetch, joinSlug, user]);

  return (
    <V5AppShell workspace="player" section="tournaments">
      <div className={styles.page}>
        {!joinSlug ? (
          <>
            <PageHeading
              eyebrow="Player workspace"
              title="Tournaments"
              description="Discover, enter and track tournaments that fit your games."
              actionHref="/tournaments"
              actionLabel="Browse public directory"
            />
            {error ? <InlineNotice /> : null}
            <section className={styles.panel}>
              <PanelHeading title="Your entry history" />
              {loading ? (
                <RowSkeleton />
              ) : registrations.length ? (
                <div className={styles.historyRows}>
                  {registrations.map((item) => (
                    <Link href={item.href} key={item.id}>
                      <Gamepad2 size={18} />
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {formatGame(item.game)} · Registered {formatDate(item.registered_at)}
                          {item.detail ? ` · ${item.detail}` : ''}
                        </small>
                      </span>
                      <StatusChip tone={['paid', 'free', 'checked_in'].includes(item.payment_status || item.status) ? 'success' : 'pending'}>
                        {formatGame(item.payment_status || item.status)}
                      </StatusChip>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyInline
                  title="No tournament registration yet"
                  body="Your future entries and payment status will remain visible here."
                  href="/tournaments"
                  action="Browse tournaments"
                />
              )}
            </section>
          </>
        ) : null}
        <V5PlayerTournamentFlow tournaments={tournaments} loading={loading} />
      </div>
    </V5AppShell>
  );
}

export function V5PlayerMatchesRoute() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null);
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(false);
      const [currentResult, historyResult] = await Promise.all([
        authFetch('/api/matches/current')
          .then(async (response) => ({
            ok: response.ok,
            payload: response.ok ? await response.json() : { match: null },
          }))
          .catch(() => ({ ok: false, payload: { match: null } })),
        authFetch('/api/matches/history?limit=20')
          .then(async (response) => ({
            ok: response.ok,
            payload: response.ok ? await response.json() : { matches: [] },
          }))
          .catch(() => ({ ok: false, payload: { matches: [] } })),
      ]);

      if (!active) return;
      setCurrentMatch(currentResult.payload?.match ?? null);
      setHistory(Array.isArray(historyResult.payload?.matches) ? historyResult.payload.matches : []);
      setError(!currentResult.ok || !historyResult.ok);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [authFetch, user]);

  return (
    <V5AppShell workspace="player" section="matches">
      <div className={styles.page}>
        <PageHeading
          eyebrow="Player workspace"
          title="Matches"
          description="See your active match room, recent verified results, and rating changes."
        />
        {error ? <InlineNotice /> : null}
        {currentMatch ? (
          <div className={styles.controlBlocker}>
            <Swords size={20} />
            <div>
              <strong>You have an active match.</strong>
              <span>Open the match room to review the deadline, communicate and submit a result.</span>
            </div>
            <Link className={styles.textLink} href={`/app/player/matches/${currentMatch.id}`}>
              Open match <ArrowRight size={14} />
            </Link>
          </div>
        ) : null}
        <section className={styles.panel}>
          <PanelHeading title="Recent verified results" />
          {loading ? (
            <RowSkeleton />
          ) : history.length ? (
            <div className={styles.resultRows}>
              {history.map((match) => (
                <Link href={`/app/player/matches/${match.id}`} key={match.id}>
                  <span className={match.result === 'win' ? styles.resultWin : match.result === 'loss' ? styles.resultLoss : styles.resultNeutral}>
                    {match.result}
                  </span>
                  <span>
                    <strong>vs {match.opponent_username}</strong>
                    <small>{formatGame(match.game)} · {formatDate(match.completed_at)}</small>
                  </span>
                  <em>{match.rating_change > 0 ? '+' : ''}{match.rating_change} rating</em>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyInline
              title="No completed matches yet"
              body="Enter a tournament or find a match to begin building a verified record."
              href="/tournaments"
              action="Find competition"
            />
          )}
        </section>
      </div>
    </V5AppShell>
  );
}

export function V5PlayerRankingsRoute() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardPayload | null>(null);
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(false);
      const [leaderboardResult, historyResult] = await Promise.all([
        fetch('/api/users/leaderboard/tournaments', { credentials: 'include' })
          .then(async (response) => ({
            ok: response.ok,
            payload: response.ok ? await response.json() : null,
          }))
          .catch(() => ({ ok: false, payload: null })),
        authFetch('/api/matches/history?limit=20')
          .then(async (response) => ({
            ok: response.ok,
            payload: response.ok ? await response.json() : { matches: [] },
          }))
          .catch(() => ({ ok: false, payload: { matches: [] } })),
      ]);

      if (!active) return;
      setLeaderboard(leaderboardResult.payload?.leaderboards ? leaderboardResult.payload : null);
      setHistory(Array.isArray(historyResult.payload?.matches) ? historyResult.payload.matches : []);
      setError(!leaderboardResult.ok || !historyResult.ok);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [authFetch, user]);

  const boards = leaderboard?.leaderboards ?? [];
  const summary = leaderboard?.summary;
  const username = user?.username ?? '';

  return (
    <V5AppShell workspace="player" section="rankings">
      <div className={styles.page}>
        <PageHeading
          eyebrow="Player workspace"
          title="Rankings"
          description="Verified Mechi standings by game, with your position highlighted when you qualify."
          actionHref="/leaderboard"
          actionLabel="Open full leaderboard"
        />
        {error ? <InlineNotice /> : null}
        <div className={styles.metricGrid}>
          <MetricCard icon={<UsersRound />} label="Verified players" value={formatNumber(summary?.players)} note="Across tournament boards" />
          <MetricCard icon={<Gamepad2 />} label="Ranked games" value={formatNumber(summary?.games)} note="Current Mechi season" />
          <MetricCard icon={<CheckCircle2 />} label="Verified results" value={formatNumber(summary?.verifiedResults)} note="Confirmed outcomes" />
          <MetricCard icon={<Swords />} label="Your match results" value={formatNumber(history.filter((match) => match.status === 'completed').length)} note="Saved in your record" />
        </div>
        {loading ? (
          <section className={styles.panel}><RowSkeleton /></section>
        ) : boards.length ? (
          <div className={styles.rankingGrid}>
            {boards.map((board) => {
              const current = board.leaderboard.find((entry) => entry.username?.toLowerCase() === username.toLowerCase());
              const visible = current && current.rank > 5 ? [...board.leaderboard.slice(0, 5), current] : board.leaderboard.slice(0, 6);
              return (
                <section className={styles.panel} key={board.game}>
                  <PanelHeading title={board.label} />
                  <p className={styles.boardMeta}>{board.players} players · {board.verifiedResults} verified results</p>
                  {visible.length ? (
                    <div className={styles.leaderboardRows}>
                      {visible.map((entry) => (
                        <Link
                          className={entry.username?.toLowerCase() === username.toLowerCase() ? styles.currentRank : undefined}
                          href={entry.username ? `/profile/${encodeURIComponent(entry.username)}` : '/leaderboard'}
                          key={entry.id}
                        >
                          <strong>#{entry.rank}</strong>
                          <span><b>{entry.name}</b><small>{entry.scoreText} · {entry.verifiedText}</small></span>
                          <ArrowRight size={15} />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.boardEmpty}>Verified standings have not been published for this game yet.</p>
                  )}
                  {!current ? (
                    <small className={styles.rankNote}>
                      Your saved results remain in Matches. You will appear here after meeting this board&apos;s verified tournament criteria.
                    </small>
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : (
          <section className={styles.panel}>
            <EmptyInline
              title="Rankings are temporarily unavailable"
              body="Your matches and registrations remain saved. Retry or open the public leaderboard."
              href="/leaderboard"
              action="View leaderboard"
            />
          </section>
        )}
      </div>
    </V5AppShell>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className={styles.pageHeading}>
      <div><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {actionHref && actionLabel ? (
        <Link className={styles.primaryButton} href={actionHref}>{actionLabel} <ArrowRight size={16} /></Link>
      ) : null}
    </header>
  );
}

function PanelHeading({ title }: { title: string }) {
  return <div className={styles.panelHeading}><h2>{title}</h2></div>;
}

function MetricCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return (
    <section className={styles.metricCard}>
      <span className={styles.metricIcon}>{icon}</span>
      <div><p>{label}</p><strong>{value}</strong><small>{note}</small></div>
    </section>
  );
}

function StatusChip({ children, tone }: { children: ReactNode; tone: 'success' | 'pending' }) {
  return <span className={`${styles.statusChip} ${styles[`status_${tone}`]}`}>{children}</span>;
}

function RowSkeleton() {
  return <div className={styles.rowSkeleton}><span /><span /><span /></div>;
}

function InlineNotice() {
  return (
    <div className={styles.inlineNotice}>
      <CircleAlert size={18} />
      <div>
        <strong>Some information did not load.</strong>
        <span>This screen remains usable. Refresh to retry only the affected Player data.</span>
      </div>
    </div>
  );
}

function EmptyInline({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <div className={styles.emptyInline}>
      <span><Trophy size={21} /></span>
      <div><strong>{title}</strong><p>{body}</p></div>
      <Link href={href}>{action} <ArrowRight size={14} /></Link>
    </div>
  );
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-KE').format(Number(value ?? 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(value));
}

function formatGame(value: string | null | undefined) {
  return value
    ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Gaming';
}
