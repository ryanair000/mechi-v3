import Image from 'next/image';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  FileCheck2,
  Gamepad2,
  Handshake,
  MapPin,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Video,
} from 'lucide-react';
import { HomeFeaturedTournament, HomeTournamentExplorer } from './HomeTournamentFeed';
import styles from './PlayMechiHome.module.css';

type Role = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: 'teal' | 'coral';
};

const roles: Role[] = [
  { title: 'Play', description: 'Find tournaments and compete.', href: '/playmechi/tournaments', icon: Gamepad2, tone: 'teal' },
  { title: 'Host', description: 'Create and manage tournaments.', href: '/tournaments/create', icon: Trophy, tone: 'coral' },
  { title: 'Stream', description: 'Broadcast your matches and grow.', href: '/streams', icon: Video, tone: 'teal' },
  { title: 'Coach', description: 'Share knowledge and build players.', href: '/playmechi/ui/coach-workspace', icon: ShieldCheck, tone: 'coral' },
  { title: 'Sponsor', description: 'Support events and communities.', href: '/playmechi/ui/sponsorship-marketplace', icon: Handshake, tone: 'teal' },
  { title: 'Run local events', description: 'Organize meetups and local competitions.', href: '/playmechi/ui/gaming-shop', icon: MapPin, tone: 'coral' },
];

const ecosystem = [
  { title: 'Creators', description: 'Grow your audience and bring more eyes to the game.', artwork: 'ecosystemCreators', href: '/playmechi/ui/streamer-workspace' },
  { title: 'Coaches', description: 'Develop talent and build the next generation.', artwork: 'ecosystemCoaches', href: '/playmechi/ui/coach-workspace' },
  { title: 'Companies', description: 'Connect with communities through competition.', artwork: 'ecosystemCompanies', href: '/playmechi/ui/sponsorship-marketplace' },
  { title: 'Gaming shops', description: 'Engage players and power your local scene.', artwork: 'ecosystemShops', href: '/playmechi/ui/gaming-shop' },
] as const;

const footerGroups = [
  { title: 'Play', links: [['Find tournaments', '/playmechi/tournaments'], ['How it works', '#record'], ['Rankings', '/leaderboard'], ['Gamer dashboard', '/playmechi/ui/gamer-dashboard']] },
  { title: 'Organize', links: [['Host a tournament', '/tournaments/create'], ['Control center', '/playmechi/ui/control-center'], ['Organization workspace', '/playmechi/ui/organization-workspace'], ['Approval policy', '/terms-of-service']] },
  { title: 'Grow', links: [['Streamer workspace', '/playmechi/ui/streamer-workspace'], ['Coach workspace', '/playmechi/ui/coach-workspace'], ['Sponsorships', '/playmechi/ui/sponsorship-marketplace'], ['Gaming shops', '/playmechi/ui/gaming-shop']] },
  { title: 'Community', links: [['Teams', '/socials'], ['Public rankings', '/playmechi/ui/rankings'], ['Notifications', '/notifications'], ['Local events', '/playmechi/tournaments']] },
  { title: 'Company', links: [['About PlayMechi', '/platform'], ['Product screens', '/playmechi/ui'], ['Contact', '/v5/support'], ['Blog', '/blog']] },
  { title: 'Support', links: [['Help center', '/v5/support'], ['Report an issue', '/report'], ['Terms of service', '/terms-of-service'], ['Privacy policy', '/privacy-policy']] },
] as const;

function Brand({ compact = false }: { compact?: boolean }) {
  const size = compact ? 38 : 54;
  return (
    <Link className={compact ? styles.brandCompact : styles.brand} href="/" aria-label="PlayMechi home">
      <Image src="/mechi-logo.png" alt="" width={size} height={size} />
      <span>PLAY<span>MECHI</span></span>
    </Link>
  );
}

