
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Menu, Bell, CalendarDays, Gamepad2, Trophy, Home, Swords, Newspaper, Target,
  Star, ChevronRight, Search, Filter, ArrowLeft, Share2, User, Lock, Mail, Eye,
  Clock, ShieldCheck, CreditCard, HelpCircle, Settings, CheckCircle, AlertTriangle,
  Plus, Edit3, Globe, Trash2, MessageCircle, Headphones, Medal, WalletCards,
  BarChart3, Award, BookOpen, Zap, Smartphone, Users, Timer, XCircle
} from "lucide-react";
import "./styles.css";

import brand from "./assets/brand.png";
import profile from "./assets/profile.webp";
import heroArt from "./assets/hero-art.webp";
import pubg from "./assets/game-pubg.webp";
import codm from "./assets/game-codm.webp";
import freefire from "./assets/game-freefire.webp";
import efootball from "./assets/game-efootball.webp";
import thumbWeekend from "./assets/thumb-weekend.webp";
import thumbPubg from "./assets/thumb-pubg.webp";
import codmWide from "./assets/codm-wide.webp";
import freefireWide from "./assets/freefire-wide.webp";
import efootballWide from "./assets/efootball-wide.webp";
import trophyWide from "./assets/trophy-wide.webp";
import blogCheckin from "./assets/blog-checkin.webp";
import blogTips from "./assets/blog-tips.webp";
import leaderboardArt from "./assets/leaderboard.webp";
import supportArt from "./assets/support.webp";
import settingsArt from "./assets/settings.webp";
import challengeArt from "./assets/challenge.webp";

const games = [
  { title: "PUBG Mobile", image: pubg, short: "PUBG", accent: "orange" },
  { title: "Call of Duty Mobile", image: codm, short: "CODM", accent: "gold" },
  { title: "Free Fire", image: freefire, short: "FREE FIRE", accent: "red" },
  { title: "eFootball", image: efootball, short: "eFOOTBALL", accent: "blue" }
];

const tournaments = [
  { title: "Weekend Cup Season 1", image: thumbWeekend, wide: heroArt, status: "Live on Mechi", statusTone: "teal", date: "29 - 31 May 2026", game: "Multiple Games", prize: "KSh 10,500" },
  { title: "PUBG Solo Showdown", image: thumbPubg, wide: thumbPubg, status: "Live", statusTone: "red", date: "05 - 07 Jun 2026", game: "PUBG Mobile", prize: "KSh 3,000" },
  { title: "CODM Elite Cup", image: codm, wide: codmWide, status: "Live on Mechi", statusTone: "teal", date: "08 - 10 Jun 2026", game: "COD Mobile", prize: "KSh 5,000" },
  { title: "Free Fire Championship", image: freefire, wide: freefireWide, status: "Registration Open", statusTone: "red", date: "12 - 14 Jun 2026", game: "Free Fire", prize: "KSh 10,500" },
  { title: "eFootball League", image: efootball, wide: efootballWide, status: "Registration Open", statusTone: "teal", date: "15 - 17 Jun 2026", game: "eFootball", prize: "KSh 2,500" }
];

const screenMeta = [
  ["splash", "Splash"],
  ["login", "Login"],
  ["signup", "Sign Up"],
  ["home", "Home"],
  ["tournaments", "Tournaments"],
  ["tournament-detail", "Tournament Detail"],
  ["my-matches", "My Matches"],
  ["blog", "Blog"],
  ["blog-detail", "Blog Detail"],
  ["edit-profile", "Edit Profile"],
  ["onboarding-1", "Onboarding 1"],
  ["onboarding-2", "Onboarding 2"],
  ["onboarding-3", "Onboarding 3"],
  ["onboarding-4", "Onboarding 4"],
  ["notifications", "Notifications"],
  ["challenges", "Challenges"],
  ["challenge-detail", "Challenge Detail"],
  ["leaderboard", "Leaderboard"],
  ["results", "Results"],
  ["match-history", "Match History"],
  ["payment-methods", "Payment Methods"],
  ["support", "Help & Support"],
  ["settings", "Settings & Security"],
  ["game-detail", "Game Details"]
];

