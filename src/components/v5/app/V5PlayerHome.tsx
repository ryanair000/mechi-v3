'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Gamepad2,
  ShieldCheck,
  Swords,
  Trophy,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { V5AppShell } from '@/components/v5/app/V5AppShell';
import styles from './V5Home.module.css';

interface CurrentMatch {
  id: string;
  game?: string | null;
  status?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
  player1?: { username?: string | null } | null;
  player2?: { username?: string | null } | null;
}

interface PlayerRegistration {
  id: string;
  source: 'tournament' | 'playmechi' | 'weka_mawe';
  title: string;
  game: string | null;
  status: string;
  payment_status: string | null;
  registered_at: string;
  href: string;
  detail: string | null;
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

interface PlayerHomeData {
  currentMatch: CurrentMatch | null;
  registrations: PlayerRegistration[];
  history: MatchHistoryItem[];
  loading: boolean;
  error: boolean;
  matchLoaded: boolean;
  registrationsLoaded: boolean;
  historyLoaded: boolean;
}

const INITIAL_DATA: PlayerHomeData = {
  currentMatch: null,
  registrations: [],
  history: [],
  loading: true,
  error: false,
  matchLoaded: false,
  registrationsLoaded: false,
  historyLoaded: false,
};

export function V5PlayerHome() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [data, setData] = useState<PlayerHomeData>(INITIAL_DATA);

  useEffect(() => {
    let active = true;

    async function load() {
      setData((current) => ({ ...current, loading: true, error: false }));
      try {
        const [matchResponse, registrationResponse, historyResponse] = await Promise.all([
          authFetch('/api/matches/current'),
          authFetch('/api/v5/player-history'),
          authFetch('/api/matches/history?limit=8'),
        ]);

        const matchPayload = matchResponse.ok ? await matchResponse.json() : { match: null };
        const registrationPayload = registrationResponse.ok ? await registrationResponse.json() : { registrations: [] };
        const historyPayload = historyResponse.ok ? await historyResponse.json() : { matches: [] };

        if (!active) return;
        setData({
          currentMatch: matchPayload.match ?? null,
          registrations: Array.isArray(registrationPayload.registrations) ? registrationPayload.registrations : [],
          history: Array.isArray(historyPayload.matches) ? historyPayload.matches : [],
          loading: false,
          error: !matchResponse.ok || !registrationResponse.ok || !historyResponse.ok,
          matchLoaded: matchResponse.ok,
          registrationsLoaded: registrationResponse.ok,
          historyLoaded: historyResponse.ok,
        });
      } catch {
        if (active) setData((current) => ({ ...current, loading: false, error: true }));
      }
    }

    if (user) void load();
    return () => {
      active = false;
    };
  }, [authFetch, user]);

  const completed = useMemo(
    () => data.history.filter((match) => match.status === 'completed' || ['win', 'loss', 'draw'].includes(match.result)),
    [data.history]
  );
  const wins = completed.filter((match) => match.result === 'win').length;
  const winRate = completed.length ? Math.round((wins / completed.length) * 100) : 0;
  const activeRegistration = useMemo(() => {
    const priority = [...data.registrations].sort((left, right) => {
      const leftPayment = needsPayment(left) ? 1 : 0;
      const rightPayment = needsPayment(right) ? 1 : 0;
      if (leftPayment !== rightPayment) return rightPayment - leftPayment;
      return new Date(right.registered_at).getTime() - new Date(left.registered_at).getTime();
    });
    return priority[0] ?? null;
  }, [data.registrations]);

  const firstName = user?.username?.split(/[ _-]/)[0] || 'player';
  const opponent = data.currentMatch
    ? data.currentMatch.player1_id === user?.id
      ? data.currentMatch.player2?.username
      : data.currentMatch.player1?.username
    : null;