export function PlayMechiHome() {
  return (
    <div className={styles.viewport}>
      <aside className={styles.announcement}>
        <Sparkles size={16} aria-hidden="true" />
        <Link href="/tournaments/create">Host a free tournament with no cash prize or reward today.</Link>
      </aside>

      <header className={styles.header}>
        <div className={styles.container}>
          <Brand />
          <nav className={styles.nav} aria-label="Primary navigation">
            <Link href="/playmechi/tournaments">Play</Link>
            <Link href="/playmechi/tournaments">Tournaments</Link>
            <Link href="/streams">Watch</Link>
            <Link href="/socials">Community</Link>
            <Link href="/leaderboard">Rankings</Link>
          </nav>
          <div className={styles.accountActions}>
            <Link href="/login">Sign in</Link>
            <Link className={styles.primaryButton} href="/register">Join PlayMechi</Link>
          </div>
          <details className={styles.mobileNav}>
            <summary aria-label="Open navigation"><Menu size={24} /><span className={styles.srOnly}>Menu</span></summary>
            <nav aria-label="Mobile navigation">
              <Link href="/playmechi/tournaments">Tournaments</Link>
              <Link href="/streams">Watch</Link>
              <Link href="/leaderboard">Rankings</Link>
              <Link href="/socials">Community</Link>
              <Link href="/tournaments/create">Host a tournament</Link>
              <Link href="/login">Sign in</Link>
              <Link className={styles.mobileJoin} href="/register">Join PlayMechi</Link>
            </nav>
          </details>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>AFRICA&apos;S COMPETITIVE GAMING NETWORK</p>
              <h1>THE HOME OF AFRICAN COMPETITION.</h1>
              <p className={styles.heroLead}>Play, host, stream, coach, or support the communities shaping African gaming.</p>
              <div className={styles.heroActions}>
                <Link className={styles.primaryButton} href="/playmechi/tournaments">Start competing</Link>
                <Link className={styles.secondaryButton} href="/tournaments/create">Host a tournament</Link>
              </div>
            </div>
            <HomeFeaturedTournament />
          </div>
        </section>

        <section className={styles.roleSection} aria-labelledby="role-heading">
          <div className={styles.container}>
            <div className={styles.sectionIntro}>
              <h2 id="role-heading">How do you want to join?</h2>
            </div>
            <div className={styles.roleGrid}>
              {roles.map(({ title, description, href, icon: Icon, tone }) => (
                <Link className={styles.roleCard} href={href} key={title}>
                  <span className={tone === 'teal' ? styles.iconTeal : styles.iconCoral}><Icon size={30} /></span>
                  <span><strong>{title}</strong><small>{description}</small></span>
                  <ArrowRight size={20} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <HomeTournamentExplorer />

        <section className={styles.recordSection} id="record" aria-labelledby="record-heading">
          <div className={styles.container}>
            <div className={styles.sectionIntroLeft}>
              <h2 id="record-heading">Build a gaming record that follows you</h2>
            </div>
            <div className={styles.recordGrid}>
              <article className={styles.profileCard}>
                <div className={styles.profileTop}>
                  <div className={`${styles.profileAvatar} ${styles.approvedAvatarArtwork}`} role="img" aria-label="PlayMechi gamer profile" />
                  <div><h3>AzizTheOne <BadgeCheck size={18} /></h3><p>Lagos, Nigeria</p><span>Level 12</span></div>
                </div>
                <dl><div><dt>Matches</dt><dd>128</dd></div><div><dt>Wins</dt><dd>76</dd></div><div><dt>Win rate</dt><dd>59%</dd></div></dl>
                <Link href="/playmechi/ui/gamer-profile">View public profile <ArrowRight size={16} /></Link>
              </article>
              <ol className={styles.journey}>
                <li><span>1</span><i><Trophy /></i><div><strong>Compete</strong><small>Join solo or team tournaments and play your best.</small></div></li>
                <li><span>2</span><i><ShieldCheck /></i><div><strong>Verify results</strong><small>Evidence and opponent confirmation protect every outcome.</small></div></li>
                <li><span>3</span><i><TrendingUp /></i><div><strong>Grow your rank</strong><small>Verified performance builds reputation and unlocks opportunities.</small></div></li>
              </ol>
            </div>
          </div>
        </section>

        <section className={styles.hostSection} id="host" aria-labelledby="host-heading">
          <div className={`${styles.container} ${styles.hostGrid}`}>
            <div className={styles.hostCopy}>
              <p className={styles.sectionEyebrow}>FOR ORGANIZERS</p>
              <h2 id="host-heading">Host tournaments people trust</h2>
              <p>Create fair, fun, and credible tournaments in just a few minutes.</p>
              <ul>
                <li><CheckCircle2 /> Free + no prize: publish instantly</li>
                <li><ShieldCheck /> Paid or rewarded: approval required</li>
              </ul>
              <Link className={styles.primaryButton} href="/tournaments/create">Host a free tournament</Link>
            </div>
            <div className={styles.hostPreview} aria-label="Tournament creation preview">
              <div className={styles.previewHeader}><div><span>CREATE A TOURNAMENT</span><h3>Weekend Community Cup</h3></div><span className={styles.previewReady}><Check size={15} /> Ready to publish</span></div>
              <div className={styles.previewSteps}><span className={styles.previewStepActive}>1 Basics</span><i /><span>2 Format</span><i /><span>3 Schedule</span><i /><span>4 Review</span></div>
              <div className={styles.previewForm}>
                <label><span>Tournament name</span><strong>Weekend Community Cup</strong></label>
                <label><span>Game</span><strong>PUBG Mobile</strong></label>
                <label><span>Participant mode</span><strong>Team</strong></label>
                <label><span>Entry and rewards</span><strong>Free · No prizes</strong></label>
              </div>
              <div className={styles.previewPolicy}><ShieldCheck size={22} /><div><strong>Publish immediately</strong><span>This tournament does not require approval.</span></div></div>
            </div>
          </div>
        </section>

        <section className={styles.ecosystemSection} id="ecosystem" aria-labelledby="ecosystem-heading">
          <div className={styles.container}>
            <div className={styles.sectionIntro}>
              <h2 id="ecosystem-heading">Build around competition</h2>
            </div>
            <div className={styles.ecosystemGrid}>
              {ecosystem.map((item) => (
                <article className={styles.ecosystemCard} key={item.title}>
                  <div className={`${styles.ecosystemImage} ${styles[item.artwork]}`} role="img" aria-label={`${item.title} on PlayMechi`} />
                  <div><h3>{item.title}</h3><p>{item.description}</p><Link href={item.href}>Learn more <ArrowRight size={16} /></Link></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.trustSection} aria-labelledby="trust-heading">
          <div className={styles.container}>
            <div className={styles.sectionIntro}>
              <h2 id="trust-heading">Fair competition, built in</h2>
            </div>
            <div className={styles.trustGrid}>
              <article><BadgeCheck /><div><h3>Verified results</h3><p>Evidence-backed outcomes update public records and rankings.</p></div></article>
              <article><FileCheck2 /><div><h3>Clear rules</h3><p>Participants understand entry, rewards, format, and expectations.</p></div></article>
              <article><Scale /><div><h3>Fair disputes</h3><p>Conflicting results remain paused until a moderator reviews evidence.</p></div></article>
              <article><Users /><div><h3>Trusted organizers</h3><p>Completion, dispute, and delivery history build public credibility.</p></div></article>
            </div>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.container}>
            <h2>Your next competition starts here.</h2>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerGrid}`}>
          <div className={styles.footerBrand}><Brand compact /><p>Africa&apos;s competitive gaming network.</p><small>© 2026 PlayMechi. All rights reserved.</small></div>
          {footerGroups.map((group) => <nav key={group.title} aria-label={group.title}><h3>{group.title}</h3>{group.links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}</nav>)}
        </div>
      </footer>
    </div>
  );
}
