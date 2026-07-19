'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gamepad2,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { V5AdminWorkspace } from '@/components/v5/app/V5AdminWorkspace';
import { V51v1Challenges } from '@/components/v5/app/V51v1Challenges';
import { V5AppShell } from '@/components/v5/app/V5AppShell';
import { V5MatchRoom } from '@/components/v5/app/V5MatchRoom';
import { V5PlayerTournamentFlow } from '@/components/v5/app/V5PlayerTournamentFlow';
import { V5RoleSection } from '@/components/v5/app/V5RoleSection';
import { V5TournamentWizard } from '@/components/v5/app/V5TournamentWizard';
import { V5_WORKSPACES, type V5WorkspaceKind } from '@/components/v5/app/v5-workspaces';
import styles from './V5WorkspaceRoute.module.css';

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
  participant_type?: 'solo' | 'team' | null;
  team_size?: number | null;
  valuable_reward_exists?: boolean | null;
  reward_description?: string | null;
}

interface MatchRecord {
  id: string;
  game?: string | null;
  status?: string | null;
  player1_id?: string | null;
  player2_id?: string | null;
  player1?: { username?: string | null } | null;
  player2?: { username?: string | null } | null;
}

interface RewardSummary {
  available?: number;
  pending?: number;
  lifetime?: number;
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

interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  href?: string | null;
  read_at?: string | null;
  created_at: string;
}

interface LiveWorkspaceData {
  tournaments: TournamentRecord[];
  currentMatch: MatchRecord | null;
  rewards: RewardSummary | null;
  matchHistory: MatchHistoryItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: boolean;
}

const EMPTY_DATA: LiveWorkspaceData = {
  tournaments: [],
  currentMatch: null,
  rewards: null,
  matchHistory: [],
  notifications: [],
  unreadCount: 0,
  loading: true,
  error: false,
};

const SECTION_COPY: Record<string, { title: string; description: string; action?: string }> = {
  tournaments: { title: 'Tournaments', description: 'Discover, enter and track tournaments that fit your games.', action: 'Browse tournaments' },
  challenges: { title: '1v1 Challenges', description: 'Find compatible opponents, manage callouts and start verified head-to-head matches.' },
  matches: { title: 'Matches', description: 'See current match rooms, deadlines, results and disputes.' },
  teams: { title: 'Teams', description: 'Create or join a team and become tournament-ready.', action: 'Create a team' },
  rankings: { title: 'Rankings', description: 'Follow verified performance by game, region and season.' },
  wallet: { title: 'Wallet & receipts', description: 'Understand every payment, protected amount, prize and payout state.' },
  inbox: { title: 'Inbox', description: 'Notifications and conversations from every Mechi workspace.' },
  profile: { title: 'Profile & account', description: 'Manage public identity, game accounts, privacy and security.' },
  roster: { title: 'Team roster', description: 'Assign captains, starters and substitutes, then verify readiness.', action: 'Invite a member' },
  invitations: { title: 'Invitations', description: 'Review team and workspace invitations, access and expiry.' },
  settings: { title: 'Workspace settings', description: 'Manage identity, permissions, preferences and safe workspace exit.' },
  participants: { title: 'Participants & check-in', description: 'Track entry, eligibility, payment, rosters and check-in.' },
  communications: { title: 'Communications', description: 'Send clear, targeted tournament updates and track delivery.', action: 'Create announcement' },
  finance: { title: 'Tournament finance', description: 'Review entry payments, protected funds, fees, prizes and payout blockers.' },
  analytics: { title: 'Analytics & reports', description: 'Measure credible delivery, participation and tournament outcomes.' },
  organization: { title: 'Organization', description: 'Build a verified organizer identity and public delivery record.' },
  staff: { title: 'Staff & access', description: 'Give each person the least access needed for their work.', action: 'Invite staff' },
  content: { title: 'Content library', description: 'Plan, publish and connect content to tournament context.', action: 'Add content' },
  live: { title: 'Live console', description: 'Prepare, start and monitor assigned tournament coverage.' },
  coverage: { title: 'Coverage assignments', description: 'Manage terms, schedules, readiness, links and evidence.' },
  opportunities: { title: 'Creator opportunities', description: 'Find tournament coverage suited to your games and audience.' },
  audience: { title: 'Audience', description: 'Understand reach and growth from verified competition coverage.' },
  reports: { title: 'Reports', description: 'Review delivery, evidence and exportable performance summaries.' },
  expertise: { title: 'Expertise', description: 'Show the games, credentials and verified outcomes behind your authority.' },
  guides: { title: 'Guides', description: 'Create practical learning resources for competitive gamers.', action: 'Create guide' },
  analysis: { title: 'Analysis', description: 'Break down matches, evidence and patterns into useful insight.', action: 'Start analysis' },
  preparation: { title: 'Team preparation', description: 'Build checklists and tournament-specific preparation material.' },
  results: { title: 'Authority results', description: 'Connect your work to public, verified competition outcomes.' },
  marketplace: { title: 'Sponsorship marketplace', description: 'Find credible tournament communities that match your goals.' },
  briefs: { title: 'Sponsor briefs', description: 'Define audience, region, games, budget band and deliverables.', action: 'Create brief' },
  proposals: { title: 'Proposals', description: 'Review terms, protections, suitability and Mechi approval state.' },
  campaigns: { title: 'Active campaigns', description: 'Track deliverables, deadlines, evidence and campaign health.' },
  evidence: { title: 'Campaign evidence', description: 'Review submitted proof and request clear revisions.' },
  company: { title: 'Company & team', description: 'Manage company verification, public identity and staff permissions.' },
  venue: { title: 'Venue', description: 'Describe the shop, location, equipment and operational capacity.' },
  community: { title: 'Local community', description: 'Understand the players and tournaments connected to this venue.' },
};

