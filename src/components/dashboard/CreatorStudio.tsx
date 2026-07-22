'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  ExternalLink,
  Eye,
  FileVideo,
  LoaderCircle,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserRoundCheck,
  UsersRound,
  Video,
  Wifi,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { getGameLabel, type CreatorSection } from '@/lib/dashboard';
import dashboardStyles from './Dashboard.module.css';
import styles from './CreatorStudio.module.css';

type Row = Record<string, unknown>;
export type CreatorStudioData = {
  creator: Row | null;
  content?: Row[];
  coverage?: Row[];
  streams?: Row[];
  tournaments?: Row[];
  summary?: Record<string, number>;
  setup_required?: boolean;
};

type CreatorPayload = CreatorStudioData;

const SECTION_COPY: Record<CreatorSection | 'overview', { eyebrow: string; title: string; subtitle: string }> = {
  overview: { eyebrow: 'Creator Studio', title: 'Create, cover, and grow', subtitle: 'Your content, live coverage, tournaments, and opportunities in one focused workspace.' },
  content: { eyebrow: 'Creator Studio · Content', title: 'Content library', subtitle: 'Add your public clips, videos, streams, and posts to build a credible creator portfolio.' },
  live: { eyebrow: 'Creator Studio · Live', title: 'Live control room', subtitle: 'Prepare and manage secure PlayMechi tournament broadcasts.' },
  coverage: { eyebrow: 'Creator Studio · Coverage', title: 'Coverage assignments', subtitle: 'Keep tournament briefs, schedules, and delivery status organized.' },
  tournaments: { eyebrow: 'Creator Studio · Tournaments', title: 'Creator-led tournaments', subtitle: 'Run competitions that become repeatable content and community moments.' },
  audience: { eyebrow: 'Creator Studio · Audience', title: 'Audience signals', subtitle: 'See what is working without drowning in vanity metrics.' },
  opportunities: { eyebrow: 'Creator Studio · Opportunities', title: 'Opportunities', subtitle: 'Official coverage invitations and future sponsor briefs will appear here.' },
  earnings: { eyebrow: 'Creator Studio · Earnings', title: 'Earnings', subtitle: 'Track approved creator payouts separately from tournament prize money.' },
  profile: { eyebrow: 'Creator Studio · Profile', title: 'Creator profile', subtitle: 'Show organizers and companies what you create, cover, and know.' },
};

