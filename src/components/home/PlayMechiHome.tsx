import Image from 'next/image';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gamepad2,
  ListChecks,
  LockKeyhole,
  MapPin,
  Medal,
  Menu,
  PlayCircle,
  Radio,
  Scale,
  ShieldCheck,
  Store,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { getGameImage } from '@/lib/config';
import type { PublicTournament } from '@/lib/public-tournament-data';
import { formatTournamentDateTime } from '@/lib/tournament-schedule';

import styles from './PlayMechiHome.module.css';

type AudienceRole = {
  title: string;
  description: string;
  action: string;
  href: string;
  icon: LucideIcon;
  tone: 'coral' | 'teal' | 'gold' | 'blue' | 'violet' | 'green';
};

type Tournament = {
  slug: string;
  game: string;
  title: string;
  organizer: string;
  status: string;
  statusTone: 'open' | 'live' | 'complete';
  schedule: string;
  format: string;
  image: string;
  imageAlt: string;
  entryLabel: string;
  prizeLabel: string;
  href: string;
};

const audienceRoles: AudienceRole[] = [
  {
    title: 'Gamers',
    description: 'Find matches, compete, record results, and build a reputation that follows you.',
    action: 'Start competing',
    href: '#tournaments',
    icon: Gamepad2,
    tone: 'coral',
  },
  {
    title: 'Organizers',
    description: 'Create structured tournaments with clear rules, brackets, and credible results.',
    action: 'Host a tournament',
    href: '#host',
    icon: Trophy,
    tone: 'teal',
  },
  {
    title: 'Streamers',
    description: 'Turn live competition into content and give your audience a reason to return.',
    action: 'Grow your audience',
    href: '#ecosystem',
    icon: Radio,
    tone: 'gold',
  },
  {
    title: 'Coaches',
    description: 'Demonstrate expertise through verified player progress and tournament performance.',
    action: 'Build authority',
    href: '#record',
    icon: Target,
    tone: 'blue',
  },
  {
    title: 'Companies',
    description: 'Sponsor credible competitions and reach active gaming communities across Africa.',
    action: 'Sponsor competition',
    href: '#ecosystem',
    icon: Building2,
    tone: 'violet',
  },
  {
    title: 'Gaming shops',
    description: 'Run local tournaments under your shop organization and grow a loyal player base.',
    action: 'Activate your shop',
    href: '#host',
    icon: Store,
    tone: 'green',
  },
];

function getStatusPresentation(status: string): Pick<Tournament, 'status' | 'statusTone'> {
  if (status === 'open') return { status: 'Registration open', statusTone: 'open' };
  if (status === 'active') return { status: 'Live now', statusTone: 'live' };
  if (status === 'full') return { status: 'Bracket full', statusTone: 'live' };
  return { status: 'Completed', statusTone: 'complete' };
}

function mapHomeTournament(tournament: PublicTournament): Tournament {
  const status = getStatusPresentation(tournament.status);
  const image = getGameImage(tournament.game) || '/dashboard-promos/playmechi-launch-mobile-gaming.jpg';
  return {
    slug: tournament.slug,
    game: tournament.game_label,
    title: tournament.title,
    organizer: tournament.organizer?.username ?? 'PlayMechi organizer',
    ...status,
    schedule: formatTournamentDateTime(
      tournament.scheduled_for ?? tournament.started_at ?? tournament.created_at,
      'Date to be announced'
    ),
    format: `${tournament.size}-player bracket${tournament.platform ? ` · ${tournament.platform}` : ''}`,
    image,
    imageAlt: `${tournament.game_label} tournament artwork`,
    entryLabel:
      tournament.entry_fee > 0
        ? `Entry KES ${tournament.entry_fee.toLocaleString('en-KE')}`
        : 'Free entry',
    prizeLabel:
      tournament.prize_pool > 0
        ? `Prize KES ${tournament.prize_pool.toLocaleString('en-KE')}`
        : 'No cash prize',
    href: `/s/t/${encodeURIComponent(tournament.slug)}`,
  };
}

