'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, CircleAlert, Clock3, Coins, ShieldAlert, ShieldCheck, Trophy, UsersRound } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import styles from './V5AdminWorkspace.module.css';

type Stats = {
  users?: { total?: number; banned?: number; new7d?: number };
  matches?: { total?: number; disputed?: number; active?: number };
  tournaments?: { total?: number; active?: number };
  finance?: { totalPrizeDistributed?: number; pendingPayouts?: number };
  queue?: { waiting?: number; longestWaitMinutes?: number; staleEntries?: number };
};
type AdminTournament = { id: string; slug: string; title: string; game?: string; status?: string; approval_status?: string; payout_status?: string; player_count?: number; size?: number; entry_fee?: number; prize_pool?: number; created_at?: string; organizer?: { username?: string } | null };
type SupportThread = { id: string; subject?: string; status?: string; updated_at?: string; user?: { username?: string } | null };
type RewardItem = { id: string; reason?: string; status?: string; created_at?: string; user?: { username?: string } | null };
type AdminData = { stats: Stats | null; tournaments: AdminTournament[]; support: SupportThread[]; rewards: RewardItem[]; loading: boolean; forbidden: boolean; error: boolean };
type QueueItem = { id:string; title:string; detail:string; status:string; href:string; kind:'tournament'|'support'|'reward'|'payout' };

const EMPTY: AdminData = { stats: null, tournaments: [], support: [], rewards: [], loading: true, forbidden: false, error: false };
const SECTION_TITLES: Record<string, [string,string]> = {
  tournaments: ['Tournament approvals','Review tournament state, approval, participation and delivery risk.'],
  sponsorships: ['Sponsorship approvals','Review companies, briefs, terms, protections and tournament suitability.'],
  verification: ['Verification','Decide identity, organizer, company and venue verification with evidence.'],
  moderation: ['Moderation','Resolve disputes and safety cases without changing unrelated records.'],
  payouts: ['Payout operations','Release only eligible payouts with holds, references and audit history visible.'],
  risk: ['Risk & audit','Investigate exceptions, stale queues and high-risk actions by correlation reference.'],
  platform: ['Platform health','Monitor live competition queues and operational readiness.'],
};