function StatusBar() {
  return (
    <div className="status-bar">
      <span>12:30</span>
      <div className="system-icons" aria-hidden="true">
        <span className="wifi-icon" />
        <span className="signal-icon" />
        <span className="battery-icon" />
      </div>
    </div>
  );
}

function Brand() {
  return <img className="brand-image" src={brand} alt="PlayMechi" />;
}

function Header({ back=false, menu=true, share=false }) {
  return (
    <header className="topbar">
      <button className="plain-icon" aria-label={back ? "Back" : "Menu"}>
        {back ? <ArrowLeft size={28} strokeWidth={2.6} /> : menu ? <Menu size={28} strokeWidth={2.7} /> : <span />}
      </button>
      <Brand />
      <div className="top-actions">
        {share && <button className="plain-icon small" aria-label="Share"><Share2 size={21} /></button>}
        <button className="bell-wrap" aria-label="Notifications"><Bell size={25} strokeWidth={2.3} /><span className="badge">3</span></button>
        <button className="avatar-button" aria-label="Profile"><img src={profile} alt="" /></button>
      </div>
    </header>
  );
}

function AppFrame({ children, active="Home", header=true, back=false, share=false, className="" }) {
  return (
    <main className={`app-screen ${className}`}>
      <StatusBar />
      {header && <Header back={back} share={share} />}
      {children}
      {active && <BottomNav active={active} />}
    </main>
  );
}