const ecosystemCards = [
  {
    eyebrow: 'For creators',
    title: 'Make competition watchable',
    description: 'Find stories, recurring events, and players worth following.',
    href: '/streams',
    action: 'Explore streams',
    image: '/dashboard-promos/playmechi-upcoming-stream.jpg',
    imageAlt: 'Gaming creator streaming from a multi-screen setup',
  },
  {
    eyebrow: 'For coaches',
    title: 'Let performance prove expertise',
    description: 'Use verified matches and rankings to show measurable player progress.',
    href: '#record',
    action: 'See player records',
    image: '/game-artwork/efootball-header-photo.png',
    imageAlt: 'Competitive football game used for coaching and player development',
  },
  {
    eyebrow: 'For companies',
    title: 'Reach communities through play',
    description: 'Support credible tournaments without getting in the way of competition.',
    href: '#host',
    action: 'Discuss sponsorship',
    image: '/dashboard-promos/playmechi-socials-community.jpg',
    imageAlt: 'Members of the PlayMechi gaming community',
  },
  {
    eyebrow: 'For gaming shops',
    title: 'Turn your venue into a local arena',
    description: 'Host under a recognized shop profile and bring nearby players together.',
    href: '#host',
    action: 'Host at your shop',
    image: '/game-artwork/tekken8-header.webp',
    imageAlt: 'Fighting game competitors featured for a local gaming shop tournament',
  },
];

const footerGroups = [
  {
    title: 'Play',
    links: [
      { label: 'Find tournaments', href: '/playmechi/tournaments' },
      { label: 'Rankings', href: '/leaderboard' },
      { label: 'Match history', href: '/matches' },
    ],
  },
  {
    title: 'Host',
    links: [
      { label: 'Create tournament', href: '/tournaments/create' },
      { label: 'Organizer tools', href: '/tournaments' },
      { label: 'Approval policy', href: '#host' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Streamers', href: '/streams' },
      { label: 'Coaches', href: '#ecosystem' },
      { label: 'Gaming shops', href: '#ecosystem' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Mechi', href: '/platform' },
      { label: 'Sponsor events', href: '#ecosystem' },
      { label: 'Support', href: '/v5/support' },
    ],
  },
];

function Brand() {
  return (
    <Link className={styles.brand} href="/" aria-label="PlayMechi home">
      <Image src="/mechi-logo-shield.png" alt="" width={40} height={40} priority />
      <span>PLAYMECHI</span>
    </Link>
  );
}

function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className={styles.arrowLink} href={href}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" size={18} />
    </Link>
  );
}

function Header() {
  const navLinks = [
    { label: 'Play', href: '#tournaments' },
    { label: 'Tournaments', href: '/playmechi/tournaments' },
    { label: 'Watch', href: '/streams' },
    { label: 'Community', href: '#ecosystem' },
    { label: 'Rankings', href: '/leaderboard' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Brand />
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link href={link.href} key={link.label}>{link.label}</Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.signIn} href="/login">Sign in</Link>
          <Link className={styles.primaryButton} href="/register">Join PlayMechi</Link>
        </div>
        <details className={styles.mobileMenu}>
          <summary aria-label="Open navigation menu">
            <Menu aria-hidden="true" size={24} />
          </summary>
          <nav aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link href={link.href} key={link.label}>{link.label}</Link>
            ))}
            <Link href="/login">Sign in</Link>
            <Link className={styles.mobileJoin} href="/register">Join PlayMechi</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function Hero({ featuredTournament }: { featuredTournament?: Tournament }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Africa&apos;s competitive gaming network</p>
        <h1 id="hero-title">The home of African competition.</h1>
        <p className={styles.heroLead}>
          Find tournaments, prove your results, build your rank, and grow with the people moving gaming forward.
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.primaryButton} href="/register">
            Start competing <ArrowRight aria-hidden="true" size={19} />
          </Link>
          <Link className={styles.secondaryButton} href="#host">Host a tournament</Link>
        </div>
        <div className={styles.heroTrust} aria-label="Platform benefits">
          <span><CheckCircle2 aria-hidden="true" size={18} /> Verified results</span>
          <span><ShieldCheck aria-hidden="true" size={18} /> Credible organizers</span>
        </div>
      </div>

      <article className={styles.featuredTournament}>
        <div className={styles.featuredImage}>
          <Image
            src={
              featuredTournament?.image ??
              '/dashboard-promos/playmechi-launch-mobile-gaming.jpg'
            }
            alt={
              featuredTournament?.imageAlt ??
              'Mobile gamers competing together at a PlayMechi event'
            }
            fill
            sizes="(max-width: 760px) 100vw, 48vw"
            priority
          />
          <div className={styles.imageScrim} />
          <p className={styles.featureLabel}>
            {featuredTournament ? 'Featured tournament' : 'Open tournament network'}
          </p>
          <div className={styles.featuredTitle}>
            <p>{featuredTournament?.game ?? 'Competitive gaming'}</p>
            <h2>{featuredTournament?.title ?? 'Your next community tournament starts here'}</h2>
          </div>
        </div>
        <div className={styles.featuredBody}>
          <div className={styles.policyTags}>
            <span>{featuredTournament?.entryLabel ?? 'Free hosting available'}</span>
            <span>{featuredTournament?.prizeLabel ?? 'Credible results'}</span>
          </div>
          <div className={styles.featureMeta}>
            <span>
              <CalendarDays aria-hidden="true" size={17} />
              {featuredTournament?.schedule ?? 'Publish a free tournament instantly'}
            </span>
            <span>
              <Users aria-hidden="true" size={17} />
              {featuredTournament?.format ?? 'Built for community organizers'}
            </span>
          </div>
          <ArrowLink href={featuredTournament?.href ?? '/playmechi/tournaments'}>
            {featuredTournament ? 'View tournament' : 'Browse tournaments'}
          </ArrowLink>
        </div>
      </article>
    </section>
  );
}