export function V5AdminWorkspace({ section }: { section: string }) {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [data, setData] = useState<AdminData>(EMPTY);
  const load = useCallback(async () => {
    try {
      const [statsResponse,tournamentsResponse,supportResponse,rewardsResponse] = await Promise.all([
        authFetch('/api/admin/stats'), authFetch('/api/admin/tournaments?limit=40'),
        authFetch('/api/admin/support?limit=20'), authFetch('/api/admin/rewards?status=all&limit=20'),
      ]);
      if ([statsResponse,tournamentsResponse,supportResponse,rewardsResponse].some((response) => response.status === 403)) {
        setData((current) => ({ ...current, loading: false, forbidden: true })); return;
      }
      const [stats,tournaments,support,rewards] = await Promise.all([
        statsResponse.ok ? statsResponse.json() : null, tournamentsResponse.ok ? tournamentsResponse.json() : null,
        supportResponse.ok ? supportResponse.json() : null, rewardsResponse.ok ? rewardsResponse.json() : null,
      ]);
      setData({ stats, tournaments: tournaments?.tournaments || [], support: support?.threads || support?.items || [], rewards: rewards?.items || [], loading: false, forbidden: false, error: !statsResponse.ok });
    } catch { setData((current) => ({ ...current, loading: false, error: true })); }
  }, [authFetch]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  if (data.loading) return <div className={styles.loading}><span/><span/><span/></div>;
  if (data.forbidden || !['admin','moderator'].includes(user?.role || '')) return <div className={styles.forbidden}><ShieldAlert/><h1>Operations access required</h1><p>This workspace contains protected decisions. Your current account does not have an active Mechi operations role.</p><Link href="/app/player">Return to player workspace</Link></div>;
  const [baseSection, selectedId] = section.split('/');
  if (!baseSection) return <AdminOverview data={data}/>;
  return <AdminSection section={baseSection} selectedId={selectedId} data={data} userRole={user?.role || ''} onRefresh={load}/>;
}

function AdminOverview({ data }: { data: AdminData }) {
  const stats = data.stats;
  const pendingApprovals = data.tournaments.filter((item) => item.approval_status && item.approval_status !== 'approved');
  const pendingPayouts = data.tournaments.filter((item) => item.payout_status === 'pending');
  return <div className={styles.page}>
    <PageHeading eyebrow="Mechi operations" title="Know what needs a decision now." description="Approvals, disputes, payouts and platform health are ordered by risk and next owner."/>
    {data.error ? <div className={styles.alert}><CircleAlert/><span>Some operational data did not load. Do not make a decision without refreshing the affected queue.</span></div> : null}
    <div className={styles.metrics}>
      <Metric icon={<Trophy/>} label="Approval attention" value={pendingApprovals.length} note="Tournament cases visible" tone={pendingApprovals.length ? 'warning' : 'safe'}/>
      <Metric icon={<ShieldAlert/>} label="Disputed matches" value={stats?.matches?.disputed || 0} note={`${stats?.matches?.active || 0} active matches`} tone={stats?.matches?.disputed ? 'danger' : 'safe'}/>
      <Metric icon={<Coins/>} label="Pending payouts" value={stats?.finance?.pendingPayouts || pendingPayouts.length} note="Eligibility must be checked" tone={pendingPayouts.length ? 'warning' : 'safe'}/>
      <Metric icon={<UsersRound/>} label="Players" value={stats?.users?.total || 0} note={`${stats?.users?.new7d || 0} joined in 7 days`} tone="safe"/>
    </div>
    <div className={styles.columns}>
      <section className={styles.panel}><PanelHeading title="Decision queues"/><div className={styles.queueList}>
        <Queue href="/app/admin/tournaments" icon={<Trophy/>} title="Tournament review" count={pendingApprovals.length} detail="Approval state and live tournament risk"/>
        <Queue href="/app/admin/moderation" icon={<ShieldAlert/>} title="Match disputes" count={stats?.matches?.disputed || 0} detail="Results and evidence waiting for resolution"/>
        <Queue href="/app/admin/payouts" icon={<Coins/>} title="Payout eligibility" count={stats?.finance?.pendingPayouts || pendingPayouts.length} detail="Completed tournaments with payout holds"/>
        <Queue href="/app/admin/risk" icon={<Activity/>} title="Reward and risk review" count={data.rewards.filter((item) => ['open','reviewing'].includes(item.status || '')).length} detail="Exceptions requiring a durable decision"/>
      </div></section>
      <section className={styles.panel}><PanelHeading title="Platform pulse"/><div className={styles.pulse}>
        <div><span>Open matchmaking queue</span><strong>{stats?.queue?.waiting || 0}</strong><small>Longest wait {stats?.queue?.longestWaitMinutes || 0} min</small></div>
        <div><span>Active tournaments</span><strong>{stats?.tournaments?.active || 0}</strong><small>{stats?.tournaments?.total || 0} lifetime</small></div>
        <div><span>Support conversations</span><strong>{data.support.length}</strong><small>Latest operational sample</small></div>
      </div></section>
    </div>
  </div>;
}

function AdminSection({ section, selectedId, data, userRole, onRefresh }: { section: string; selectedId?: string; data: AdminData; userRole: string; onRefresh: () => Promise<void> }) {
  const [title,description] = SECTION_TITLES[section] || ['Operations','Protected Mechi administration.'];
  let items: QueueItem[] = [];
  if (section === 'tournaments') items = data.tournaments.map((item) => ({ id:item.id,title:item.title,detail:`${format(item.game)} · ${item.player_count || 0}/${item.size || '—'} entries · ${item.organizer?.username || 'Organizer'}`,status:item.approval_status || item.status || 'unknown',href:`/app/admin/tournaments/${item.id}`,kind:'tournament' }));
  if (section === 'payouts') items = data.tournaments.filter((item) => item.payout_status === 'pending').map((item) => ({ id:item.id,title:item.title,detail:`KES ${number(item.prize_pool)} prize · ${item.player_count || 0} confirmed entries`,status:'payout pending',href:`/app/admin/payouts/${item.id}`,kind:'payout' }));
  if (section === 'risk') items = data.rewards.map((item) => ({ id:item.id,title:item.user?.username || 'Reward review',detail:format(item.reason),status:item.status || 'open',href:`/app/admin/risk/${item.id}`,kind:'reward' }));
  if (section === 'moderation') items = data.support.filter((item) => item.status !== 'resolved').map((item) => ({ id:item.id,title:item.subject || 'Support and safety case',detail:item.user?.username || 'Player case',status:item.status || 'open',href:`/app/admin/moderation/${item.id}`,kind:'support' }));
  const liveSource = ['tournaments','payouts','risk','moderation'].includes(section);
  const selected = selectedId ? items.find((item) => item.id === selectedId) : null;
  if (selectedId) return <CaseDetail section={section} item={selected} userRole={userRole} onRefresh={onRefresh}/>;
  return <div className={styles.page}><PageHeading eyebrow="Mechi operations" title={title} description={description}/>
    <div className={styles.operatorNotice}><ShieldCheck/><div><strong>Protected decision surface</strong><span>Confirm subject, evidence, scope, downstream effects and reason before any irreversible action.</span></div></div>
    <section className={styles.panel}><PanelHeading title={liveSource ? 'Live queue' : 'Queue contract'}/>{items.length ? <div className={styles.rows}>{items.map((item) => <Link href={item.href} key={item.id}><span><strong>{item.title}</strong><small>{item.detail}</small></span><em>{format(item.status)}</em><ArrowRight size={16}/></Link>)}</div> : <div className={styles.empty}><Clock3/><h2>{liveSource ? 'No cases in the current result set' : 'This protected queue activates with the V5 trust-domain migration'}</h2><p>{liveSource ? 'Refresh before concluding that operational work is complete.' : 'Its decision contract is defined, but it will not fabricate cases from unrelated legacy tables.'}</p></div>}</section>
  </div>;
}

function CaseDetail({ section, item, userRole, onRefresh }: { section:string; item:QueueItem|null|undefined; userRole:string; onRefresh:() => Promise<void> }) {
  const authFetch = useAuthFetch();
  const [reason,setReason] = useState('');
  const [working,setWorking] = useState(false);
  const [feedback,setFeedback] = useState<string|null>(null);
  if (!item) return <div className={styles.page}><PageHeading eyebrow="Mechi operations" title="Case unavailable" description="This case is not present in the current permission-scoped queue."/><Link className={styles.backLink} href={`/app/admin/${section}`}>Return to queue</Link></div>;

  const run = async (label:string, endpoint:string, body:Record<string,unknown>) => {
    const trimmed = reason.trim();
    if (trimmed.length < 8) { setFeedback('Add a reason of at least 8 characters so the decision is auditable.'); return; }
    if (!window.confirm(`${label} “${item.title}”? This records an operational decision and may notify the affected user.`)) return;
    setWorking(true); setFeedback(null);
    try {
      const response = await authFetch(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setFeedback(result.error || `${label} failed. Refresh the case before retrying.`); return; }
      setFeedback(`${label} recorded successfully. The queue is refreshing.`); setReason(''); await onRefresh();
    } catch { setFeedback(`${label} could not reach the server. No success is assumed.`); }
    finally { setWorking(false); }
  };

  return <div className={styles.page}>
    <Link className={styles.backLink} href={`/app/admin/${section}`}>← Back to {format(section)} queue</Link>
    <PageHeading eyebrow="Protected case" title={item.title} description={item.detail}/>
    <div className={styles.operatorNotice}><ShieldCheck/><div><strong>Current status: {format(item.status)}</strong><span>Review source evidence and downstream effects before recording a decision.</span></div></div>
    <div className={styles.caseGrid}>
      <section className={styles.panel}><PanelHeading title="Decision context"/><dl className={styles.caseFacts}><div><dt>Case reference</dt><dd>{item.id}</dd></div><div><dt>Queue</dt><dd>{format(section)}</dd></div><div><dt>Subject</dt><dd>{item.title}</dd></div><div><dt>Current state</dt><dd>{format(item.status)}</dd></div></dl></section>
      <section className={styles.panel}><PanelHeading title="Record a decision"/><label className={styles.reasonLabel} htmlFor="case-reason">Decision reason</label><textarea id="case-reason" value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="State the evidence, policy and expected downstream effect." minLength={8}/>{feedback ? <p className={styles.feedback} role="status">{feedback}</p> : null}<div className={styles.decisionActions}>
        {item.kind === 'tournament' && userRole === 'admin' ? <><button disabled={working} onClick={()=>void run('Approve tournament',`/api/admin/tournaments/${item.id}`,{action:'set_approval',approval_status:'approved',reason:reason.trim()})}>Approve</button><button data-tone="danger" disabled={working} onClick={()=>void run('Reject tournament',`/api/admin/tournaments/${item.id}`,{action:'set_approval',approval_status:'rejected',reason:reason.trim()})}>Reject</button></> : null}
        {item.kind === 'reward' ? <><button disabled={working} onClick={()=>void run('Start reward review',`/api/admin/rewards/${item.id}`,{action:'start_review',note:reason.trim()})}>Start review</button><button disabled={working} onClick={()=>void run('Resolve reward review',`/api/admin/rewards/${item.id}`,{action:'resolve',note:reason.trim()})}>Resolve</button><button data-tone="danger" disabled={working} onClick={()=>void run('Dismiss reward review',`/api/admin/rewards/${item.id}`,{action:'dismiss',note:reason.trim()})}>Dismiss</button></> : null}
        {item.kind === 'support' ? <><button disabled={working} onClick={()=>void run('Resolve support case',`/api/admin/support/${item.id}`,{action:'resolve',reason:reason.trim()})}>Resolve</button><button disabled={working} onClick={()=>void run('Reopen support case',`/api/admin/support/${item.id}`,{action:'reopen',reason:reason.trim()})}>Reopen</button></> : null}
        {item.kind === 'payout' ? <p className={styles.readOnly}>Payout release remains held until eligibility, recipient and Paystack references are available together. This V5 surface will not infer a release action from tournament status alone.</p> : null}
        {item.kind === 'tournament' && userRole !== 'admin' ? <p className={styles.readOnly}>Moderators may inspect this case. An administrator role is required to approve or reject a tournament.</p> : null}
      </div></section>
    </div>
  </div>;
}

function PageHeading({ eyebrow,title,description }: { eyebrow:string;title:string;description:string }) { return <header className={styles.heading}><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></header>; }
function PanelHeading({ title }: { title:string }) { return <div className={styles.panelHeading}><h2>{title}</h2><span>Live, permission-scoped</span></div>; }
function Metric({icon,label,value,note,tone}:{icon:React.ReactNode;label:string;value:number;note:string;tone:'safe'|'warning'|'danger'}) { return <section className={styles.metric} data-tone={tone}><span>{icon}</span><div><p>{label}</p><strong>{number(value)}</strong><small>{note}</small></div></section>; }
function Queue({href,icon,title,count,detail}:{href:string;icon:React.ReactNode;title:string;count:number;detail:string}) { return <Link href={href}>{icon}<span><strong>{title}</strong><small>{detail}</small></span><em>{count}</em><ArrowRight size={16}/></Link>; }
function number(value:number|undefined|null){return new Intl.NumberFormat('en-KE').format(Number(value||0));}
function format(value:string|undefined|null){return String(value||'Not set').replace(/_/g,' ').replace(/\b\w/g,(letter)=>letter.toUpperCase());}