function formatDate(value: unknown) {
  if (!value) return 'Schedule pending';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Schedule pending';
  return new Intl.DateTimeFormat('en-KE', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export function CreatorStudio({ section, initialData }: { section: CreatorSection | 'overview'; initialData?: CreatorStudioData }) {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [data, setData] = useState<CreatorStudioData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await authFetch('/api/creator/profile');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not load Creator Studio.');
      setData(payload as CreatorStudioData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load Creator Studio.');
    } finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => {
    if (initialData) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [initialData, load]);

  if (loading) return <CreatorSkeleton />;
  if (error) return <ErrorState message={error} retry={load} />;
  if (!data?.creator) return <CreatorActivation username={user?.username ?? 'Player'} setupRequired={Boolean(data?.setup_required)} onActivated={setData} />;

  const copy = SECTION_COPY[section];
  return (
    <div className={styles.studio}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
        <div className={styles.headerActions}>
          <span className={`${styles.availability} ${styles[String(data.creator.availability ?? 'available')]}`}><span /> {String(data.creator.availability ?? 'available')}</span>
          {section === 'content' ? <a className={styles.primaryButton} href="#add-content"><Plus size={17} /> Add content</a> : <Link className={styles.primaryButton} href="/creator/content"><Plus size={17} /> Add content</Link>}
        </div>
      </header>
      {section === 'overview' ? <CreatorOverview data={data} /> : null}
      {section === 'content' ? <ContentSection data={data} reload={load} /> : null}
      {section === 'live' ? <LiveSection data={data} /> : null}
      {section === 'coverage' ? <CoverageSection data={data} /> : null}
      {section === 'tournaments' ? <TournamentSection data={data} /> : null}
      {section === 'audience' ? <AudienceSection data={data} /> : null}
      {section === 'opportunities' ? <OpportunitySection data={data} /> : null}
      {section === 'earnings' ? <EarningsSection /> : null}
      {section === 'profile' ? <CreatorProfileSection data={data} reload={load} /> : null}
    </div>
  );
}

function CreatorActivation({ username, setupRequired, onActivated }: { username: string; setupRequired: boolean; onActivated: (data: CreatorStudioData) => void }) {
  const authFetch = useAuthFetch();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [types, setTypes] = useState(['streamer']);

  const toggleType = (type: string) => setTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await authFetch('/api/creator/profile', { method: 'POST', body: JSON.stringify({ display_name: form.get('display_name'), bio: form.get('bio'), creator_types: types, games: String(form.get('games') ?? '').split(',').map((item) => item.trim()).filter(Boolean) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Could not activate Creator Studio.');
      onActivated(payload as CreatorStudioData);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Could not activate Creator Studio.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className={styles.activation}>
      <div className={styles.activationIntro}>
        <span><Video size={28} /></span>
        <p className={styles.eyebrow}>Optional creator workspace</p>
        <h1>Turn competition into content and authority.</h1>
        <p>Keep your Player Dashboard for competing. Activate Creator Studio when you want tools for streaming, coverage, coaching content, audience growth, and creator opportunities.</p>
        <ul><li><CheckCircle2 size={17} /> Open to every PlayMechi player</li><li><CheckCircle2 size={17} /> Same account and reputation</li><li><ShieldCheck size={17} /> Verification only for official assignments and payouts</li></ul>
      </div>
      <form className={styles.activationForm} onSubmit={submit}>
        <div><p className={styles.eyebrow}>Start in two minutes</p><h2>Set up your Creator Studio</h2><p>You can change these details later.</p></div>
        {setupRequired ? <div className={styles.warning}><CircleAlert size={17} /> Creator database setup must be deployed before activation.</div> : null}
        {error ? <div className={styles.error}><CircleAlert size={17} /> {error}</div> : null}
        <label>Creator display name<input name="display_name" defaultValue={username} minLength={2} maxLength={60} required /></label>
        <fieldset><legend>What do you create?</legend><div className={styles.choiceGrid}>{[['streamer','Live streams'],['commentator','Commentary'],['video_creator','Videos & clips'],['coach','Coaching']].map(([value,label]) => <button type="button" key={value} className={types.includes(value) ? styles.choiceActive : ''} onClick={() => toggleType(value)}>{label}</button>)}</div></fieldset>
        <label>Games you cover <span>Optional, comma separated</span><input name="games" placeholder="eFootball, CODM, PUBG Mobile" /></label>
        <label>Short bio <span>Optional</span><textarea name="bio" maxLength={400} placeholder="Tell organizers and gamers what you create..." /></label>
        <button className={styles.primaryButton} type="submit" disabled={submitting || setupRequired}>{submitting ? <LoaderCircle className={styles.spin} size={17} /> : <Sparkles size={17} />} Activate Creator Studio</button>
        <small>Activation does not grant moderator or admin permissions.</small>
      </form>
    </div>
  );
}

function CreatorOverview({ data }: { data: CreatorStudioData }) {
  const summary = data.summary ?? {};
  const nextCoverage = data.coverage?.find((item) => ['invited','accepted'].includes(String(item.status)));
  return <>
    <section className={styles.creatorHero}><div><span><Sparkles size={22} /></span><div><p className={styles.eyebrow}>Today’s priority</p><h2>{nextCoverage ? String(nextCoverage.title) : 'Complete your public creator profile'}</h2><p>{nextCoverage ? `${String(nextCoverage.assignment_type)} · ${formatDate(nextCoverage.scheduled_for)}` : 'Add your channels and strongest content so organizers can assess your fit quickly.'}</p></div></div><Link className={styles.primaryButton} href={nextCoverage ? '/creator/coverage' : '/creator/profile'}>{nextCoverage ? 'Open assignment' : 'Complete profile'} <ArrowRight size={17} /></Link></section>
    <section className={styles.metricGrid}><CreatorMetric icon={FileVideo} label="Published content" value={Number(summary.published_content ?? 0)} detail="Portfolio items" /><CreatorMetric icon={Eye} label="Tracked views" value={Number(summary.total_views ?? 0)} detail="Across linked content" /><CreatorMetric icon={Radio} label="Peak live viewers" value={Number(summary.peak_live_viewers ?? 0)} detail="PlayMechi streams" coral /><CreatorMetric icon={CalendarCheck} label="Upcoming coverage" value={Number(summary.upcoming_coverage ?? 0)} detail="Needs attention" coral /></section>
    <div className={styles.twoColumns}><StudioPanel title="Coverage schedule" subtitle="Upcoming briefs and official assignments" href="/creator/coverage"><CoverageList items={(data.coverage ?? []).slice(0,4)} /></StudioPanel><StudioPanel title="Recent content" subtitle="Your public creator portfolio" href="/creator/content"><ContentList items={(data.content ?? []).slice(0,4)} /></StudioPanel></div>
    <section className={styles.readiness}><div><span><Wifi size={22} /></span><div><p className={styles.eyebrow}>Live readiness</p><h3>Secure tournament streaming</h3><p>PlayMechi live streams attach to active matches or tournaments. Stream keys remain inside the protected live flow.</p></div></div><Link href="/creator/live">Check readiness <ArrowRight size={16} /></Link></section>
    <div className={styles.threeColumns}><MiniCard icon={Trophy} title="Creator tournaments" value={Number(summary.active_tournaments ?? 0)} body="Open or active events you host." href="/creator/tournaments" /><MiniCard icon={UsersRound} title="Audience" value={Number(summary.total_views ?? 0)} body="Current measurable reach." href="/creator/audience" /><MiniCard icon={Sparkles} title="Opportunities" value={(data.coverage ?? []).filter((item) => item.status === 'invited').length} body="Invitations awaiting response." href="/creator/opportunities" /></div>
  </>;
}

function ContentSection({ data, reload }: { data: CreatorStudioData; reload: () => Promise<void> }) {
  const authFetch = useAuthFetch(); const [busy,setBusy] = useState(false); const [message,setMessage] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setBusy(true); setMessage(''); const form = new FormData(event.currentTarget); const response = await authFetch('/api/creator/content',{method:'POST',body:JSON.stringify(Object.fromEntries(form))}); const payload=await response.json(); if(!response.ok){setMessage(payload.error ?? 'Could not add content.');}else{event.currentTarget.reset(); await reload();} setBusy(false); };
  const remove = async (id: unknown) => { setBusy(true); const response=await authFetch(`/api/creator/content?id=${encodeURIComponent(String(id))}`,{method:'DELETE'}); if(response.ok) await reload(); setBusy(false); };
  return <div className={styles.twoColumnsWide}><section id="add-content" className={styles.formPanel}><h2>Add published content</h2><p>Link work that is already public. PlayMechi does not copy or re-upload it.</p>{message ? <div className={styles.error}><CircleAlert size={16}/>{message}</div>:null}<form onSubmit={submit}><label>Title<input name="title" required minLength={2} maxLength={120}/></label><div className={styles.formRow}><label>Type<select name="content_type" defaultValue="video"><option value="video">Video</option><option value="clip">Clip</option><option value="stream">Stream replay</option><option value="post">Post</option></select></label><label>Platform<select name="platform" defaultValue="youtube"><option value="youtube">YouTube</option><option value="twitch">Twitch</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="x">X</option><option value="other">Other</option></select></label></div><label>Public URL<input name="external_url" type="url" placeholder="https://..." required /></label><button className={styles.primaryButton} disabled={busy}>{busy?<LoaderCircle className={styles.spin} size={17}/>:<Plus size={17}/>} Add to portfolio</button></form></section><section className={styles.library}><h2>Your library</h2>{(data.content ?? []).length ? <div className={styles.contentCards}>{(data.content ?? []).map((item)=><article key={String(item.id)}><span><Video size={19}/></span><div><small>{String(item.platform)} · {String(item.content_type)}</small><h3>{String(item.title)}</h3><p>{Number(item.views ?? 0).toLocaleString()} views</p></div><a href={String(item.external_url)} target="_blank" rel="noreferrer" aria-label="Open content"><ExternalLink size={17}/></a><button onClick={()=>void remove(item.id)} disabled={busy} aria-label="Remove content"><Trash2 size={16}/></button></article>)}</div>:<StudioEmpty icon={FileVideo} title="No content added" body="Add one strong public example to start your portfolio." />}</section></div>;
}

function LiveSection({ data }: { data: CreatorPayload }) { return <><section className={styles.liveBanner}><div><span><Radio size={24}/></span><div><p className={styles.eyebrow}>Protected live workflow</p><h2>Stream only verified competition</h2><p>For safety and credibility, a PlayMechi stream must attach to an active match or tournament. Elite streaming access or an approved assignment may be required.</p></div></div><Link className={styles.primaryButton} href="/streams/create">Open live setup <ArrowRight size={16}/></Link></section><StudioPanel title="Stream history" subtitle="PlayMechi-hosted broadcasts only" href="/streams"><StreamList items={data.streams ?? []}/></StudioPanel></>; }
function CoverageSection({ data }: { data: CreatorPayload }) { return <StudioPanel title="All assignments" subtitle="Invitations, accepted coverage, and completed work" href="/creator/opportunities"><CoverageList items={data.coverage ?? []}/></StudioPanel>; }
function TournamentSection({ data }: { data: CreatorPayload }) { return <><section className={styles.sectionAction}><div><p className={styles.eyebrow}>Open self-serve hosting</p><h2>Any user can host a free, no-reward tournament.</h2><p>Paid entry or any prize/reward remains approval-only.</p></div><Link className={styles.primaryButton} href="/tournaments/create"><Plus size={17}/> Create tournament</Link></section><StudioPanel title="Hosted tournaments" subtitle="Events organized by this account" href="/tournaments"><TournamentList items={data.tournaments ?? []}/></StudioPanel></>; }
function AudienceSection({ data }: { data: CreatorPayload }) { const summary=data.summary??{}; return <><section className={styles.metricGrid}><CreatorMetric icon={Eye} label="Tracked views" value={Number(summary.total_views??0)} detail="Linked content"/><CreatorMetric icon={Radio} label="Peak live" value={Number(summary.peak_live_viewers??0)} detail="Concurrent viewers" coral/><CreatorMetric icon={FileVideo} label="Published items" value={Number(summary.published_content??0)} detail="Portfolio depth"/><CreatorMetric icon={BarChart3} label="Engagement data" value={0} detail="Not connected yet" coral/></section><section className={styles.insightPanel}><BarChart3 size={28}/><div><h2>Useful analytics, not noise</h2><p>Current figures use PlayMechi streams and creator-entered content metrics. Platform account connections and historical charts will activate after explicit creator consent.</p></div></section></>; }
function OpportunitySection({ data }: { data: CreatorPayload }) { const items=(data.coverage??[]).filter((item)=>item.status==='invited'); return <StudioPanel title="Invitations" subtitle="Official organizers and companies can send reviewed briefs here" href="/creator/coverage">{items.length?<CoverageList items={items}/>:<StudioEmpty icon={Sparkles} title="No open invitations" body="Complete your creator profile and add public work so organizers can assess your fit." />}</StudioPanel>; }
function EarningsSection() { return <><section className={styles.earningsHero}><div><p className={styles.eyebrow}>Available balance</p><h2>KES 0</h2><p>No approved creator payouts yet.</p></div><span><CircleDollarSign size={28}/></span></section><section className={styles.insightPanel}><ShieldCheck size={28}/><div><h2>Creator payouts will be reviewed</h2><p>Earnings are separate from player prizes. Paystack payout setup will appear only after identity, assignment delivery, and payment details are verified.</p></div></section></>; }

function CreatorProfileSection({ data, reload }: { data: CreatorPayload; reload: () => Promise<void> }) { const authFetch=useAuthFetch(); const creator=data.creator!; const [saving,setSaving]=useState(false); const [message,setMessage]=useState(''); const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setSaving(true);setMessage('');const form=new FormData(event.currentTarget);const response=await authFetch('/api/creator/profile',{method:'PATCH',body:JSON.stringify({display_name:form.get('display_name'),bio:form.get('bio'),availability:form.get('availability'),games:String(form.get('games')??'').split(',').map(x=>x.trim()).filter(Boolean),platform_links:{youtube:form.get('youtube'),twitch:form.get('twitch'),tiktok:form.get('tiktok'),instagram:form.get('instagram')}})});const payload=await response.json();setMessage(response.ok?'Profile saved.':payload.error??'Could not save.');if(response.ok)await reload();setSaving(false);};const links=(creator.platform_links??{}) as Row;return <div className={styles.profileGrid}><section className={styles.profilePreview}><span>{String(creator.display_name??'C').slice(0,1)}</span><h2>{String(creator.display_name)}</h2><p>@{String(creator.slug)}</p><div className={styles.tags}>{(creator.creator_types as string[]??[]).map(type=><span key={type}>{type.replaceAll('_',' ')}</span>)}</div><small>{String(creator.status)==='verified'?'Verified creator':'Creator profile active'}</small></section><section className={styles.formPanel}><h2>Edit creator profile</h2><p>This public-facing information is separate from your player security role.</p>{message?<div className={message==='Profile saved.'?styles.success:styles.error}>{message==='Profile saved.'?<CheckCircle2 size={16}/>:<CircleAlert size={16}/>} {message}</div>:null}<form onSubmit={submit}><label>Display name<input name="display_name" defaultValue={String(creator.display_name??'')} required/></label><label>Bio<textarea name="bio" defaultValue={String(creator.bio??'')} maxLength={400}/></label><div className={styles.formRow}><label>Availability<select name="availability" defaultValue={String(creator.availability??'available')}><option value="available">Available</option><option value="limited">Limited</option><option value="unavailable">Unavailable</option></select></label><label>Games<input name="games" defaultValue={(creator.games as string[]??[]).join(', ')}/></label></div>{['youtube','twitch','tiktok','instagram'].map(platform=><label key={platform}>{platform[0].toUpperCase()+platform.slice(1)} URL<input name={platform} type="url" defaultValue={String(links[platform]??'')} placeholder="https://..."/></label>)}<button className={styles.primaryButton} disabled={saving}>{saving?<LoaderCircle className={styles.spin} size={17}/>:<UserRoundCheck size={17}/>} Save profile</button></form></section></div>; }

function CreatorMetric({icon:Icon,label,value,detail,coral=false}:{icon:typeof Video;label:string;value:number;detail:string;coral?:boolean}) { return <article className={styles.metric}><span className={coral?styles.coralIcon:''}><Icon size={20}/></span><div><p>{label}</p><strong>{value.toLocaleString()}</strong><small>{detail}</small></div></article>; }
function StudioPanel({title,subtitle,href,children}:{title:string;subtitle:string;href:string;children:React.ReactNode}) { return <section className={styles.panel}><header><div><h2>{title}</h2><p>{subtitle}</p></div><Link href={href}>View all <ArrowRight size={15}/></Link></header>{children}</section>; }
function CoverageList({items}:{items:Row[]}) { return items.length?<div className={styles.rows}>{items.map(item=><article key={String(item.id)}><span><CalendarCheck size={19}/></span><div><h3>{String(item.title)}</h3><p>{String(item.assignment_type??'coverage')} · {formatDate(item.scheduled_for)}</p></div><strong>{String(item.status)}</strong></article>)}</div>:<StudioEmpty icon={CalendarCheck} title="No coverage scheduled" body="Official invitations and accepted assignments will appear here."/>; }
function ContentList({items}:{items:Row[]}) { return items.length?<div className={styles.rows}>{items.map(item=><a href={String(item.external_url)} target="_blank" rel="noreferrer" key={String(item.id)}><span><Video size={19}/></span><div><h3>{String(item.title)}</h3><p>{String(item.platform)} · {Number(item.views??0).toLocaleString()} views</p></div><ExternalLink size={16}/></a>)}</div>:<StudioEmpty icon={FileVideo} title="No content yet" body="Add a strong public clip, video, or stream replay."/>; }
function StreamList({items}:{items:Row[]}) { return items.length?<div className={styles.rows}>{items.map(item=><article key={String(item.id)}><span><Radio size={19}/></span><div><h3>{String(item.title)}</h3><p>{formatDate(item.started_at??item.created_at)} · {Number(item.viewer_count??0)} viewers</p></div><strong>{String(item.status)}</strong></article>)}</div>:<StudioEmpty icon={Radio} title="No PlayMechi streams" body="Your secure tournament and match broadcasts will appear here."/>; }
function TournamentList({items}:{items:Row[]}) { return items.length?<div className={styles.rows}>{items.map(item=><Link href={`/t/${String(item.slug)}`} key={String(item.id)}><span><Trophy size={19}/></span><div><h3>{String(item.title)}</h3><p>{getGameLabel(String(item.game))} · {formatDate(item.scheduled_for)}</p></div><strong>{String(item.status)}</strong></Link>)}</div>:<StudioEmpty icon={Trophy} title="No hosted tournaments" body="Create a free, no-reward tournament without approval."/>; }
function MiniCard({icon:Icon,title,value,body,href}:{icon:typeof Trophy;title:string;value:number;body:string;href:string}) { return <Link className={styles.miniCard} href={href}><span><Icon size={20}/></span><div><p>{title}</p><strong>{value.toLocaleString()}</strong><small>{body}</small></div><ArrowRight size={17}/></Link>; }
function StudioEmpty({icon:Icon,title,body}:{icon:typeof Video;title:string;body:string}) { return <div className={styles.empty}><span><Icon size={22}/></span><h3>{title}</h3><p>{body}</p></div>; }
function ErrorState({message,retry}:{message:string;retry:()=>Promise<void>}) { return <div className={dashboardStyles.centerState}><span><CircleAlert size={25}/></span><h1>Creator Studio is unavailable</h1><p>{message}</p><button onClick={()=>void retry()}><RefreshCw size={17}/> Try again</button></div>; }
function CreatorSkeleton() { return <div className={styles.studio} aria-busy="true"><div className={`${dashboardStyles.skeleton} ${dashboardStyles.skeletonHeader}`}/><div className={`${dashboardStyles.skeleton} ${styles.skeletonHero}`}/><div className={styles.metricGrid}>{[1,2,3,4].map(item=><div className={`${dashboardStyles.skeleton} ${styles.skeletonMetric}`} key={item}/>)}</div></div>; }