function AudienceSection() {
  return (
    <section className={styles.section} id="roles" aria-labelledby="roles-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Built for the whole ecosystem</p>
          <h2 id="roles-title">Your place in competitive gaming</h2>
        </div>
        <p>One connected platform, with a clear next step for every person helping gaming grow.</p>
      </div>
      <div className={styles.roleGrid}>
        {audienceRoles.map((role) => {
          const Icon = role.icon;
          return (
            <article className={styles.roleCard} key={role.title}>
              <div className={`${styles.roleIcon} ${styles[role.tone]}`}>
                <Icon aria-hidden="true" size={24} />
              </div>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
              <ArrowLink href={role.href}>{role.action}</ArrowLink>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TournamentsSection({ tournaments }: { tournaments: Tournament[] }) {
  return (
    <section className={`${styles.section} ${styles.tournamentSection}`} id="tournaments" aria-labelledby="tournaments-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Discover competition</p>
          <h2 id="tournaments-title">Tournaments worth showing up for</h2>
        </div>
        <Link className={styles.secondaryButton} href="/playmechi/tournaments">Browse all tournaments</Link>
      </div>
      <nav className={styles.filters} aria-label="Tournament filters">
        <Link className={styles.activeFilter} href="/playmechi/tournaments">All tournaments</Link>
        <Link href="/playmechi/tournaments?status=open">Open now</Link>
        <Link href="/playmechi/tournaments?entry=free">Free entry</Link>
        <Link href="/playmechi/tournaments?entry=paid">Paid entry</Link>
        <Link href="/playmechi/tournaments?status=active">Live</Link>
      </nav>
      {tournaments.length === 0 ? (
        <div className={styles.emptyTournaments}>
          <Trophy aria-hidden="true" size={30} />
          <h3>No approved tournaments are open right now.</h3>
          <p>Be the organizer who brings the next community bracket to life.</p>
          <Link className={styles.primaryButton} href="/tournaments/create">
            Host a tournament
          </Link>
        </div>
      ) : (
        <div className={styles.tournamentGrid}>
          {tournaments.map((tournament) => (
          <article className={styles.tournamentCard} key={tournament.slug}>
            <div className={styles.tournamentImage}>
              <Image src={tournament.image} alt={tournament.imageAlt} fill sizes="(max-width: 760px) 100vw, 33vw" />
              <span className={`${styles.status} ${styles[tournament.statusTone]}`}>{tournament.status}</span>
            </div>
            <div className={styles.tournamentBody}>
              <p className={styles.gameName}>{tournament.game}</p>
              <h3>{tournament.title}</h3>
              <p className={styles.organizer}><BadgeCheck aria-hidden="true" size={17} /> {tournament.organizer}</p>
              <div className={styles.tournamentMeta}>
                <span><Clock3 aria-hidden="true" size={17} /> {tournament.schedule}</span>
                <span><Gamepad2 aria-hidden="true" size={17} /> {tournament.format}</span>
              </div>
              <div className={styles.policyTags}>
                <span>{tournament.entryLabel}</span>
                <span>{tournament.prizeLabel}</span>
              </div>
              <ArrowLink href={tournament.href}>View details</ArrowLink>
            </div>
          </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PlayerRecordSection() {
  const steps = [
    { icon: PlayCircle, title: 'Compete', description: 'Join structured matches and tournaments.' },
    { icon: BadgeCheck, title: 'Verify results', description: 'Record outcomes both players can confirm.' },
    { icon: TrendingUp, title: 'Grow your rank', description: 'Build a credible history over time.' },
  ];

  return (
    <section className={`${styles.section} ${styles.recordSection}`} id="record" aria-labelledby="record-title">
      <div className={styles.profileCard}>
        <p className={styles.profileExampleLabel}>Example player record</p>
        <div className={styles.profileTop}>
          <div className={styles.avatar}>AZ</div>
          <div>
            <div className={styles.verifiedName}><h3>AzizTheOne</h3><BadgeCheck aria-label="Verified player" size={20} /></div>
            <p><MapPin aria-hidden="true" size={15} /> Lagos, Nigeria</p>
          </div>
          <span className={styles.level}>Level 12</span>
        </div>
        <div className={styles.profileStats}>
          <div><strong>128</strong><span>Matches</span></div>
          <div><strong>76</strong><span>Wins</span></div>
          <div><strong>59%</strong><span>Win rate</span></div>
        </div>
        <div className={styles.reputation}>
          <span><ShieldCheck aria-hidden="true" size={18} /> Strong reputation</span>
          <span>Results verified</span>
        </div>
      </div>
      <div className={styles.recordCopy}>
        <p className={styles.eyebrow}>Your competitive record</p>
        <h2 id="record-title">Every result should build your name.</h2>
        <p>PlayMechi turns individual matches into a trusted history of participation, performance, and sportsmanship.</p>
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <div className={styles.stepIcon}><Icon aria-hidden="true" size={22} /></div>
                <div><span>0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></div>
              </li>
            );
          })}
        </ol>
        <Link className={styles.primaryButton} href="/register">Build your player profile</Link>
      </div>
    </section>
  );
}

function HostSection() {
  return (
    <section className={styles.hostSection} id="host" aria-labelledby="host-title">
      <div className={styles.hostCopy}>
        <p className={styles.eyebrow}>Host with confidence</p>
        <h2 id="host-title">Start free. Earn trust. Scale responsibly.</h2>
        <p className={styles.hostLead}>Any verified user can instantly publish a tournament only when it has free entry and no cash prize or other valuable reward.</p>
        <ul className={styles.policyList}>
          <li><Check aria-hidden="true" size={19} /> Free entry + no prizes publishes instantly</li>
          <li><LockKeyhole aria-hidden="true" size={19} /> Paid entry or any valuable reward needs Mechi approval</li>
          <li><ShieldCheck aria-hidden="true" size={19} /> No personal payment links</li>
        </ul>
        <Link className={styles.coralButton} href="/tournaments/create">Create a tournament <ArrowRight aria-hidden="true" size={19} /></Link>
      </div>
      <div className={styles.hostPreview} aria-label="Example tournament setup">
        <div className={styles.previewHeader}>
          <div><span>New tournament</span><h3>Set up the essentials</h3></div>
          <span className={styles.stepBadge}>Step 1 of 3</span>
        </div>
        <div className={styles.previewField}><span>Tournament name</span><strong>Friday Community Cup</strong></div>
        <div className={styles.previewRow}>
          <div className={styles.previewField}><span>Entry type</span><strong>Free</strong></div>
          <div className={styles.previewField}><span>Prize</span><strong>No prizes</strong></div>
        </div>
        <div className={styles.instantApproval}>
          <CheckCircle2 aria-hidden="true" size={22} />
          <div><strong>Ready to publish</strong><p>This setup does not need manual approval.</p></div>
        </div>
        <div className={styles.previewButton}>Continue to format <ArrowRight aria-hidden="true" size={18} /></div>
      </div>
    </section>
  );
}

function EcosystemSection() {
  return (
    <section className={styles.section} id="ecosystem" aria-labelledby="ecosystem-title">
      <div className={styles.sectionHeading}>
        <div><p className={styles.eyebrow}>More than a bracket</p><h2 id="ecosystem-title">An ecosystem built around competition</h2></div>
        <p>Give every audience a useful role without making the platform harder for gamers to use.</p>
      </div>
      <div className={styles.ecosystemGrid}>
        {ecosystemCards.map((card) => (
          <article className={styles.ecosystemCard} key={card.title}>
            <div className={styles.ecosystemImage}><Image src={card.image} alt={card.imageAlt} fill sizes="(max-width: 760px) 100vw, 50vw" /></div>
            <div className={styles.ecosystemBody}>
              <p className={styles.cardEyebrow}>{card.eyebrow}</p><h3>{card.title}</h3><p>{card.description}</p>
              <ArrowLink href={card.href}>{card.action}</ArrowLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TrustSection() {
  const trustItems = [
    { icon: BadgeCheck, title: 'Verified results', text: 'Outcomes players can confirm.' },
    { icon: ListChecks, title: 'Clear rules', text: 'Expectations visible before joining.' },
    { icon: Scale, title: 'Fair disputes', text: 'A structured path when issues happen.' },
    { icon: Medal, title: 'Trusted organizers', text: 'Reputation earned through delivery.' },
  ];
  return (
    <section className={`${styles.section} ${styles.trustSection}`} aria-labelledby="trust-title">
      <div className={styles.trustHeading}><p className={styles.eyebrow}>Competition needs trust</p><h2 id="trust-title">Built so every win means more.</h2></div>
      <div className={styles.trustGrid}>
        {trustItems.map((item) => {
          const Icon = item.icon;
          return <article key={item.title}><Icon aria-hidden="true" size={25} /><h3>{item.title}</h3><p>{item.text}</p></article>;
        })}
      </div>
      <div className={styles.finalCta}>
        <div><h2>Ready to make your next match count?</h2><p>Join players and organizers building a stronger competitive gaming culture.</p></div>
        <div>
          <Link className={styles.coralButton} href="/register">Join PlayMechi</Link>
          <Link className={styles.darkSecondaryButton} href="/playmechi/tournaments">Explore tournaments</Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}><Brand /><p>The home of African competition.</p><span>Play. Prove it. Build your name.</span></div>
        <div className={styles.desktopFooterLinks}>
          {footerGroups.map((group) => (
            <div key={group.title}><h3>{group.title}</h3>{group.links.map((link) => <Link href={link.href} key={link.label}>{link.label}</Link>)}</div>
          ))}
        </div>
        <div className={styles.mobileFooterLinks}>
          {footerGroups.map((group) => (
            <details key={group.title}><summary>{group.title}<ChevronDown aria-hidden="true" size={19} /></summary><div>{group.links.map((link) => <Link href={link.href} key={link.label}>{link.label}</Link>)}</div></details>
          ))}
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>© 2026 Mechi. All rights reserved.</span>
        <nav aria-label="Legal links"><Link href="/terms-of-service">Terms</Link><Link href="/privacy-policy">Privacy</Link><Link href="/terms-of-service">Community rules</Link></nav>
      </div>
    </footer>
  );
}

export function PlayMechiHome({
  publicTournaments = [],
}: {
  publicTournaments?: PublicTournament[];
}) {
  const tournaments = publicTournaments.slice(0, 3).map(mapHomeTournament);
  return (
    <div className={styles.page}>
      <Link className={styles.skipLink} href="#main-content">Skip to main content</Link>
      <div className={styles.announcement}>
        <p><strong>Free entry + no prizes?</strong> Publish your tournament instantly.</p>
        <Link href="#host">See hosting rules <ArrowRight aria-hidden="true" size={16} /></Link>
      </div>
      <Header />
      <main id="main-content">
        <Hero featuredTournament={tournaments[0]} />
        <AudienceSection />
        <TournamentsSection tournaments={tournaments} />
        <PlayerRecordSection />
        <HostSection />
        <EcosystemSection />
        <TrustSection />
      </main>
      <Footer />
    </div>
  );
}