function BottomNav({ active }) {
  const items = [
    { label: "Home", icon: Home, screen: "home" },
    { label: "Tournaments", icon: Trophy, screen: "tournaments" },
    { label: "My Matches", icon: Swords, screen: "my-matches" },
    { label: "Blog", icon: Newspaper, screen: "blog" },
    { label: "Challenges", icon: Target, screen: "challenges" }
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(({ label, icon: Icon, screen }) => (
        <button key={label} onClick={() => go(screen)} className={`nav-item ${active === label ? "active" : ""}`}>
          <Icon size={25} strokeWidth={2.2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function go(screen){ window.dispatchEvent(new CustomEvent("screen-change", {detail: screen})); }

function SectionTitle({ icon, title }) {
  return <div className="section-title"><h2>{icon}{title}</h2><a>View All <ChevronRight size={18}/></a></div>;
}

function Pill({ tone="red", children }) {
  return <span className={`mini-pill ${tone}`}><i /> {children}</span>;
}

function HeroCard({ compact=false }) {
  return (
    <section className={`hero-card ${compact ? "compact" : ""}`}>
      <div className="hero-copy">
        <div className="live-pill red"><span />Live on Mechi</div>
        <h2>Weekend Cup<strong>Season 1</strong></h2>
        <div className="hero-date"><CalendarDays size={17}/><span>29 - 31 May 2026</span></div>
        {!compact && <button className="cta-button">Register Now <ChevronRight size={24} strokeWidth={3}/></button>}
      </div>
      <img className="hero-art" src={heroArt} alt="" />
    </section>
  );
}

function GameGrid() {
  return <section className="games-grid">{games.map(game => <article className="game-card" key={game.title}><img src={game.image}/><p>{game.title}</p></article>)}</section>;
}

function TournamentCard({ item, large=false }) {
  return (
    <article className={`tournament-card ${large ? "large" : ""}`}>
      <img className="tournament-thumb" src={item.image} />
      <div className="tournament-main">
        <Pill tone={item.statusTone}>{item.status}</Pill>
        <h3>{item.title}</h3>
        <div className="tournament-meta"><span><CalendarDays size={14}/>{item.date}</span><span><Gamepad2 size={15}/>{item.game}</span></div>
        {large && <p className="desc">Survive, compete, and climb the standings in this high-stakes tournament.</p>}
      </div>
      <div className="prize-block"><Trophy size={27} fill="currentColor" /><div><small>Prize Pool</small><strong>{item.prize}</strong></div></div>
      <ChevronRight className="row-chevron" size={24}/>
    </article>
  );
}

function HomeScreen() {
  return <AppFrame active="Home">
    <section className="greeting"><h1>Hi, Gamer! <span>👋</span></h1><p>Ready to compete today?</p></section>
    <HeroCard />
    <SectionTitle icon={<Star className="section-icon" size={19} fill="currentColor"/>} title="Featured Games" />
    <GameGrid />
    <SectionTitle icon={<CalendarDays className="section-icon" size={21}/>} title="Upcoming Tournaments" />
    <section className="tournament-list">{tournaments.slice(0,2).map(item => <TournamentCard key={item.title} item={item} />)}</section>
  </AppFrame>;
}

function Splash() {
  return <AppFrame header={false} active={null} className="centered splash-screen">
    <Brand />
    <h1>Your Game.<br/>Your Tournaments.<br/><span>One App.</span></h1>
    <p>Compete. Win. Repeat.</p>
    <img className="splash-art" src={heroArt}/>
    <button onClick={()=>go("login")} className="wide-action">Get Started <ChevronRight/></button>
  </AppFrame>
}

function Login() {
  return <AppFrame header={false} active={null} className="auth-screen">
    <Brand />
    <h1>Welcome Back</h1><p>Log in to your account</p>
    <Field icon={<User/>} label="Email or Phone Number" placeholder="Enter your email or phone number" />
    <Field icon={<Lock/>} label="Password" placeholder="Enter your password" right={<Eye/>}/>
    <a className="right-link">Forgot Password?</a>
    <button onClick={()=>go("home")} className="wide-action">Login</button>
    <div className="divider">OR</div>
    <Social label="Continue with Google" mark="G" />
    <Social label="Continue with Facebook" mark="f" />
    <Social label="Continue with Apple" mark="" />
    <p className="auth-foot">Don’t have an account? <button onClick={()=>go("signup")}>Sign Up</button></p>
  </AppFrame>
}

function SignUp() {
  return <AppFrame header={false} active={null} className="auth-screen signup">
    <Brand />
    <h1>Create Your Account</h1><p>Join the PlayMechi community and compete with the best.</p>
    <Field icon={<User/>} placeholder="Username" />
    <Field icon={<Mail/>} placeholder="Email or Phone Number" />
    <Field icon={<Lock/>} placeholder="Password" right={<Eye/>}/>
    <Field icon={<Lock/>} placeholder="Confirm Password" right={<Eye/>}/>
    <label className="terms"><span/> I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b></label>
    <button onClick={()=>go("home")} className="wide-action">Sign Up</button>
    <p className="auth-foot">Already have an account? <button onClick={()=>go("login")}>Login</button></p>
  </AppFrame>
}

function Field({icon,label,placeholder,right}) {
  return <div className="field">{React.cloneElement(icon,{size:22})}<div>{label && <small>{label}</small>}<span>{placeholder}</span></div>{right && <em>{React.cloneElement(right,{size:22})}</em>}</div>
}

function Social({mark,label}) { return <div className="social"><strong>{mark}</strong><span>{label}</span></div> }

function Tournaments() {
  return <AppFrame active="Tournaments">
    <h1 className="page-title">Tournaments</h1><p className="page-sub">Compete. Climb. Conquer.</p>
    <div className="filter-row"><button className="chip active">All Games</button><button className="chip">PUBG Mobile</button><button className="chip">COD Mobile</button><button className="chip">Free Fire</button><button className="chip">eFootball</button><button className="square"><Search size={20}/></button></div>
    <section className="vertical-list">{tournaments.slice(1).map(t => <TournamentCard item={t} large key={t.title}/>)}</section>
  </AppFrame>
}

function TournamentDetail() {
  return <AppFrame active="Tournaments" back>
    <HeroCard compact />
    <section className="stats-row">
      <Stat icon={<Trophy/>} label="Prize Pool" value="KSh 10,500"/>
      <Stat icon={<Gamepad2/>} label="Format" value="Single Elim."/>
      <Stat icon={<Clock/>} label="Duration" value="3 Days"/>
      <Stat icon={<Users/>} label="Games" value="4 Games"/>
    </section>
    <div className="tabs"><button className="active">Overview</button><button>Games</button><button>Prizes</button><button>Rules</button></div>
    <section className="content-block"><h3>About this Tournament</h3><p>Weekend Cup Season 1 is a 3-day esports showdown featuring top games and fierce competition. Climb the leaderboard, prove your skills, and win a share of the prize pool.</p><InfoLine icon={<Users/>} text="Open to all players across Kenya."/><InfoLine icon={<CalendarDays/>} text="Match schedule will be announced 24 hours before games."/><InfoLine icon={<ShieldCheck/>} text="Fair play is our priority. All matches are monitored."/></section>
    <button className="wide-action">Register Now <ChevronRight/></button>
  </AppFrame>
}

function MyMatches() {
  return <AppFrame active="My Matches">
    <h1 className="page-title display">My Matches</h1>
    <div className="tabs"><button className="active">Upcoming</button><button>Live</button><button>Completed</button></div>
    <section className="match-hero">
      <Pill tone="teal">Upcoming</Pill><h2>Weekend Cup<br/><span>Season 1</span></h2><h3>Call of Duty Mobile</h3>
      <p><CalendarDays size={16}/>29 - 31 May 2026</p><p><Clock size={16}/>05:00 PM EAT</p><p><Trophy size={16}/>Prize Pool <b>KSh 10,500</b></p>
      <button className="cta-button">Check-In <ChevronRight/></button>
      <div className="countdown"><small>Check-in closes in</small><strong>02 : 11 : 45 : 18</strong></div>
    </section>
    <section className="list-panel"><Bell/> <div><h3>Match Reminder</h3><p>Get notified 30 minutes before your match starts.</p></div><span className="toggle on"/></section>
    <section className="list-panel warning"><AlertTriangle/> <div><h3>Important Notice</h3><p>Please check in on time. Failure to check in may result in disqualification.</p></div></section>
  </AppFrame>
}

function Blog() {
  const articles = [
    ["How Check-In Works", "Never miss your rewards. Learn how daily check-in keeps you ahead.", blogCheckin, "Tips"],
    ["Top 5 Battle Royale Tips", "Dominate the battlefield with these proven strategies.", blogTips, "Tips"],
    ["Why eFootball Brackets Matter", "Fair play starts with fair brackets. Here’s why it matters.", efootballWide, "News"],
  ];
  return <AppFrame active="Blog">
    <h1 className="page-title">Blog</h1><p className="page-sub">News, tips, and updates from the world of PlayMechi.</p>
    <div className="filter-row short"><button className="chip active">All</button><button className="chip">News</button><button className="chip">Tips</button><button className="chip">Updates</button></div>
    <section className="blog-feature"><Pill tone="red">Featured</Pill><h2>Weekend Cup<br/><span>Season 1:</span><br/>Modes & Maps Locked</h2><p>Here’s everything you need to know about the game modes and maps for Weekend Cup Season 1.</p><small><CalendarDays size={14}/> 29 May 2026 • <Clock size={14}/> 5 min read</small></section>
    {articles.map(([title, desc, image, type]) => <article className="article-card" key={title}><img src={image}/><div><b className={type==="News"?"red-text":"teal-text"}>{type}</b><h3>{title}</h3><p>{desc}</p><small>28 May 2026 • 3 min read</small></div><ChevronRight/></article>)}
  </AppFrame>
}

function BlogDetail() {
  return <AppFrame active="Blog" back>
    <img className="wide-banner" src={heroArt}/>
    <h1 className="article-title">Weekend Cup Season 1: Modes & Maps Locked</h1>
    <p className="page-sub"><CalendarDays size={16}/> 29 May 2026 &nbsp; | &nbsp; By <span className="teal-text">PlayMechi Team</span></p>
    <p className="article-p">The battlegrounds are set. The maps are locked. Now it’s your turn to rise. Here’s what to expect in Weekend Cup Season 1.</p>
    {[
      ["Call of Duty: Mobile", "Mode: Battle Royale | Map: Isolated", codm],
      ["Free Fire", "Mode: Battle Royale | Maps: Bermuda, Bermuda, Solara", freefire],
      ["PUBG Mobile", "Mode: Battle Royale | Maps: Rondo, Erangel, Miramar", pubg],
      ["eFootball", "Mode: 1v1 | Format: One-leg knockout", efootball]
    ].map(([t,d,i])=><div className="blog-line" key={t}><img src={i}/><div><h3>{t}</h3><p>{d}</p></div></div>)}
    <section className="join-box"><Trophy/><div><b>Ready to join?</b><p>Register for Weekend Cup and compete for glory.</p></div><button>Register Now</button></section>
  </AppFrame>
}

function EditProfile() {
  return <AppFrame active="Challenges" back>
    <h1 className="page-title">Edit Profile</h1><p className="page-sub">Update your details and let the gaming community know you.</p>
    <section className="profile-card"><img src={profile}/><div><h3>Profile Avatar</h3><p>JPG, PNG or WEBP. Max 5MB.</p><button className="outline-btn"><Edit3 size={16}/> Change Avatar</button></div></section>
    <section className="form-panel"><Field icon={<User/>} placeholder="MechiGamer"/><Field icon={<User/>} placeholder="mechigamer"/><Field icon={<MessageCircle/>} placeholder="Competitive gamer. Always grinding. Chasing wins, not losses."/><Field icon={<Globe/>} placeholder="Kenya"/></section>
    <section className="form-panel"><h3>Linked Gamer IDs</h3>{games.map((g,i)=><div className="linked-row" key={g.title}><img src={g.image}/><b>{g.title}</b><span>Mechi{["GamerYT","CODM","FF","EFO"][i]}</span><CheckCircle size={20}/></div>)}</section>
    <button className="wide-action">Save Changes</button>
  </AppFrame>
}

function Onboarding({ step }) {
  const data = [
    ["Discover Tournaments","Browse PUBG Mobile, CODM, Free Fire and eFootball competitions all in one place.", "Tournament cards, game filters, and prize pool info.", trophyWide],
    ["Register in Seconds","Choose your tournament, pay to lock your slot, and join the action fast.", "Entry fees, schedule, secure checkout, and slot lock.", heroArt],
    ["Check In & Stay Ready","Get reminders before match time, check in on time, and receive room details instantly.", "Countdowns, room ID, password, and reminders.", blogCheckin],
    ["Track Results & Read Updates","Follow standings, match results, and the PlayMechi blog all in one place.", "Results, standings, recaps, news, and guides.", leaderboardArt]
  ][step-1];
  return <AppFrame header={false} active={null} className="onboard">
    <Brand/><h1>{data[0].split(" ")[0]}<br/><span>{data[0].split(" ").slice(1).join(" ")}</span></h1><p>{data[1]}</p>
    <div className="phone-preview"><img src={data[3]}/><div><h3>{data[0]}</h3><p>{data[2]}</p></div></div>
    <div className="step">Step {step} of 4</div><div className="dots">{[1,2,3,4].map(i=><span key={i} className={i===step?"active":""}/>)}</div>
    <div className="onboard-actions"><button onClick={()=>go(step===1?"splash":`onboarding-${step-1}`)}>{step===1?"Skip":"Back"}</button><button onClick={()=>go(step===4?"home":`onboarding-${step+1}`)}>{step===4?"Get Started":"Next"} <ChevronRight/></button></div>
  </AppFrame>
}

function Notifications() {
  const rows = [
    [CalendarDays,"Check-in is now open!","Weekend Cup Season 1 check-in is open. Confirm your slot before it closes.","2m ago","NEW"],
    [CreditCard,"Payment Confirmed","Your payment of KSh 10,500 for Weekend Cup Season 1 was successful.","15m ago","NEW"],
    [Trophy,"Tournament Starts Soon","Weekend Cup Season 1 starts in 1 day. Get ready and good luck!","1h ago","NEW"],
    [Swords,"Match Results Posted","Your match results for PUBG Solo Showdown are now available.","3h ago",""],
    [Gamepad2,"Match Reminder","You have a match tomorrow at 8:00 PM EAT. Don’t forget to check-in!","Yesterday",""]
  ];
  return <AppFrame active="Challenges">
    <h1 className="page-title">Notifications</h1><p className="page-sub">Stay updated with your tournaments, matches and more.</p>
    <div className="tabs"><button className="active">All</button><button>Tournaments</button><button>Matches</button><button>System</button></div>
    {rows.map(([I,t,d,time,newb])=><section className="notification-row" key={t}><I/><div><h3>{t}</h3><p>{d}</p></div><small>{time}{newb&&<b>{newb}</b>}</small><ChevronRight/></section>)}
  </AppFrame>
}

function Challenges() {
  return <AppFrame active="Challenges">
    <h1 className="page-title display">Challenges</h1><p className="page-sub">Complete challenges. Earn XP. Unlock rewards.</p>
    <section className="xp-card"><Award/><div><small>Your XP</small><h2>2,450</h2><p>Level 12</p></div><div className="progress"><span style={{width:"72%"}}/></div><b>550 XP</b></section>
    <div className="tabs"><button className="active">Daily</button><button>Weekly</button><button>Event</button></div>
    {[
      ["Join 1 tournament","Participate in any tournament","1/1","Claimed",100],
      ["Win 3 matches","Win any 3 matches in any game mode","2/3","Go",65],
      ["Check in on time","Check in to a tournament on time","1/1","Claimed",100],
      ["Read 2 blog posts","Read any 2 blog posts","1/2","Go",50]
    ].map(([t,d,n,a,w])=><ChallengeRow key={t} title={t} desc={d} num={n} action={a} width={w}/>)}
    <section className="event-challenge"><img src={trophyWide}/><div><h3>Weekend Cup Participation</h3><p>Play 5 matches in Weekend Cup Season 1</p><div className="progress"><span style={{width:"60%"}}/></div><small>Ends in 2d 14h 32m</small></div><b>2,000 XP</b></section>
  </AppFrame>
}

function ChallengeRow({title,desc,num,action,width}) {
  return <section className="challenge-row"><Target/><div><h3>{title}</h3><p>{desc}</p><div className="progress"><span style={{width:`${width}%`}}/></div></div><small>{num}</small><button>{action}</button></section>
}

function ChallengeDetail() {
  return <AppFrame active="Challenges" back>
    <section className="challenge-hero"><Pill tone="red">Challenge</Pill><h2>Weekend<br/><span>Warrior</span></h2><p>Play hard. Win proud. Dominate the weekend.</p><small><CalendarDays size={16}/> Ends in 2d 14h 29m</small></section>
    <section className="content-block"><h3>Challenge Overview</h3><p>Show off your skills this weekend! Complete all objectives to earn exclusive rewards.</p></section>
    <section className="content-block"><h3>Objectives</h3><Objective label="Play 10 Matches" value="7 / 10" pct="70%"/><Objective label="Win 5 Matches" value="5 / 5" pct="100%" red/><Objective label="Deal 5,000 Damage" value="3,250 / 5,000" pct="65%"/></section>
    <section className="content-block"><h3>Rewards</h3><div className="reward-grid"><div><Trophy/><b>Mechi Coins</b><strong>1,000</strong></div><div><Award/><b>Weekend Warrior Crate</b><strong>x1</strong></div></div></section>
    <button className="wide-action">Track Progress</button>
  </AppFrame>
}

function Objective({label,value,pct,red}) { return <div className="objective"><span>{label}</span><b className={red?"red-text":"teal-text"}>{value}</b><div className="progress"><span className={red?"red-bg":""} style={{width:pct}}/></div></div> }

function Leaderboard() {
  const players = [["1","MechiGamer","12,480","82.6%"],["2","ShadowStrike","9,250","78.3%"],["3","NovaFusion","8,760","74.1%"],["4","KillSwitch","7,540","71.2%"],["5","GhostX","6,980","69.8%"],["21","MechiGamer (You)","3,650","55.6%"]];
  return <AppFrame active="Challenges">
    <h1 className="page-title">Leaderboard</h1><p className="page-sub">See how you rank among the best gamers.</p>
    <div className="filter-row"><button className="chip active">Weekend Cup S1</button><button className="chip">All Regions</button><button className="chip">Overall</button></div>
    <img className="wide-banner compact-img" src={leaderboardArt}/>
    <section className="leader-table">{players.map(p=><div className={`leader-row ${p[0]==="21"?"you":""}`} key={p[0]}><b>{p[0]}</b><span>{p[1]}</span><strong>{p[2]}</strong><small>{p[3]}</small></div>)}</section>
  </AppFrame>
}

function Results() {
  const rows = [["PUBG","Weekend Cup Season 1","Erangel | Squad TPP","#2","10,250","18 Kills", pubg],["CODM","CODM Masters Series","Search & Destroy | Crossfire","#1","12,480","22 Kills",codm],["FF","Free Fire Pro League","Bermuda | Squad","#3","8,760","15 Kills",freefire],["eF","eFootball Championship","eFootball Stadium | 1v1","#4","6,320","9 Goals",efootball]];
  return <AppFrame active="Home">
    <h1 className="page-title">Results</h1><p className="page-sub">Track your performance and victories.</p>
    <div className="tabs"><button>Live</button><button className="active">Completed</button><button>Archived</button></div>
    {rows.map(r=><section className="result-card" key={r[1]}><img src={r[6]}/><div><Pill tone="teal">Completed</Pill><h3>{r[1]}</h3><p>{r[2]}</p><div className="result-stats"><b>{r[3]}</b><b>{r[4]}</b><b>{r[5]}</b></div><a>View Full Results</a></div></section>)}
  </AppFrame>
}

function MatchHistory() {
  const rows = [["WON","Weekend Cup Season 1","Call of Duty: Mobile","12 - 8",codm],["LOST","PUBG Solo Showdown","PUBG Mobile","4 - 9",pubg],["ELIMINATED","Free Fire Clash Squad Cup","Free Fire","1 - 3",freefire],["WON","eFootball League","eFootball","3 - 2",efootball]];
  return <AppFrame active="My Matches">
    <h1 className="page-title display">My Matches</h1><p className="page-sub">Here’s your match history.</p>
    <div className="tabs"><button>Upcoming</button><button>Live</button><button className="active">Completed</button></div>
    {rows.map(r=><section className="history-row" key={r[1]}><img src={r[4]}/><div><Pill tone={r[0]==="WON"?"teal":"red"}>{r[0]}</Pill><h3>{r[1]}</h3><p>{r[2]}</p></div><strong className={r[0]==="WON"?"teal-text":"red-text"}>{r[3]}</strong><a>View Recap</a></section>)}
  </AppFrame>
}

function PaymentMethods() {
  return <AppFrame active="Challenges" back>
    <h1 className="page-title">Payment Methods</h1><p className="page-sub">Manage your saved payment methods and preferences.</p>
    <h3>Saved Methods</h3>
    <Payment name="M-Pesa" detail="+254 712 345 678" icon="M" def/>
    <Payment name="Paystack Card" detail="•••• •••• •••• 4242 VISA" icon="P"/>
    <Payment name="Equity Bank" detail="•••• •••• •••• 5689" icon="E"/>
    <section className="add-method"><Plus/><div><b>Add New Payment Method</b><p>Cards, Mobile Money, or Bank Transfer</p></div><ChevronRight/></section>
    <section className="content-block secure"><ShieldCheck/><div><h3>Secure Payments</h3><p>Your payment information is encrypted and secure. We never store your full card details.</p></div></section>
  </AppFrame>
}
function Payment({name,detail,icon,def}) { return <section className="payment-row"><div className="pay-icon">{icon}</div><div><h3>{name} {def&&<span>Default</span>}</h3><p>{detail}</p></div>{def?<CheckCircle/>:<Edit3/>}</section> }

function Support() {
  return <AppFrame active="Challenges">
    <h1 className="page-title">Help & Support</h1><p className="page-sub">We’re here to help you, Gamer!</p>
    <div className="faq-list"><h3>FAQs <a>View All <ChevronRight size={18}/></a></h3>{["How do I join a tournament?","How do I check my match schedule?","When and how will I receive my winnings?","What should I do if I face an issue in a match?"].map(q=><div className="faq" key={q}>{q}<ChevronRight/></div>)}</div>
    <h3>Need More Help?</h3>
    <SupportRow icon={<Mail/>} title="Contact Support" desc="Our team typically replies within 24 hours."/>
    <SupportRow icon={<MessageCircle/>} title="WhatsApp / Chat Support" desc="Chat with our support team instantly." badge="LIVE"/>
    <SupportRow icon={<AlertTriangle/>} title="Report a Problem" desc="Report bugs, technical issues, or other problems." red/>
    <SupportRow icon={<ShieldCheck/>} title="Tournament Dispute Help" desc="Need help with a match or tournament dispute?"/>
  </AppFrame>
}
function SupportRow({icon,title,desc,badge,red}) { return <section className={`support-row ${red?"red":""}`}>{icon}<div><h3>{title}</h3><p>{desc}</p></div>{badge&&<Pill tone="teal">{badge}</Pill>}<ChevronRight/></section> }

function SettingsSecurity() {
  return <AppFrame active="Challenges">
    <h1 className="page-title">Settings & Security</h1><p className="page-sub">Manage your account, security, and preferences</p>
    <h3 className="teal-text">Account & Security</h3>
    <SettingsRow icon={<Lock/>} title="Change Password" desc="Update your account password"/>
    <SettingsRow icon={<ShieldCheck/>} title="Two-Factor Authentication" desc="Add an extra layer of security" toggle/>
    <SettingsRow icon={<Users/>} title="Privacy" desc="Manage your privacy settings"/>
    <h3 className="teal-text">Preferences</h3>
    <SettingsRow icon={<Bell/>} title="Notification Preferences" desc="Choose what and how you want to be notified"/>
    <SettingsRow icon={<Smartphone/>} title="App Theme" desc="Choose your preferred app appearance" value="Dark"/>
    <SettingsRow icon={<Globe/>} title="Language" desc="Select your preferred language" value="English"/>
    <h3 className="red-text">Danger Zone</h3><SettingsRow icon={<Trash2/>} title="Delete Account" desc="Permanently delete your PlayMechi account" red/>
  </AppFrame>
}
function SettingsRow({icon,title,desc,toggle,value,red}) { return <section className={`settings-row ${red?"danger":""}`}>{icon}<div><h3>{title}</h3><p>{desc}</p></div>{toggle?<span className="toggle on"/>:value?<b>{value}</b>:<ChevronRight/>}</section> }

function GameDetail() {
  return <AppFrame active="Tournaments" back>
    <img className="wide-banner" src={codmWide}/>
    <h1 className="page-title">Call of Duty: Mobile</h1><p className="page-sub">Fast-paced FPS combat with ranked and battle royale tournaments.</p>
    <section className="content-block">{[["Genre","FPS"],["Mode","Multiplayer, Battle Royale"],["Developer","Activision"],["Size","2.4 GB"],["Rating","4.3 ★"]].map(([k,v])=><InfoKV key={k} k={k} v={v}/>)}</section>
    <button className="wide-action">View Tournaments</button>
  </AppFrame>
}

function Stat({icon,label,value}) { return <div className="stat-card">{icon}<small>{label}</small><b>{value}</b></div> }
function InfoLine({icon,text}) { return <div className="info-line">{icon}<span>{text}</span></div> }
function InfoKV({k,v}) { return <div className="info-kv"><span>{k}</span><b>{v}</b></div> }

const screens = {
  splash: <Splash />,
  login: <Login />,
  signup: <SignUp />,
  home: <HomeScreen />,
  tournaments: <Tournaments />,
  "tournament-detail": <TournamentDetail />,
  "my-matches": <MyMatches />,
  blog: <Blog />,
  "blog-detail": <BlogDetail />,
  "edit-profile": <EditProfile />,
  "onboarding-1": <Onboarding step={1}/>,
  "onboarding-2": <Onboarding step={2}/>,
  "onboarding-3": <Onboarding step={3}/>,
  "onboarding-4": <Onboarding step={4}/>,
  notifications: <Notifications />,
  challenges: <Challenges />,
  "challenge-detail": <ChallengeDetail />,
  leaderboard: <Leaderboard />,
  results: <Results />,
  "match-history": <MatchHistory />,
  "payment-methods": <PaymentMethods />,
  support: <Support />,
  settings: <SettingsSecurity />,
  "game-detail": <GameDetail />
};

function PreviewMenu({ current, setCurrent }) {
  return <aside className="screen-menu">
    <b>24 Screens</b>
    {screenMeta.map(([key, label], i)=><button key={key} onClick={()=>setCurrent(key)} className={current===key?"active":""}>{String(i+1).padStart(2,"0")} · {label}</button>)}
  </aside>
}

function Root() {
  const [current,setCurrent] = useState(() => new URLSearchParams(location.search).get("screen") || "home");
  React.useEffect(() => {
    const handler = e => setCurrent(e.detail);
    window.addEventListener("screen-change", handler);
    return () => window.removeEventListener("screen-change", handler);
  }, []);
  React.useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("screen", current);
    history.replaceState(null, "", url);
  }, [current]);
  return <div className="stage"><PreviewMenu current={current} setCurrent={setCurrent}/>{screens[current] || screens.home}</div>
}

createRoot(document.getElementById("root")).render(<Root />);