export function V5WorkspaceRoute({ workspace, section }: { workspace: V5WorkspaceKind; section: string }) {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [data, setData] = useState<LiveWorkspaceData>(EMPTY_DATA);

  useEffect(() => {
    let active = true;
    async function load() {
      setData((current) => ({ ...current, loading: true, error: false }));
      try {
        const [tournamentResponse, matchResponse, rewardResponse, historyResponse, notificationResponse] = await Promise.all([
          fetch('/api/tournaments?status=all&limit=24', { credentials: 'include' }),
          authFetch('/api/matches/current'),
          authFetch('/api/rewards/summary'),
          authFetch('/api/matches/history?limit=20'),
          authFetch('/api/notifications?limit=30'),
        ]);
        const tournamentPayload = tournamentResponse.ok ? await tournamentResponse.json() : { tournaments: [] };
        const matchPayload = matchResponse.ok ? await matchResponse.json() : { match: null };
        const rewardPayload = rewardResponse.ok ? await rewardResponse.json() : { summary: null };
        const historyPayload = historyResponse.ok ? await historyResponse.json() : { matches: [] };
        const notificationPayload = notificationResponse.ok ? await notificationResponse.json() : { notifications: [], unreadCount: 0 };
        if (active) {
          setData({
            tournaments: Array.isArray(tournamentPayload.tournaments) ? tournamentPayload.tournaments : [],
            currentMatch: matchPayload.match ?? null,
            rewards: rewardPayload.summary ?? null,
            matchHistory: Array.isArray(historyPayload.matches) ? historyPayload.matches : [],
            notifications: Array.isArray(notificationPayload.notifications) ? notificationPayload.notifications : [],
            unreadCount: Number(notificationPayload.unreadCount ?? 0),
            loading: false,
            error: !tournamentResponse.ok,
          });
        }
      } catch {
        if (active) setData((current) => ({ ...current, loading: false, error: true }));
      }
    }
    if (user) void load();
    return () => { active = false; };
  }, [authFetch, user]);

  return (
    <V5AppShell workspace={workspace} section={section.split('/')[0] ?? ''}>
      {workspace === 'admin' ? (
        <V5AdminWorkspace section={section} />
      ) : section ? (
        <WorkspaceSection workspace={workspace} section={section} data={data} />
      ) : (
        <WorkspaceOverview workspace={workspace} data={data} />
      )}
    </V5AppShell>
  );
}

