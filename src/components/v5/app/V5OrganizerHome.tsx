'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ShieldCheck,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { V5AppShell } from '@/components/v5/app/V5AppShell';
import styles from './V5Home.module.css';

interface TournamentRecord {
  id: string;
  slug: string;
  title: string;
  game?: string | null;
  status?: string | null;
  scheduled_for?: string | null;
  size?: number | null;
  player_count?: number | null;
  entry_fee?: number | null;
  prize_pool?: number | null;
  approval_status?: string | null;
  organizer_id?: string | null;
}

type ActivationState = 'checking' | 'inactive' | 'active' | 'saving' | 'error';

export function V5OrganizerHome() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activation, setActivation] = useState<ActivationState>('checking');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const [tournamentResponse, workspaceResponse] = await Promise.all([
          fetch('/api/tournaments?status=all&limit=48', { credentials: 'include' }),
          authFetch('/api/v5/workspaces'),
        ]);
        const tournamentPayload = tournamentResponse.ok ? await tournamentResponse.json() : { tournaments: [] };
        const workspacePayload = workspaceResponse.ok
          ? await workspaceResponse.json() as { workspaces?: Array<{ type: string; persisted?: boolean }> }
          : null;

        if (!active) return;
        setTournaments(Array.isArray(tournamentPayload.tournaments) ? tournamentPayload.tournaments : []);
        const exists = workspacePayload?.workspaces?.some((item) => item.type === 'organizer' && item.persisted !== false);
        setActivation(workspaceResponse.ok ? (exists ? 'active' : 'inactive') : 'error');
        setError(!tournamentResponse.ok || !workspaceResponse.ok);
        setLoading(false);
      } catch {
        if (!active) return;
        setError(true);
        setActivation('error');
        setLoading(false);
      }
    }

    if (user) void load();
    return () => {
      active = false;
    };
  }, [authFetch, user]);

  const owned = useMemo(
    () => tournaments.filter((tournament) => tournament.organizer_id === user?.id),
    [tournaments, user?.id]
  );

  const needsAttention = useMemo(
    () => owned.filter((tournament) => ['pending', 'changes_requested'].includes(String(tournament.approval_status || '').toLowerCase())),
    [owned]
  );

  const openRegistration = owned.filter((tournament) => String(tournament.status || '').toLowerCase() === 'open');
  const activeTournament = owned.find((tournament) => String(tournament.status || '').toLowerCase() === 'active');
  const priorityTournament = needsAttention[0] || activeTournament || openRegistration[0] || owned[0] || null;
  const confirmedPlayers = owned.reduce((sum, tournament) => sum + Number(tournament.player_count ?? 0), 0);

  async function activateOrganizer() {
    setActivation('saving');
    try {
      const response = await authFetch('/api/v5/workspaces', {
        method: 'POST',
        body: JSON.stringify({ type: 'organizer', name: `${user?.username || 'Mechi'} tournaments` }),
      });
      setActivation(response.ok ? 'active' : 'error');
    } catch {
      setActivation('error');
    }
  }

  return (
    <V5AppShell workspace="organizer" section="">
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>Organizer home</p>
            <h1>Run the tournament, not the dashboard.</h1>
            <p>See what needs attention across your competitions, then jump directly into the tournament that needs you.</p>
          </div>
          <Link className={styles.primaryButton} href="/app/organizer/tournaments/new">
            Create tournament <ArrowRight size={16} />
          </Link>
        </header>

        {activation !== 'active' ? (
          <div className={styles.activationCard}>
            <ShieldCheck size={22} />
            <div>
              <h2>{activation === 'error' ? 'Organizer workspace needs attention.' : 'Activate Organizer before operating tournaments.'}</h2>
              <p>This enables the organizer workspace used to create and manage your competition records.</p>
            </div>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => void activateOrganizer()}
              disabled={activation === 'checking' || activation === 'saving'}
            >
              {activation === 'checking' ? 'Checking…' : activation === 'saving' ? 'Activating…' : 'Activate Organizer'}
            </button>
          </div>
        ) : null}

        {error ? (
          <div className={styles.notice} role="status">
            <CircleAlert size={19} />
            <div>
              <strong>Some organizer data could not be loaded.</strong>
              <span>Mechi is showing the information that is available instead of turning a failed request into an empty portfolio.</span>
            </div>
          </div>
        ) : null}

        <div className={styles.heroGrid}>
          <section className={styles.actionCard}>
            <div>
              <div className={styles.cardTopline}>
                <span><Clock3 size={16} /> Needs attention</span>
                <span className={`${styles.status} ${needsAttention.length ? styles.statusUrgent : ''}`}>
                  {needsAttention.length ? `${needsAttention.length} blocker${needsAttention.length === 1 ? '' : 's'}` : 'Clear'}
                </span>
              </div>

              {loading ? (
                <>
                  <div className={`${styles.skeleton} ${styles.skeletonLarge}`} />
                  <div className={styles.skeleton} />
                </>
              ) : needsAttention.length ? (
                <>
                  <p className={styles.kicker}>{formatGame(needsAttention[0].game)}</p>
                  <h2>{needsAttention[0].title} needs review.</h2>
                  <p>{String(needsAttention[0].approval_status).toLowerCase() === 'changes_requested' ? 'Changes were requested before this tournament can move forward.' : 'This tournament is waiting for its approval state to be resolved.'}</p>
                </>
              ) : activeTournament ? (
                <>
                  <p className={styles.kicker}>{formatGame(activeTournament.game)}</p>
                  <h2>{activeTournament.title} is active.</h2>
                  <p>Open tournament operations to manage participants, matches and results.</p>
                </>
              ) : openRegistration.length ? (
                <>
                  <p className={styles.kicker}>{formatGame(openRegistration[0].game)}</p>
                  <h2>{openRegistration[0].title} is taking entries.</h2>
                  <p>{openRegistration[0].player_count ?? 0} of {openRegistration[0].size ?? '—'} places are currently filled.</p>
                </>
              ) : owned.length ? (
                <>
                  <p className={styles.kicker}>Tournament portfolio</p>
                  <h2>No urgent organizer action right now.</h2>
                  <p>Open a tournament to review its current state or create the next competition.</p>
                </>
              ) : (
                <>
                  <p className={styles.kicker}>Start here</p>
                  <h2>Create your first tournament.</h2>
                  <p>Set the game, format, schedule, entry and reward, then publish or submit it for approval.</p>
                </>
              )}
            </div>

            <div className={styles.actions}>
              {priorityTournament ? (
                <Link className={styles.primaryButton} href={`/app/organizer/tournaments/${priorityTournament.slug}`}>
                  Open tournament <ArrowRight size={16} />
                </Link>
              ) : (
                <Link className={styles.primaryButton} href="/app/organizer/tournaments/new">
                  Create tournament <ArrowRight size={16} />
                </Link>
              )}
              <Link className={styles.secondaryButton} href="/app/organizer/tournaments">All tournaments</Link>
            </div>
          </section>

          <section className={styles.identityCard}>
            <div>
              <div className={styles.cardTopline}>
                <span><ShieldCheck size={16} /> Organizer status</span>
                <span className={styles.status}>{activation === 'active' ? 'Active' : 'Setup'}</span>
              </div>
              <div className={styles.identityValue}>{owned.length}</div>
              <div className={styles.identityLabel}>Tournaments on this account</div>
              <p>{needsAttention.length ? `${needsAttention.length} tournament${needsAttention.length === 1 ? '' : 's'} need approval attention.` : 'No approval blockers are visible right now.'}</p>
            </div>
            <Link className={styles.textLink} href="/app/organizer/organization">
              Organization settings <ArrowRight size={14} />
            </Link>
          </section>
        </div>

        <div className={styles.metricGrid}>
          <Metric label="Tournaments" value={loading ? '—' : String(owned.length)} note="Owned by this account" icon={<Trophy size={17} />} />
          <Metric label="Open registration" value={loading ? '—' : String(openRegistration.length)} note="Currently accepting entries" icon={<CheckCircle2 size={17} />} />
          <Metric label="Confirmed players" value={loading ? '—' : String(confirmedPlayers)} note="Across visible tournaments" icon={<UsersRound size={17} />} />
          <Metric label="Needs attention" value={loading ? '—' : String(needsAttention.length)} note={needsAttention.length ? 'Review approval state' : 'No approval blockers'} icon={<CircleAlert size={17} />} />
        </div>

        <div className={styles.twoColumn}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Your tournaments</h2>
              <Link className={styles.textLink} href="/app/organizer/tournaments">Manage all <ArrowRight size={14} /></Link>
            </div>
            {loading ? (
              <div className={styles.empty}>Loading your tournaments…</div>
            ) : owned.length ? (
              <div className={styles.list}>
                {owned.slice(0, 5).map((tournament) => (
                  <Link className={styles.row} href={`/app/organizer/tournaments/${tournament.slug}`} key={tournament.id}>
                    <div>
                      <strong>{tournament.title}</strong>
                      <small>{formatGame(tournament.game)} · {humanize(tournament.status)} · {formatSchedule(tournament.scheduled_for)}</small>
                      <div className={styles.registrationMeta}>
                        <span>{tournament.player_count ?? 0}/{tournament.size ?? '—'} players</span>
                        <span>{humanize(tournament.approval_status)}</span>
                      </div>
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            ) : !error ? (
              <div className={styles.empty}>
                <strong>No tournaments yet.</strong>
                <span>Create one and its operating state will appear here.</span>
              </div>
            ) : (
              <div className={styles.empty}>
                <strong>Tournament portfolio unavailable.</strong>
                <span>Mechi could not load this section right now.</span>
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}><h2>Operating checklist</h2></div>
            <div className={styles.checklist}>
              <CheckItem complete={activation === 'active'} title="Organizer workspace active" />
              <CheckItem complete={owned.length > 0} title="Tournament created" />
              <CheckItem complete={owned.some((tournament) => (tournament.player_count ?? 0) > 0)} title="Participant registered" />
              <CheckItem complete={owned.some((tournament) => String(tournament.status).toLowerCase() === 'completed')} title="Tournament completed" />
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

function formatGame(value?: string | null) {
  if (!value) return 'Competition';
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function humanize(value?: string | null) {
  if (!value) return 'Status pending';
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSchedule(value?: string | null) {
  if (!value) return 'Schedule pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Schedule pending';
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}
