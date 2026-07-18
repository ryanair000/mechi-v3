'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, Gamepad2, MapPin, Search, ShieldCheck, Trophy, UsersRound } from 'lucide-react';
import type { PublicTournament } from '@/lib/public-tournament-data';
import styles from './V5TournamentDirectory.module.css';

type EntryFilter = 'all' | 'free' | 'paid';

export function V5TournamentDirectory({ tournaments }: { tournaments: PublicTournament[] }) {
  const [query,setQuery]=useState(''); const [game,setGame]=useState('all'); const [entry,setEntry]=useState<EntryFilter>('all'); const [sort,setSort]=useState('soonest');
  const games=useMemo(()=>Array.from(new Map(tournaments.map((item)=>[item.game,item.game_label])).entries()),[tournaments]);
  const visible=useMemo(()=>tournaments.filter((item)=>{
    const text=`${item.title} ${item.game_label} ${item.region} ${item.organizer?.username||''}`.toLowerCase();
    return (!query.trim()||text.includes(query.trim().toLowerCase()))&&(game==='all'||item.game===game)&&(entry==='all'||(entry==='free'?item.entry_fee===0:item.entry_fee>0));
  }).sort((a,b)=>sort==='filling'?b.player_count/Math.max(1,b.size)-a.player_count/Math.max(1,a.size):sort==='newest'?String(b.created_at||'').localeCompare(String(a.created_at||'')):String(a.scheduled_for||'9999').localeCompare(String(b.scheduled_for||'9999'))),[entry,game,query,sort,tournaments]);
  const free=tournaments.filter((item)=>item.entry_fee===0&&item.prize_pool===0).length;
  return <>
    <section className={styles.hero}><div className={styles.container}><div><p>Competition directory</p><h1>Find a tournament worth playing.</h1><span>Compare format, entry, schedule, region and trust signals before entering from your Player Dashboard.</span></div><Link href="/app/organizer/tournaments/new">Host a tournament <ArrowRight size={16}/></Link><div className={styles.heroMetrics}><div><strong>{tournaments.length}</strong><span>Approved public tournaments</span></div><div><strong>{free}</strong><span>Free, no-reward events</span></div><div><strong>Solo + team</strong><span>Competition formats</span></div><div><strong>Paystack</strong><span>Approved paid entry rail</span></div></div></div></section>
    <section className={styles.container}><div className={styles.filters}>
      <label className={styles.search}><Search size={17}/><span className={styles.srOnly}>Search tournaments</span><input value={query} placeholder="Search game, tournament, region or organizer" onChange={(event)=>setQuery(event.target.value)}/></label>
      <label><span>Game</span><select value={game} onChange={(event)=>setGame(event.target.value)}><option value="all">All games</option>{games.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
      <label><span>Entry</span><select value={entry} onChange={(event)=>setEntry(event.target.value as EntryFilter)}><option value="all">Any entry</option><option value="free">Free entry</option><option value="paid">Paid entry</option></select></label>
      <label><span>Sort</span><select value={sort} onChange={(event)=>setSort(event.target.value)}><option value="soonest">Starting soonest</option><option value="filling">Filling fastest</option><option value="newest">Newest</option></select></label>
    </div><div className={styles.resultBar}><span><strong>{visible.length}</strong> matching tournaments</span><small>Only publicly eligible events appear here.</small></div>
    {visible.length?<div className={styles.grid}>{visible.map((item,index)=><TournamentCard tournament={item} index={index} key={item.slug}/>)}</div>:<div className={styles.empty}><Trophy/><h2>No tournament matches these filters</h2><p>Clear one filter or try another game. Your current filters stay visible so the result is understandable.</p><button type="button" onClick={()=>{setQuery('');setGame('all');setEntry('all')}}>Clear filters</button></div>}</section>
    <section className={styles.hostBand}><div className={styles.container}><ShieldCheck/><div><h2>Want to host?</h2><p>A free-entry event with no cash or valuable reward can publish after readiness checks. Paid or rewarded events are submitted to Mechi for approval.</p></div><Link href="/app/organizer/tournaments/new">Open Organizer Dashboard <ArrowRight size={16}/></Link></div></section>
  </>;
}

function TournamentCard({tournament,index}:{tournament:PublicTournament;index:number}){
  const fill=Math.min(100,Math.round(tournament.player_count/Math.max(1,tournament.size)*100));
  const scheduled=tournament.scheduled_for?new Intl.DateTimeFormat('en-KE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Nairobi'}).format(new Date(tournament.scheduled_for)):'Schedule pending';
  const art=[styles.artTeal,styles.artCoral,styles.artNavy][index%3];
  return <article className={styles.card}><div className={`${styles.art} ${art}`}><span>{tournament.status==='active'?'Live':tournament.status==='open'?'Registration open':tournament.status}</span><Gamepad2/><strong>{tournament.game_label}</strong></div><div className={styles.cardBody}><div className={styles.cardTop}><div><p>{tournament.entry_fee===0?'Free entry':`KES ${tournament.entry_fee.toLocaleString('en-KE')} entry`}</p><h2>{tournament.title}</h2></div>{tournament.entry_fee>0||tournament.prize_pool>0?<span className={styles.approved}><ShieldCheck size={13}/> Mechi approved</span>:<span className={styles.instant}><ShieldCheck size={13}/> No-reward event</span>}</div><div className={styles.meta}><span><CalendarClock/> {scheduled} EAT</span><span><MapPin/> {tournament.region}</span><span><UsersRound/> {tournament.player_count}/{tournament.size} players</span><span><Trophy/> {tournament.prize_pool?`KES ${tournament.prize_pool.toLocaleString('en-KE')} prize`:'No cash prize'}</span></div><div className={styles.progress}><div><span>{fill}% filled</span><small>{tournament.slots_left} slots left</small></div><i><b style={{width:`${fill}%`}}/></i></div><div className={styles.cardFooter}><span>Hosted by <strong>{tournament.organizer?.username||'PlayMechi organizer'}</strong></span><Link href={`/tournaments/${encodeURIComponent(tournament.slug)}`}>View details <ArrowRight size={15}/></Link></div></div></article>;
}