function WorkspaceOverview({ workspace, data }: { workspace: V5WorkspaceKind; data: LiveWorkspaceData }) {
  const { user } = useAuth();
  const [renderedAt] = useState(() => Date.now());
  const organizerTournaments = useMemo(
    () => data.tournaments.filter((tournament) => tournament.organizer_id === user?.id),
    [data.tournaments, user?.id]
  );

  const firstName = user?.username?.split(/[ _-]/)[0] || 'player';
  const nextTournament = data.tournaments
    .filter((tournament) => !tournament.scheduled_for || new Date(tournament.scheduled_for).getTime() > renderedAt)
    .sort((a, b) => String(a.scheduled_for ?? '').localeCompare(String(b.scheduled_for ?? '')))[0];

  if (workspace === 'player') {
    const opponent = data.currentMatch
      ? data.currentMatch.player1_id === user?.id
        ? data.currentMatch.player2?.username
        : data.currentMatch.player1?.username
      : null;
    return (
      <div className={styles.page}>
        <PageHeading
          eyebrow="Player workspace"
          title={`Welcome back, ${firstName}`}
          description="Your next competition action, verified progress and reputation—together."
          actionHref="/tournaments"
          actionLabel="Find a tournament"
        />
        {data.error ? <InlineNotice /> : null}
        <div className={styles.playerHeroGrid}>
          <section className={styles.nextCard}>
            <div className={styles.cardTopline}><span><CalendarClock size={16} /> Next competition</span><StatusChip tone={data.currentMatch ? 'danger' : 'success'}>{data.currentMatch ? 'Action needed' : 'Ready to join'}</StatusChip></div>
            {data.loading ? <CardSkeleton /> : data.currentMatch ? (
              <>
                <p className={styles.kicker}>{data.currentMatch.game || 'Competitive match'}</p>
                <h2>Match vs {opponent || 'your opponent'}</h2>
                <p>Your match room is ready. Open it to review the deadline and submit results.</p>
                <Link className={styles.primaryButton} href={`/app/player/matches/${data.currentMatch.id}`}>Open match room <ArrowRight size={17} /></Link>
              </>
            ) : nextTournament ? (
              <>
                <p className={styles.kicker}>{formatGame(nextTournament.game)}</p>
                <h2>{nextTournament.title}</h2>
                <p>{formatTournamentMeta(nextTournament)}</p>
                <Link className={styles.primaryButton} href={`/tournaments/${nextTournament.slug}`}>View tournament <ArrowRight size={17} /></Link>
              </>
            ) : (
              <EmptyInline title="No upcoming tournament yet" body="Browse active tournaments and choose one that matches your game and region." href="/tournaments" action="Browse tournaments" />
            )}
          </section>

          <section className={styles.reputationCard}>
            <div className={styles.cardTopline}><span><ShieldCheck size={16} /> Competition identity</span><StatusChip tone="success">Active</StatusChip></div>
            <div className={styles.ratingRow}>
              <div><strong>{user?.mp ?? 0}</strong><span>Mechi rating</span></div>
              <div className={styles.rankBadge}><Trophy size={23} /><span>Level {user?.level ?? 1}</span></div>
            </div>
            <div className={styles.progressTrack}><span style={{ width: `${Math.min(100, Math.max(6, (user?.xp ?? 0) % 100))}%` }} /></div>
            <p>{user?.xp ?? 0} XP · {user?.win_streak ?? 0} current win streak</p>
            <Link className={styles.textLink} href="/app/player/profile">View reputation record <ArrowRight size={15} /></Link>
          </section>
        </div>

        <div className={styles.metricGrid}>
          <MetricCard icon={<Trophy />} label="Rating" value={formatNumber(user?.mp)} note="Verified matches only" />
          <MetricCard icon={<Swords />} label="Win streak" value={formatNumber(user?.win_streak)} note={`Best: ${user?.max_win_streak ?? 0}`} />
          <MetricCard icon={<WalletCards />} label="Available points" value={formatNumber(data.rewards?.available ?? user?.reward_points_available)} note={`${formatNumber(data.rewards?.pending ?? user?.reward_points_pending)} pending`} />
          <MetricCard icon={<Gamepad2 />} label="Games connected" value={String(user?.selected_games?.length ?? 0)} note="Complete IDs to enter" />
        </div>

        <div className={styles.twoColumn}>
          <section className={styles.panel}>
            <PanelHeading title="Recommended tournaments" href="/tournaments" link="View all" />
            <TournamentRows tournaments={data.tournaments.slice(0, 4)} loading={data.loading} />
          </section>
          <section className={styles.panel}>
            <PanelHeading title="Build your competition record" />
            <Checklist
              items={[
                { label: 'Create your Mechi identity', complete: true },
                { label: 'Connect a game account', complete: Boolean(user?.selected_games?.length) },
                { label: 'Enter your first tournament', complete: false },
                { label: 'Complete a verified result', complete: false },
              ]}
            />
            <div className={styles.creatorPrompt}>
              <Radio size={19} />
              <div><strong>Also create tournament content?</strong><span>Activate Creator Studio from the workspace switcher.</span></div>
              <Link href="/app/creator">Explore</Link>
            </div>
            <div className={styles.creatorPrompt}>
              <Swords size={19} />
              <div><strong>Want a direct matchup?</strong><span>Find a compatible player and send a verified 1v1 challenge.</span></div>
              <Link href="/app/player/challenges">Challenge</Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (workspace === 'organizer') {
    const openIssues = organizerTournaments.filter((item) => ['pending', 'changes_requested'].includes(item.approval_status ?? '')).length;
    return (
      <div className={styles.page}>
        <PageHeading
          eyebrow="Organizer portfolio"
          title="Run credible tournaments without the chaos."
          description="Drafts, approvals, live issues and next actions across every tournament you operate."
          actionHref="/app/organizer/tournaments/new"
          actionLabel="Create tournament"
        />
        <PolicyNotice />
        <div className={styles.metricGrid}>
          <MetricCard icon={<Trophy />} label="Tournaments" value={String(organizerTournaments.length)} note="Owned by this account" />
          <MetricCard icon={<CheckCircle2 />} label="Open registration" value={String(organizerTournaments.filter((item) => item.status === 'open').length)} note="Public and active" />
          <MetricCard icon={<CircleAlert />} label="Needs attention" value={String(openIssues)} note={openIssues ? 'Review the approval state' : 'No approval blockers'} tone={openIssues ? 'coral' : 'teal'} />
          <MetricCard icon={<UsersRound />} label="Confirmed players" value={String(organizerTournaments.reduce((sum, item) => sum + Number(item.player_count ?? 0), 0))} note="Across visible tournaments" />
        </div>
        <div className={styles.organizerGrid}>
          <section className={styles.panel}>
            <PanelHeading title="Your tournaments" href="/app/organizer/tournaments" link="Manage all" />
            <TournamentRows tournaments={organizerTournaments.slice(0, 5)} loading={data.loading} organizer />
          </section>
          <section className={styles.panel}>
            <PanelHeading title="Credibility checklist" />
            <Checklist items={[
              { label: 'Organizer identity', complete: true },
              { label: 'Public organization profile', complete: Boolean(organizerTournaments.length) },
              { label: 'Rules and dispute policy', complete: Boolean(organizerTournaments.length) },
              { label: 'Complete first tournament', complete: organizerTournaments.some((item) => item.status === 'completed') },
            ]} />
          </section>
        </div>
      </div>
    );
  }

  return <RoleOverview workspace={workspace} />;
}

function RoleOverview({ workspace }: { workspace: V5WorkspaceKind }) {
  const definition = V5_WORKSPACES[workspace];
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [activation, setActivation] = useState<'checking' | 'inactive' | 'active' | 'saving' | 'error'>('checking');

  useEffect(() => {
    let current = true;
    async function checkWorkspace() {
      if (workspace === 'team') {
        try {
          const response = await authFetch('/api/v5/teams');
          const payload = response.ok ? await response.json() as { teams?: unknown[] } : null;
          if (current) setActivation(payload?.teams?.length ? 'active' : 'inactive');
        } catch {
          if (current) setActivation('error');
        }
        return;
      }
      try {
        const response = await authFetch('/api/v5/workspaces');
        const payload = response.ok ? await response.json() as { workspaces?: Array<{ type: string; persisted?: boolean }> } : null;
        const exists = payload?.workspaces?.some((item) => item.type === workspace && item.persisted !== false);
        if (current) setActivation(exists ? 'active' : 'inactive');
      } catch {
        if (current) setActivation('error');
      }
    }
    if (user) void checkWorkspace();
    return () => { current = false; };
  }, [authFetch, user, workspace]);

  async function activateWorkspace() {
    setActivation('saving');
    try {
      const response = await authFetch(workspace === 'team' ? '/api/v5/teams' : '/api/v5/workspaces', {
        method: 'POST',
        body: JSON.stringify(workspace === 'team' ? {
          name: `${user?.username || 'Mechi'} squad`,
          game: user?.selected_games?.[0],
          platform: user?.platforms?.[0],
        } : { type: workspace }),
      });
      setActivation(response.ok ? 'active' : 'error');
    } catch {
      setActivation('error');
    }
  }
  const content: Record<Exclude<V5WorkspaceKind, 'player' | 'organizer' | 'admin'>, {
    eyebrow: string; title: string; description: string; action: string; cards: Array<[string, string]>; steps: string[];
  }> = {
    team: { eyebrow: 'Team workspace', title: 'Build a competition-ready team.', description: 'Roster roles, invitations, game accounts and tournament readiness in one shared workspace.', action: 'Create team', cards: [['Roster', 'Invite players and assign starters.'], ['Readiness', 'Resolve eligibility before registration.'], ['Team record', 'Build authority from verified results.']], steps: ['Name and identify the team', 'Invite the first member', 'Connect game accounts', 'Enter a team tournament'] },
    creator: { eyebrow: 'Creator Studio', title: 'Turn competition into credible content.', description: 'Manage coverage, live readiness, content evidence, audience and opportunities from one studio.', action: 'Set up Creator Studio', cards: [['Coverage', 'Accept and prepare assignments.'], ['Content', 'Connect streams and clips to tournaments.'], ['Audience', 'Measure verified delivery and growth.']], steps: ['Connect a channel', 'Choose games and regions', 'Complete live-readiness check', 'Find a coverage opportunity'] },
    coach: { eyebrow: 'Coach workspace', title: 'Build authority through useful work.', description: 'Publish expertise, guides, analysis and team preparation—without booking or session checkout.', action: 'Set up coach profile', cards: [['Expertise', 'Show games and verifiable credentials.'], ['Guides', 'Publish useful competitive knowledge.'], ['Analysis', 'Connect insight to verified outcomes.']], steps: ['Add games and expertise', 'Submit credentials', 'Create a public profile', 'Publish the first guide'] },
    sponsor: { eyebrow: 'Company workspace', title: 'Reach gaming communities with evidence.', description: 'Discover credible opportunities, create briefs and measure campaign delivery.', action: 'Set up company', cards: [['Marketplace', 'Find suitable tournament communities.'], ['Campaigns', 'Track terms, deadlines and delivery.'], ['Reports', 'Review evidence and measurable outcomes.']], steps: ['Verify the company', 'Invite the campaign team', 'Create a sponsor brief', 'Review suitable opportunities'] },
    shop: { eyebrow: 'Gaming shop workspace', title: 'Become a trusted local tournament hub.', description: 'Operate local tournaments, venue identity, staff and community—without hourly station booking.', action: 'Set up gaming shop', cards: [['Venue', 'Publish verified location and equipment facts.'], ['Local tournaments', 'Create and operate credible events.'], ['Community', 'Build a public local competition record.']], steps: ['Verify shop ownership', 'Add venue facts', 'Invite tournament staff', 'Create a local tournament'] },
  };
  const item = content[workspace as keyof typeof content];
  if (!item) return null;
  return (
    <div className={styles.page}>
      <PageHeading eyebrow={item.eyebrow} title={item.title} description={item.description} />
      <div className={styles.roleIntroGrid}>
        {item.cards.map(([title, body], index) => (
          <section className={styles.roleCard} key={title}>
            <span>{index === 0 ? <Sparkles /> : index === 1 ? <CheckCircle2 /> : <BarChart3 />}</span>
            <h2>{title}</h2><p>{body}</p>
          </section>
        ))}
      </div>
      <section className={styles.activationPanel}>
        <div>
          <p className={styles.kicker}>{activation === 'active' ? 'Workspace active' : 'First-time setup'}</p>
          <h2>{activation === 'active' ? `${definition.shortLabel} is ready` : `Activate ${definition.shortLabel}`}</h2>
          <p>Your account stays the same. This creates a separate working context with the right navigation and permissions.</p>
          {activation === 'active' ? (
            <Link className={styles.secondaryButton} href={`/app/${workspace}/profile`}>Continue setup <ArrowRight size={16} /></Link>
          ) : (
            <button className={styles.primaryButton} type="button" onClick={activateWorkspace} disabled={activation === 'checking' || activation === 'saving'}>
              {activation === 'saving' ? 'Activating…' : activation === 'checking' ? 'Checking…' : item.action}
            </button>
          )}
          {activation === 'error' ? <span className={styles.activationError}>Workspace could not be activated. Your work is safe; try again after storage is ready.</span> : null}
        </div>
        <Checklist items={item.steps.map((label, index) => ({ label, complete: index === 0 }))} />
      </section>
    </div>
  );
}

function WorkspaceSection({ workspace, section, data }: { workspace: V5WorkspaceKind; section: string; data: LiveWorkspaceData }) {
  if (['organizer', 'shop'].includes(workspace) && section === 'tournaments/new') {
    return <V5TournamentWizard />;
  }
  if (workspace === 'organizer' && section.startsWith('tournaments/')) {
    const slug = section.split('/')[1];
    return <TournamentControl tournament={data.tournaments.find((item) => item.slug === slug)} loading={data.loading} />;
  }
  const baseSection = section.split('/')[0];
  if (workspace === 'player' && ['tournaments', 'challenges', 'matches', 'wallet', 'inbox', 'profile', 'rankings'].includes(baseSection)) {
    return <PlayerSection section={section} data={data} />;
  }
  if (['team', 'creator', 'coach', 'sponsor', 'shop'].includes(workspace)) {
    return <V5RoleSection workspace={workspace as 'team' | 'creator' | 'coach' | 'sponsor' | 'shop'} section={baseSection} tournaments={data.tournaments} loading={data.loading} />;
  }
  const copy = SECTION_COPY[baseSection] ?? {
    title: baseSection.replace(/-/g, ' ').replace(/^./, (value) => value.toUpperCase()),
    description: `Work in the ${V5_WORKSPACES[workspace].shortLabel} workspace.`,
  };
  const tournaments = workspace === 'organizer' ? data.tournaments : data.tournaments.slice(0, 8);
  return (
    <div className={styles.page}>
      <PageHeading
        eyebrow={V5_WORKSPACES[workspace].label}
        title={copy.title}
        description={copy.description}
        actionHref={baseSection === 'tournaments' ? (workspace === 'organizer' ? '/app/organizer/tournaments/new' : '/tournaments') : undefined}
        actionLabel={baseSection === 'tournaments' ? (workspace === 'organizer' ? 'Create tournament' : 'Browse tournaments') : copy.action}
      />
      {baseSection === 'tournaments' ? (
        <section className={styles.panel}>
          <PanelHeading title={workspace === 'organizer' ? 'Tournament portfolio' : 'Available tournaments'} />
          <TournamentRows tournaments={tournaments} loading={data.loading} organizer={workspace === 'organizer'} />
        </section>
      ) : (
        <SectionState workspace={workspace} section={baseSection} />
      )}
    </div>
  );
}

function PlayerSection({ section, data }: { section: string; data: LiveWorkspaceData }) {
  const { user } = useAuth();
  const [baseSection, detailId] = section.split('/');
  if (baseSection === 'tournaments') return <V5PlayerTournamentFlow tournaments={data.tournaments} loading={data.loading} />;
  if (baseSection === 'challenges') return <V51v1Challenges currentMatch={data.currentMatch} recentMatches={data.matchHistory} />;
  if (baseSection === 'matches' && detailId) return <V5MatchRoom matchId={detailId} />;
  const copy = SECTION_COPY[baseSection];
  if (section === 'matches') {
    return <div className={styles.page}><PageHeading eyebrow="Player workspace" title={copy.title} description={copy.description} />
      {data.currentMatch ? <div className={styles.controlBlocker}><Swords size={20}/><div><strong>You have an active match.</strong><span>Open the match room to review the deadline, communicate and submit a result.</span></div><Link className={styles.textLink} href={`/app/player/matches/${data.currentMatch.id}`}>Open match <ArrowRight size={14}/></Link></div> : null}
      <section className={styles.panel}><PanelHeading title="Recent verified results" />
        {data.loading ? <div className={styles.rowSkeleton}><span/><span/><span/></div> : data.matchHistory.length ? <div className={styles.resultRows}>{data.matchHistory.map((match)=><Link href={`/app/player/matches/${match.id}`} key={match.id}><span className={match.result==='win'?styles.resultWin:match.result==='loss'?styles.resultLoss:styles.resultNeutral}>{match.result}</span><span><strong>vs {match.opponent_username}</strong><small>{formatGame(match.game)} · {new Intl.DateTimeFormat('en-KE',{day:'numeric',month:'short',year:'numeric'}).format(new Date(match.completed_at))}</small></span><em>{match.rating_change > 0 ? '+' : ''}{match.rating_change} rating</em><ArrowRight size={16}/></Link>)}</div> : <EmptyInline title="No completed matches yet" body="Enter a tournament or find a match to begin building a verified record." href="/tournaments" action="Find competition" />}
      </section></div>;
  }
  if (section === 'wallet') {
    return <div className={styles.page}><PageHeading eyebrow="Player workspace" title={copy.title} description={copy.description} />
      <div className={styles.metricGrid}><MetricCard icon={<WalletCards/>} label="Available points" value={formatNumber(data.rewards?.available ?? user?.reward_points_available)} note="Available to use"/><MetricCard icon={<Clock3/>} label="Pending points" value={formatNumber(data.rewards?.pending ?? user?.reward_points_pending)} note="Not available yet"/><MetricCard icon={<Trophy/>} label="Lifetime points" value={formatNumber(data.rewards?.lifetime ?? user?.reward_points_lifetime)} note="Historical earnings"/><MetricCard icon={<ShieldCheck/>} label="Cash payouts" value="—" note="Shown only when eligible"/></div>
      <section className={styles.panel}><div className={styles.emptyState}><span><WalletCards size={25}/></span><h2>No payment or payout needs attention</h2><p>Entry receipts, refunds, protected amounts, prizes and payout references appear here with their exact status.</p></div></section></div>;
  }
  if (section === 'inbox') {
    return <div className={styles.page}><PageHeading eyebrow="All workspaces" title={copy.title} description={`${data.unreadCount} unread · Every item names the workspace that owns the next action.`} />
      <section className={styles.panel}><PanelHeading title="Latest notifications" />{data.loading?<div className={styles.rowSkeleton}><span/><span/><span/></div>:data.notifications.length?<div className={styles.notificationRows}>{data.notifications.map((item)=><Link href={item.href || '/app/player'} key={item.id} className={item.read_at?styles.notificationRead:styles.notificationUnread}><span/><div><strong>{item.title}</strong><small>{item.body || 'Open for details and next action.'}</small></div><time>{new Intl.DateTimeFormat('en-KE',{day:'numeric',month:'short'}).format(new Date(item.created_at))}</time></Link>)}</div>:<EmptyInline title="Your inbox is clear" body="Tournament updates, match actions and workspace invitations will appear here." href="/app/player" action="Back to overview"/>}</section></div>;
  }
  if (section === 'profile') {
    const gameCount=user?.selected_games?.length??0;
    return <div className={styles.page}><PageHeading eyebrow="Player workspace" title={copy.title} description={copy.description} />
      <div className={styles.profileGrid}><section className={styles.panel}><p className={styles.kicker}>Competition identity</p><div className={styles.identityHero}><span>{user?.username?.slice(0,2).toUpperCase()}</span><div><h2>{user?.username}</h2><p>{user?.region} · {user?.country || 'Kenya'}</p></div><StatusChip tone="success">Active</StatusChip></div><Checklist items={[{label:'Account created',complete:true},{label:'Game account connected',complete:gameCount>0},{label:'Contact verified',complete:Boolean(user?.phone||user?.email)},{label:'Public record started',complete:data.matchHistory.length>0}]}/></section><section className={styles.panel}><PanelHeading title="Connected games"/><div className={styles.tagList}>{user?.selected_games?.map(game=><span key={game}><Gamepad2 size={15}/>{formatGame(game)}</span>)}</div>{!gameCount?<EmptyInline title="No game account connected" body="Connect an in-game identity before tournament eligibility checks." href="/app/player/profile?setup=games" action="Connect game"/>:null}</section></div></div>;
  }
  return <div className={styles.page}><PageHeading eyebrow="Player workspace" title={copy.title} description={copy.description}/><section className={styles.panel}><div className={styles.emptyState}><span><BarChart3 size={25}/></span><h2>Rankings are built from verified results</h2><p>Your game, region and season position will appear after eligible matches are finalized.</p><Link className={styles.secondaryButton} href="/rankings">View public rankings <ArrowRight size={16}/></Link></div></section></div>;
}

function TournamentControl({ tournament, loading }: { tournament?: TournamentRecord; loading: boolean }) {
  if (loading) {
    return <div className={styles.page}><CardSkeleton /><section className={styles.panel}><div className={styles.rowSkeleton}><span /><span /><span /></div></section></div>;
  }
  if (!tournament) {
    return <div className={styles.page}><PageHeading eyebrow="Organizer workspace" title="Tournament unavailable" description="This tournament may have moved, been removed, or belong to a different organizer workspace." /><SectionState workspace="organizer" section="tournament" /></div>;
  }
  const approvalPending = tournament.approval_status && tournament.approval_status !== 'approved';
  return (
    <div className={styles.page}>
      <PageHeading eyebrow="Tournament control center" title={tournament.title} description={`${formatGame(tournament.game)} · ${formatTournamentMeta(tournament)}`} actionHref={`/tournaments/${tournament.slug}`} actionLabel="View public page" />
      <div className={approvalPending ? styles.controlBlocker : styles.controlReady}>
        {approvalPending ? <CircleAlert size={20} /> : <ShieldCheck size={20} />}
        <div>
          <strong>{approvalPending ? 'Registration is closed while Mechi reviews this tournament.' : 'This tournament is ready for its current stage.'}</strong>
          <span>{approvalPending ? 'Review the decision reason and requested changes before resubmitting. Existing draft work remains saved.' : 'Results, evidence and disputes will be recorded through PlayMechi.'}</span>
        </div>
        <StatusChip tone={approvalPending ? 'pending' : 'success'}>{approvalPending ? 'Pending approval' : tournament.status || 'Ready'}</StatusChip>
      </div>
      <div className={styles.metricGrid}>
        <MetricCard icon={<UsersRound />} label="Confirmed entries" value={String(tournament.player_count ?? 0)} note={`${tournament.size ?? '—'} total slots`} />
        <MetricCard icon={<CalendarClock />} label="Schedule" value={tournament.scheduled_for ? new Intl.DateTimeFormat('en-KE',{day:'numeric',month:'short',timeZone:'Africa/Nairobi'}).format(new Date(tournament.scheduled_for)) : 'Not set'} note="Africa/Nairobi" />
        <MetricCard icon={<WalletCards />} label="Entry fee" value={Number(tournament.entry_fee ?? 0) ? `KES ${formatNumber(tournament.entry_fee)}` : 'Free'} note={Number(tournament.prize_pool ?? 0) ? `KES ${formatNumber(tournament.prize_pool)} prize` : 'No cash prize'} />
        <MetricCard icon={<ShieldCheck />} label="Approval" value={approvalPending ? 'Review' : 'Cleared'} note={approvalPending ? 'Mechi owns next action' : 'Policy checks passed'} tone={approvalPending ? 'coral' : 'teal'} />
      </div>
      <div className={styles.controlGrid}>
        <section className={styles.panel}>
          <PanelHeading title="Operate this tournament" />
          <div className={styles.actionList}>
            {[
              ['Participants & check-in','Eligibility, payment, roster and arrival state','participants'],
              ['Match operations','Bracket, match rooms, results and disputes','matches'],
              ['Communications','Announcements, reminders and delivery status','communications'],
              ['Finance & payouts','Protected funds, fees, prizes and blockers','finance'],
              ['Analytics & sponsor report','Participation, delivery and evidence export','analytics'],
            ].map(([title,body,target]) => <Link key={target} href={`/app/organizer/${target}`}><span><strong>{title}</strong><small>{body}</small></span><ArrowRight size={17} /></Link>)}
          </div>
        </section>
        <aside className={styles.panel}>
          <PanelHeading title="Readiness" />
          <Checklist items={[
            {label:'Rules published',complete:Boolean(tournament.title)},
            {label:'Schedule confirmed',complete:Boolean(tournament.scheduled_for)},
            {label:'Approval cleared',complete:!approvalPending},
            {label:'Minimum entries reached',complete:Number(tournament.player_count ?? 0) >= 2},
          ]} />
        </aside>
      </div>
    </div>
  );
}

function SectionState({ workspace, section }: { workspace: V5WorkspaceKind; section: string }) {
  const isSetup = ['team', 'creator', 'coach', 'sponsor', 'shop'].includes(workspace);
  return (
    <div className={styles.sectionGrid}>
      <section className={styles.panel}>
        <div className={styles.emptyState}>
          <span><Sparkles size={25} /></span>
          <h2>{isSetup ? `Set up ${V5_WORKSPACES[workspace].shortLabel} to use this area` : `No ${section.replace(/-/g, ' ')} need your attention`}</h2>
          <p>{isSetup ? 'Complete the workspace identity and permissions first. Your work will then appear here with clear status and next actions.' : 'New activity will appear here with its owner, deadline and recovery path.'}</p>
          <Link className={styles.secondaryButton} href={`/app/${workspace}`}>{isSetup ? 'Return to setup' : 'Back to overview'} <ArrowRight size={16} /></Link>
        </div>
      </section>
      <aside className={styles.panel}>
        <PanelHeading title="How this area works" />
        <Checklist items={[
          { label: 'Status always includes meaning', complete: true },
          { label: 'The next owner and deadline are visible', complete: true },
          { label: 'Risky actions require confirmation', complete: true },
          { label: 'Every decision has an audit reference', complete: true },
        ]} />
      </aside>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, actionHref, actionLabel }: { eyebrow: string; title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return (
    <header className={styles.pageHeading}>
      <div><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {actionHref && actionLabel ? <Link className={styles.primaryButton} href={actionHref}><Plus size={17} /> {actionLabel}</Link> : null}
    </header>
  );
}

function MetricCard({ icon, label, value, note, tone = 'teal' }: { icon: React.ReactNode; label: string; value: string; note: string; tone?: 'teal' | 'coral' }) {
  return <section className={styles.metricCard}><span className={tone === 'coral' ? styles.metricIconCoral : styles.metricIcon}>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></section>;
}

function StatusChip({ children, tone }: { children: React.ReactNode; tone: 'success' | 'danger' | 'pending' }) {
  return <span className={`${styles.statusChip} ${styles[`status_${tone}`]}`}>{children}</span>;
}

function PanelHeading({ title, href, link }: { title: string; href?: string; link?: string }) {
  return <div className={styles.panelHeading}><h2>{title}</h2>{href && link ? <Link href={href}>{link} <ArrowRight size={14} /></Link> : null}</div>;
}

function TournamentRows({ tournaments, loading, organizer = false }: { tournaments: TournamentRecord[]; loading: boolean; organizer?: boolean }) {
  if (loading) return <div className={styles.rowSkeleton}><span /><span /><span /></div>;
  if (!tournaments.length) return <EmptyInline title={organizer ? 'No tournament created yet' : 'No tournaments available right now'} body={organizer ? 'Create a free, no-reward tournament or prepare a rewarded event for approval.' : 'Try again soon or complete your game preferences for better recommendations.'} href={organizer ? '/app/organizer/tournaments/new' : '/tournaments'} action={organizer ? 'Create tournament' : 'Browse directory'} />;
  return <div className={styles.tournamentRows}>{tournaments.map((tournament) => (
    <Link href={organizer ? `/app/organizer/tournaments/${tournament.slug}` : `/tournaments/${tournament.slug}`} className={styles.tournamentRow} key={tournament.id}>
      <span className={styles.gameIcon}><Gamepad2 size={19} /></span>
      <span className={styles.rowMain}><strong>{tournament.title}</strong><small>{formatGame(tournament.game)} · {formatTournamentMeta(tournament)}</small></span>
      <span className={styles.rowPlayers}>{tournament.player_count ?? 0}/{tournament.size ?? '—'}<small>players</small></span>
      <StatusChip tone={tournament.approval_status === 'pending' ? 'pending' : 'success'}>{tournament.approval_status === 'pending' ? 'Pending approval' : tournament.status === 'open' ? 'Registration open' : tournament.status || 'Available'}</StatusChip>
      <ArrowRight size={17} />
    </Link>
  ))}</div>;
}

function Checklist({ items }: { items: Array<{ label: string; complete: boolean }> }) {
  return <div className={styles.checklist}>{items.map((item) => <div key={item.label}><span className={item.complete ? styles.checkComplete : styles.checkPending}>{item.complete ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}</span><strong>{item.label}</strong><small>{item.complete ? 'Complete' : 'Next action'}</small></div>)}</div>;
}

function EmptyInline({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return <div className={styles.emptyInline}><span><Trophy size={21} /></span><div><strong>{title}</strong><p>{body}</p></div><Link href={href}>{action} <ArrowRight size={14} /></Link></div>;
}

function CardSkeleton() { return <div className={styles.cardSkeleton}><span /><span /><span /></div>; }
function InlineNotice() { return <div className={styles.inlineNotice}><CircleAlert size={18} /><div><strong>Some live information did not load.</strong><span>Your workspace is still usable. Refresh to try the affected section again.</span></div></div>; }
function PolicyNotice() { return <div className={styles.policyNotice}><ShieldCheck size={20} /><div><strong>Free means no entry fee and no valuable reward.</strong><span>Those tournaments can publish after readiness checks. Paid or rewarded events require Mechi approval.</span></div><Link href="/app/organizer/tournaments/new">Start safely <ArrowRight size={14} /></Link></div>; }

function formatNumber(value: number | null | undefined) { return new Intl.NumberFormat('en-KE').format(Number(value ?? 0)); }
function formatGame(value: string | null | undefined) { return value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Gaming'; }
function formatTournamentMeta(tournament: TournamentRecord) {
  const fee = Number(tournament.entry_fee ?? 0) === 0 ? 'Free entry' : `KES ${formatNumber(tournament.entry_fee)}`;
  if (!tournament.scheduled_for) return fee;
  const date = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }).format(new Date(tournament.scheduled_for));
  return `${date} EAT · ${fee}`;
}