  return (
    <V5AppShell workspace="player" section="">
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>Player home</p>
            <h1>Welcome back, {firstName}.</h1>
            <p>See the one thing that needs your attention, then get back to competing.</p>
          </div>
          <Link className={styles.primaryButton} href="/tournaments">
            Find a tournament <ArrowRight size={16} />
          </Link>
        </header>

        {data.error ? (
          <div className={styles.notice} role="status">
            <CircleAlert size={19} />
            <div>
              <strong>Some player data could not be loaded.</strong>
              <span>Available information is shown below. Missing data is not being reported as zero.</span>
            </div>
          </div>
        ) : null}

        <div className={styles.heroGrid}>
          <section className={styles.actionCard}>
            <div>
              <div className={styles.cardTopline}>
                <span><Swords size={16} /> Next action</span>
                <span className={`${styles.status} ${data.currentMatch || (activeRegistration && needsPayment(activeRegistration)) ? styles.statusUrgent : ''}`}>
                  {data.currentMatch ? 'Match active' : activeRegistration && needsPayment(activeRegistration) ? 'Action needed' : 'Ready'}
                </span>
              </div>

              {data.loading ? (
                <>
                  <div className={`${styles.skeleton} ${styles.skeletonLarge}`} />
                  <div className={styles.skeleton} />
                </>
              ) : data.currentMatch ? (
                <>
                  <p className={styles.kicker}>{formatGame(data.currentMatch.game)}</p>
                  <h2>Open your match vs {opponent || 'your opponent'}.</h2>
                  <p>Your match is already active. Review the room, deadline and result controls before doing anything else.</p>
                </>
              ) : activeRegistration && needsPayment(activeRegistration) ? (
                <>
                  <p className={styles.kicker}>{formatGame(activeRegistration.game)}</p>
                  <h2>Finish your entry for {activeRegistration.title}.</h2>
                  <p>Your tournament entry still needs payment or payment confirmation before it is complete.</p>
                </>
              ) : activeRegistration ? (
                <>
                  <p className={styles.kicker}>{formatGame(activeRegistration.game)}</p>
                  <h2>You are entered in {activeRegistration.title}.</h2>
                  <p>{activeRegistration.detail || 'Open the tournament to review your entry and the next competition step.'}</p>
                </>
              ) : (
                <>
                  <p className={styles.kicker}>No active competition</p>
                  <h2>Find your next tournament.</h2>
                  <p>You have no current match or tournament entry requiring action.</p>
                </>
              )}
            </div>

            <div className={styles.actions}>
              {data.currentMatch ? (
                <Link className={styles.primaryButton} href={`/app/player/matches/${data.currentMatch.id}`}>
                  Open match room <ArrowRight size={16} />
                </Link>
              ) : activeRegistration ? (
                <Link className={styles.primaryButton} href={activeRegistration.href || '/app/player/tournaments'}>
                  {needsPayment(activeRegistration) ? 'Complete entry' : 'Open tournament'} <ArrowRight size={16} />
                </Link>
              ) : (
                <Link className={styles.primaryButton} href="/tournaments">
                  Browse tournaments <ArrowRight size={16} />
                </Link>
              )}
              <Link className={styles.secondaryButton} href="/app/player/challenges">1v1 challenges</Link>
            </div>
          </section>

          <section className={styles.identityCard}>
            <div>
              <div className={styles.cardTopline}>
                <span><ShieldCheck size={16} /> Mechi record</span>
                <span className={styles.status}>Live identity</span>
              </div>
              <div className={styles.identityValue}>{formatNumber(user?.mp)}</div>
              <div className={styles.identityLabel}>Current Mechi rating</div>
              <p>{user?.selected_games?.length ? `${user.selected_games.length} game${user.selected_games.length === 1 ? '' : 's'} connected.` : 'Connect a game ID before entering competitions that require it.'}</p>
            </div>
            <Link className={styles.textLink} href="/app/player/profile">
              Open profile <ArrowRight size={14} />
            </Link>
          </section>
        </div>

        <div className={styles.metricGrid}>
          <Metric label="Verified matches" value={data.historyLoaded ? String(completed.length) : '—'} note="From loaded match history" icon={<Swords size={17} />} />
          <Metric label="Wins" value={data.historyLoaded ? String(wins) : '—'} note={data.historyLoaded ? `${winRate}% win rate` : 'History unavailable'} icon={<Trophy size={17} />} />
          <Metric label="Tournament entries" value={data.registrationsLoaded ? String(data.registrations.length) : '—'} note="Entries on your record" icon={<CheckCircle2 size={17} />} />
          <Metric label="Games connected" value={String(user?.selected_games?.length ?? 0)} note="Used for eligibility" icon={<Gamepad2 size={17} />} />
        </div>

        <div className={styles.twoColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Your competitions</h2>
              <Link className={styles.textLink} href="/app/player/tournaments">See all <ArrowRight size={14} /></Link>
            </div>
            {data.loading ? (
              <div className={styles.empty}>Loading your tournament entries…</div>
            ) : data.registrations.length ? (
              <div className={styles.list}>
                {data.registrations.slice(0, 4).map((registration) => (
                  <Link className={styles.row} href={registration.href || '/app/player/tournaments'} key={registration.id}>
                    <div>
                      <strong>{registration.title}</strong>
                      <small>{formatGame(registration.game)} · {registration.detail || humanize(registration.status)}</small>
                      <div className={styles.registrationMeta}>
                        <span>{needsPayment(registration) ? 'Payment required' : humanize(registration.status)}</span>
                      </div>
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            ) : data.registrationsLoaded ? (
              <div className={styles.empty}>
                <strong>No tournament entries yet.</strong>
                <span>Join a competition and it will appear here.</span>
              </div>
            ) : (
              <div className={styles.empty}>
                <strong>Tournament entries unavailable.</strong>
                <span>Mechi could not load this section right now.</span>
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}><h2>Competition readiness</h2></div>
            <div className={styles.checklist}>
              <CheckItem complete title="Mechi account ready" />
              <CheckItem complete={Boolean(user?.selected_games?.length)} title="Game account connected" />
              <CheckItem complete={data.registrationsLoaded && data.registrations.length > 0} title="Tournament entry on record" />
              <CheckItem complete={data.historyLoaded && completed.length > 0} title="Verified match completed" />
            </div>
          </section>
        </div>
      </div>
    </V5AppShell>
  );
}

function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricTop}><span>{icon} {label}</span></div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function CheckItem({ complete, title }: { complete: boolean; title: string }) {
  return (
    <div className={styles.checkItem}>
      {complete ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
      <span>{title}</span>
    </div>
  );
}

function needsPayment(registration: PlayerRegistration) {
  const value = `${registration.payment_status || ''} ${registration.status || ''}`.toLowerCase();
  return ['pending_payment', 'payment_pending', 'unpaid', 'pending payment'].some((token) => value.includes(token));
}

function formatGame(value?: string | null) {
  if (!value) return 'Competition';
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function humanize(value?: string | null) {
  if (!value) return 'Status pending';
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat('en-KE').format(Number(value ?? 0));
}
