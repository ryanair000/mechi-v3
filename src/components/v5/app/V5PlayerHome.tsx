'use client';

import Link from 'next/link';
import { ArrowRight, Bell, CircleAlert, Gamepad2, Swords, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { V5AppShell } from '@/components/v5/app/V5AppShell';
import styles from './V5CoreHome.module.css';

interface CurrentMatch {
  id: string;
  game?: string | null;
  player1_id?: string | null;
  player1?: { username?: string | null } | null;
  player2?: { username?: string | null } | null;
}

interface Registration {
  id: string;
  title: string;
  game: string | null;
  status: string;
  payment_status: string | null;
  href: string;
  detail: string | null;
}

interface HistoryItem {
  id: string;
  game: string;
  opponent_username: string;
  result: string;
  completed_at: string;
}

interface NotificationItem {
  id: string;
  title: string;
  href?: string | null;
  read_at?: string | null;
}

export function V5PlayerHome() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [match, setMatch] = useState<CurrentMatch | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      setError(false);
      try {
        const [matchResponse, registrationResponse, historyResponse, notificationResponse] = await Promise.all([
          authFetch('/api/matches/current'),
          authFetch('/api/v5/player-history'),
          authFetch('/api/matches/history?limit=8'),
          authFetch('/api/notifications?limit=8'),
        ]);

        const matchPayload = matchResponse.ok ? await matchResponse.json() : { match: null };
        const registrationPayload = registrationResponse.ok ? await registrationResponse.json() : { registrations: [] };
        const historyPayload = historyResponse.ok ? await historyResponse.json() : { matches: [] };
        const notificationPayload = notificationResponse.ok ? await notificationResponse.json() : { notifications: [], unreadCount: 0 };
        if (!active) return;
        setMatch(matchPayload.match ?? null);
        setRegistrations(Array.isArray(registrationPayload.registrations) ? registrationPayload.registrations : []);
        setHistory(Array.isArray(historyPayload.matches) ? historyPayload.matches : []);
        setNotifications(Array.isArray(notificationPayload.notifications) ? notificationPayload.notifications : []);
        setUnreadCount(Number(notificationPayload.unreadCount ?? 0));
        setError(!matchResponse.ok || !registrationResponse.ok || !historyResponse.ok || !notificationResponse.ok);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [authFetch, user]);

  const pendingPayment = useMemo(
    () => registrations.find((item) => ['pending', 'unpaid', 'initiated'].includes(String(item.payment_status ?? '').toLowerCase())),
    [registrations]
  );
  const activeRegistration = useMemo(
    () => registrations.find((item) => !['completed', 'cancelled', 'canceled'].includes(String(item.status ?? '').toLowerCase())),
    [registrations]
  );
  const opponent = match
    ? match.player1_id === user?.id
      ? match.player2?.username
      : match.player1?.username
    : null;
  const wins = history.filter((item) => String(item.result).toLowerCase() === 'win').length;
  const firstName = user?.username?.split(/[ _-]/)[0] || 'player';

  const nextAction = match
    ? {
        label: 'Match ready',
        title: `Play ${opponent ? `vs ${opponent}` : 'your current match'}`,
        copy: 'Your match room is the most important thing on Mechi right now. Open it to review the deadline, evidence and result flow.',
        href: `/app/player/matches/${match.id}`,
        cta: 'Open match room',
      }
    : pendingPayment
      ? {
          label: 'Payment required',
          title: `Complete entry for ${pendingPayment.title}`,
          copy: pendingPayment.detail || 'Your tournament entry is not complete yet. Finish the payment step to secure your place.',
          href: pendingPayment.href || '/app/player/tournaments',
          cta: 'Complete entry',
        }
      : activeRegistration
        ? {
            label: 'Competition in progress',
            title: activeRegistration.title,
            copy: activeRegistration.detail || 'You are entered. Review the competition page for check-in, schedule and your next tournament step.',
            href: activeRegistration.href || '/app/player/tournaments',
            cta: 'View competition',
          }
        : {
            label: 'Ready to compete',
            title: 'Find your next tournament',
            copy: 'You have no urgent competition action. Browse real tournaments and join one that fits your game, schedule and region.',
            href: '/tournaments',
            cta: 'Find tournaments',
          };

  return (
    <V5AppShell workspace="player" section="">
      <div className={styles.page}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Player home</p>
            <h1>Welcome back, {firstName}.</h1>
            <p>Mechi should answer one question first: what do you need to do next?</p>
          </div>
          <Link className={styles.secondary} href="/tournaments">Browse tournaments <ArrowRight size={16} /></Link>
        </div>

        {error ? <div className={styles.error}><CircleAlert size={16} /> Some player data could not be loaded. The sections that did load are still shown below.</div> : null}

        {loading ? <div className={styles.loading} /> : (
          <section className={styles.actionCard}>
            <div className={styles.actionTop}>
              <span className={styles.actionLabel}><Swords size={16} /> Action required</span>
              <span className={styles.badge}>{nextAction.label}</span>
            </div>
            <div>
              <h2>{nextAction.title}</h2>
              <p>{nextAction.copy}</p>
            </div>
            <div className={styles.actions}>
              <Link className={styles.primary} href={nextAction.href}>{nextAction.cta} <ArrowRight size={16} /></Link>
            </div>
          </section>
        )}

        <div className={styles.stats}>
          <div className={styles.stat}><strong>{registrations.length}</strong><span>Competition entries</span></div>
          <div className={styles.stat}><strong>{history.length}</strong><span>Recent verified matches</span></div>
          <div className={styles.stat}><strong>{wins}</strong><span>Wins in recent history</span></div>
        </div>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div><p className={styles.eyebrow}>Your competitions</p><h2>Entries and progress</h2></div>
              <Trophy size={22} />
            </div>
            <div className={styles.list}>
              {registrations.slice(0, 5).map((item) => (
                <div className={styles.row} key={item.id}>
                  <div className={styles.rowMeta}>
                    <strong>{item.title}</strong>
                    <small>{item.game || 'Competition'} · {item.status}</small>
                  </div>
                  <Link className={styles.secondary} href={item.href || '/app/player/tournaments'}>Open</Link>
                </div>
              ))}
              {!loading && registrations.length === 0 ? <p className={styles.empty}>No competition entries yet. Your first tournament will appear here after you join.</p> : null}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div><p className={styles.eyebrow}>Inbox</p><h2>{unreadCount ? `${unreadCount} unread` : 'You are caught up'}</h2></div>
              <Bell size={22} />
            </div>
            <div className={styles.list}>
              {notifications.slice(0, 4).map((item) => (
                <div className={styles.row} key={item.id}>
                  <div className={styles.rowMeta}><strong>{item.title}</strong><small>{item.read_at ? 'Read' : 'Unread'}</small></div>
                  {item.href ? <Link className={styles.secondary} href={item.href}>Open</Link> : null}
                </div>
              ))}
              {!loading && notifications.length === 0 ? <p className={styles.empty}>No new notifications.</p> : null}
            </div>
            <Link className={styles.secondary} href="/app/player/inbox">Open inbox</Link>
          </section>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><p className={styles.eyebrow}>Competitive record</p><h2>Recent match history</h2></div>
            <Gamepad2 size={22} />
          </div>
          <div className={styles.list}>
            {history.slice(0, 5).map((item) => (
              <div className={styles.row} key={item.id}>
                <div className={styles.rowMeta}><strong>{item.game} vs {item.opponent_username}</strong><small>{new Date(item.completed_at).toLocaleDateString()}</small></div>
                <span className={styles.badge}>{item.result}</span>
              </div>
            ))}
            {!loading && history.length === 0 ? <p className={styles.empty}>Verified match results will build your record here.</p> : null}
          </div>
          <div className={styles.actions}>
            <Link className={styles.secondary} href="/app/player/matches">All matches</Link>
            <Link className={styles.secondary} href="/app/player/rankings">Rankings</Link>
          </div>
        </section>
      </div>
    </V5AppShell>
  );
}
