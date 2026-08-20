import type { ComponentType, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Gamepad2,
  GraduationCap,
  MapPin,
  Scale,
  ShieldCheck,
  Trophy,
  Users,
  Video,
} from 'lucide-react';
import { V5TournamentDirectory } from '@/components/v5/V5TournamentDirectory';
import { V5Logo } from '@/components/v5/V5Logo';
import { V5PublicHeader } from '@/components/v5/V5PublicHeader';
import { listPublicTournaments, type PublicTournament } from '@/lib/public-tournament-data';
import {
  getV5Screen,
  type V5Row,
  type V5ScreenDefinition,
  type V5Tone,
} from './v5-screen-catalog';
import styles from './V5Public.module.css';

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>;

const audiences: Array<{ title: string; copy: string; href: string; icon: Icon }> = [
  { title: 'Play', copy: 'Find tournaments and compete.', href: '/app/player', icon: Gamepad2 },
  { title: 'Host', copy: 'Create and manage tournaments.', href: '/app/organizer', icon: Trophy },
  { title: 'Stream', copy: 'Broadcast matches and grow.', href: '/app/creator', icon: Video },
  { title: 'Coach', copy: 'Share knowledge and build players.', href: '/app/coach', icon: GraduationCap },
  { title: 'Sponsor', copy: 'Support events and communities.', href: '/app/sponsor', icon: Users },
  { title: 'Run local events', copy: 'Organize trusted shop tournaments.', href: '/app/shop', icon: MapPin },
];

const roles = [
  { title: 'Creators', copy: 'Grow your audience and bring more eyes to the game.', image: '/dashboard-promos/playmechi-upcoming-stream.jpg', href: '/app/creator' },
  { title: 'Coaches', copy: 'Develop talent and build the next generation.', image: '/game-artwork/efootball-header-photo.png', href: '/app/coach' },
  { title: 'Companies', copy: 'Connect with communities through competition.', image: '/dashboard-promos/playmechi-socials-community.jpg', href: '/app/sponsor' },
  { title: 'Gaming shops', copy: 'Engage players and power your local scene.', image: '/dashboard-promos/playmechi-launch-mobile-gaming.jpg', href: '/app/shop' },
] as const;

const fallbackTournaments: PublicTournament[] = [];

export function V5Shell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <V5PublicHeader />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <V5Footer />
    </div>
  );
}

function V5Footer() {
  const columns = [
    { title: 'Play', links: [['Find tournaments', '/tournaments'], ['How it works', '/how-mechi-works'], ['Rankings', '/leaderboard'], ['Player guide', '/support']] },
    { title: 'Tournaments', links: [['All tournaments', '/tournaments'], ['Host a tournament', '/app/organizer/tournaments/new'], ['Tournament rules', '/support'], ['Organizer workspace', '/app/organizer']] },
    { title: 'Community', links: [['Teams', '/app/team'], ['Creators', '/app/creator'], ['Coaches', '/app/coach'], ['Gaming shops', '/app/shop']] },
    { title: 'Support', links: [['Help center', '/support'], ['Safety', '/support'], ['Terms of service', '/terms-of-service'], ['Privacy policy', '/privacy-policy']] },
  ];
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <V5Logo />
            <p>Africa&apos;s competitive gaming network. Play, host, stream, coach, sponsor, and grow through credible competition.</p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              <div className={styles.footerLinks}>
                {column.links.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.copyright}>© 2026 PlayMechi. Competition built for African gaming communities.</div>
      </div>
    </footer>
  );
}

async function safeTournaments(limit = 6, country?: string) {
  try {
    return await listPublicTournaments({ status: 'all', limit, country });
  } catch {
    return fallbackTournaments;
  }
}

function tournamentMeta(tournament: PublicTournament) {
  const entry = tournament.entry_fee > 0 ? `KES ${tournament.entry_fee.toLocaleString()}` : 'Free entry';
  return `${tournament.game_label} · ${entry} · ${tournament.player_count}/${tournament.size} players`;
}

function TournamentCard({ tournament, index }: { tournament?: PublicTournament; index: number }) {
  const artClasses = [styles.tournamentArtOne, styles.tournamentArtTwo, styles.tournamentArtThree];
  const title = tournament?.title ?? ['Mechi Valor Showdown', 'Mechi FC League', 'Mechi Legends Clash'][index];
  const meta = tournament ? tournamentMeta(tournament) : ['COD Mobile · Free entry · 64/128 players', 'EA SPORTS FC · 96/192 players', 'PUBG Mobile · 77/150 players'][index];
  const href = tournament ? `/tournaments/${encodeURIComponent(tournament.slug)}` : '/tournaments';
  const badge = tournament?.status === 'active' ? 'LIVE' : tournament?.status === 'open' ? 'OPEN' : index === 2 ? 'UPCOMING' : 'LIVE';
  return (
    <article className={styles.tournamentCard}>
      <div className={`${styles.tournamentArt} ${artClasses[index % artClasses.length]}`}>
        <span className={styles.artBadge}>{badge}</span>
      </div>
      <div className={styles.tournamentBody}>
        <h3>{title}</h3>
        <p className={styles.tournamentMeta}>{meta}</p>
        <p className={styles.verified}><BadgeCheck size={15} /> Verified host</p>
        <Link className={`${styles.buttonOutline} ${styles.wide}`} href={href}>View tournament</Link>
      </div>
    </article>
  );
}

export async function V5HomePage({ country }: { country?: string } = {}) {
  const tournaments = await safeTournaments(3, country);
  return (
    <V5Shell>
      <section className={`${styles.container} ${styles.hero}`}>
        <div>
          <p className={styles.eyebrow}>Africa&apos;s competitive gaming network</p>
          <h1>The home of African competition.</h1>
          <p className={styles.heroCopy}>Play, host, stream, coach, or support the communities shaping African gaming.</p>
          <div className={styles.heroActions}>
            <Link className={styles.button} href="/app/player">Start competing <ArrowRight size={16} /></Link>
            <Link className={styles.buttonOutline} href="/app/organizer/tournaments/new">Host a tournament</Link>
          </div>
        </div>
        <article className={styles.heroCard}>
          <div className={styles.heroArt}>
            <Image
              src="/game-artwork/efootball-header-photo.png"
              alt="Competitive eFootball match"
              fill
              priority
              sizes="(max-width: 760px) calc(100vw - 32px), 42vw"
            />
          </div>
          <div className={styles.heroCardBody}>
            <div className={styles.live}>Live registration</div>
            <h2>{tournaments[0]?.title ?? 'PlayMechi Community Cup'}</h2>
            <div className={styles.chips}>
              <span className={styles.chip}>{tournaments[0]?.entry_fee ? `KES ${tournaments[0].entry_fee}` : 'Free entry'}</span>
              {!tournaments[0]?.prize_pool && <span className={`${styles.chip} ${styles.chipCoral}`}>No prizes</span>}
            </div>
            <div className={styles.metaLine}>
              <span>{tournaments[0]?.scheduled_for ? new Date(tournaments[0].scheduled_for).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Next community competition'}</span>
              <span>{tournaments[0] ? `${tournaments[0].player_count} / ${tournaments[0].size} players` : 'Open to verified players'}</span>
            </div>
            <div className={styles.progress}><span /></div>
            <Link className={`${styles.buttonOutline} ${styles.wide}`} href={tournaments[0] ? `/tournaments/${encodeURIComponent(tournaments[0].slug)}` : '/tournaments'}>View tournament</Link>
          </div>
        </article>
      </section>

      <section className={`${styles.container} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>How do you want to join?</h2>
        <div className={styles.audienceGrid}>
          {audiences.map(({ title, copy, href, icon: AudienceIcon }) => (
            <Link className={styles.audienceCard} href={href} key={title}>
              <span className={styles.audienceIcon}><AudienceIcon size={24} /></span>
              <div><h3>{title}</h3><p>{copy}</p></div>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.sectionSoft}>
        <div className={styles.container}>
          <div className={styles.sectionIntro}>
            <h2 className={styles.sectionTitle}>Competitions happening now</h2>
            <Link className={styles.textLink} href="/tournaments">View all tournaments →</Link>
          </div>
          <div className={styles.tournamentGrid}>
            {[0, 1, 2].map((index) => <TournamentCard key={tournaments[index]?.slug ?? index} tournament={tournaments[index]} index={index} />)}
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.section}`}>
        <div className={styles.recordGrid}>
          <div>
            <h2 className={styles.sectionTitle}>Build a gaming record that follows you</h2>
            <div className={styles.profileCard}>
              <div className={styles.profileTop}><span className={styles.avatar}>A1</span><div><h3>AzizTheOne <BadgeCheck size={15} /></h3><p>Lagos, Nigeria · Level 12</p></div></div>
              <div className={styles.stats}><span><strong>128</strong><span>Matches</span></span><span><strong>76</strong><span>Wins</span></span><span><strong>59%</strong><span>Win rate</span></span></div>
            </div>
          </div>
          <div className={styles.steps}>
            {[{ icon: Trophy, title: 'Compete', copy: 'Join tournaments and play your best.' }, { icon: ShieldCheck, title: 'Verify results', copy: 'Results are confirmed by hosts and community.' }, { icon: BadgeCheck, title: 'Grow your rank', copy: 'Build reputation and unlock opportunities.' }].map(({ icon: StepIcon, title, copy }) => (
              <div className={styles.step} key={title}><span className={styles.stepIcon}><StepIcon size={34} /></span><h3>{title}</h3><p>{copy}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.section}`}>
        <div className={styles.hostPanel}>
          <div>
            <h2>Host tournaments people trust</h2>
            <p>Create fair, fun, and credible tournaments in just a few minutes.</p>
            <div className={styles.policyList}>
              <div className={styles.policyItem}><span className={styles.policyDot}><Check size={15} /></span>Free + no prize: publish instantly</div>
              <div className={styles.policyItem}><span className={`${styles.policyDot} ${styles.policyDotCoral}`}><ShieldCheck size={15} /></span>Paid or rewarded: approval required</div>
            </div>
            <Link className={styles.button} href="/app/organizer/tournaments/new">Host a free tournament</Link>
          </div>
          <div className={styles.formPreview} aria-label="Tournament creation preview">
            <div className={styles.formSteps}><span>1 Details</span><span>2 Rules</span><span>3 Confirm</span></div>
            <div className={styles.formFields}>
              <div className={styles.fakeField}>Tournament name</div><div className={styles.fakeField}>Entry type: Free</div>
              <div className={styles.fakeField}>Select a game</div><div className={styles.fakeField}>Prizes: No prizes</div>
              <div className={styles.confirmation}><Check size={17} /> You can publish instantly. No prizes selected.</div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Build around competition</h2>
        <div className={styles.roleGrid}>
          {roles.map(({ title, copy, image, href }) => (
            <article className={styles.roleCard} key={title}>
              <div className={styles.roleImage}>
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1100px) 50vw, 275px"
                />
              </div>
              <div className={styles.roleBody}><h3>{title}</h3><p>{copy}</p><Link className={styles.textLink} href={href}>Learn more →</Link></div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.container} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Fair competition, built in</h2>
        <div className={styles.trustBar}>
          {[{ icon: BadgeCheck, title: 'Verified results', copy: 'Results confirmed by hosts and community.' }, { icon: ShieldCheck, title: 'Clear rules', copy: 'Simple rules everyone can understand.' }, { icon: Scale, title: 'Fair disputes', copy: 'Transparent review and community input.' }, { icon: Users, title: 'Trusted organizers', copy: 'Verified hosts who care about fair play.' }].map(({ icon: TrustIcon, title, copy }) => (
            <div className={styles.trustItem} key={title}><TrustIcon size={30} /><span><strong>{title}</strong><span>{copy}</span></span></div>
          ))}
        </div>
      </section>
    </V5Shell>
  );
}

function toneClass(tone?: V5Tone) {
  if (tone === 'warning') return styles.statusWarning;
  if (tone === 'danger') return styles.statusDanger;
  if (tone === 'neutral') return styles.statusNeutral;
  return '';
}

function ScreenRow({ row }: { row: V5Row }) {
  const content = <><span><h3>{row.title}</h3><p>{row.meta}</p></span><span className={`${styles.status} ${toneClass(row.tone)}`}>{row.status}</span></>;
  return row.href ? <Link className={styles.row} href={row.href}>{content}</Link> : <div className={styles.row}>{content}</div>;
}

export function V5ScreenPage({ definition, rows }: { definition: V5ScreenDefinition; rows?: V5Row[] }) {
  const finalRows = rows ?? definition.rows;
  return (
    <V5Shell>
      <section className={styles.screenHero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>{definition.eyebrow}</p>
          <div className={styles.screenHeroFooter}>
            <div><h1>{definition.title}</h1><p className={styles.screenDescription}>{definition.description}</p></div>
            <Link className={styles.button} href={definition.primaryHref}>{definition.primaryLabel} <ArrowRight size={16} /></Link>
          </div>
          <div className={styles.metrics}>
            {definition.metrics.map((metric) => <div className={styles.metric} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.help}</small></div>)}
          </div>
        </div>
      </section>
      <section className={`${styles.container} ${styles.workspace}`}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}><h2>{definition.mainTitle}</h2><span className={styles.status}>Updated</span></div>
          {finalRows.length ? finalRows.map((row) => <ScreenRow key={`${row.title}-${row.status}`} row={row} />) : <div className={styles.stateCard}><strong>Nothing here yet</strong>New activity will appear here when it becomes available.</div>}
        </div>
        <aside>
          <div className={styles.panel}>
            <div className={styles.panelHeader}><h2>{definition.sideTitle}</h2></div>
            <div className={styles.sideList}>{definition.sideItems.map((item) => <div className={styles.sideItem} key={item}><ChevronRight size={15} />{item}</div>)}</div>
          </div>
          <div className={styles.stateCard}><strong>Designed for every state</strong>Loading, empty, permission-limited, pending approval, error, and success states use the same clear hierarchy.</div>
        </aside>
      </section>
    </V5Shell>
  );
}

export function V5CatalogPage({ slug }: { slug: string }) {
  const definition = getV5Screen(slug);
  return definition ? <V5ScreenPage definition={definition} /> : null;
}

function page(slug: string) {
  const definition = getV5Screen(slug);
  if (!definition) throw new Error(`Missing V5 screen: ${slug}`);
  return definition;
}

export function V5GamesPage() { return <V5ScreenPage definition={page('games')} />; }
export function V5HowItWorksPage() { return <V5ScreenPage definition={{ ...page('index'), eyebrow: 'How PlayMechi works', title: 'From discovery to a trusted competitive record.', primaryLabel: 'Start competing', primaryHref: '/register' }} />; }

export async function V5TournamentsPage() {
  const tournaments = await safeTournaments(12);
  return <V5Shell><V5TournamentDirectory tournaments={tournaments} /></V5Shell>;
}

export function V5LeaderboardPage() { return <V5ScreenPage definition={{ ...page('explore'), eyebrow: 'Rankings', title: 'Performance earns reputation.', mainTitle: 'Top competitors' }} />; }
export function V5PricingPage() { return <V5ScreenPage definition={{ ...page('workspaces'), eyebrow: 'Plans', title: 'Start free. Pay when competition needs more.', mainTitle: 'Simple plans by role' }} />; }
export function V5BlogPage() { return <V5ScreenPage definition={{ ...page('explore'), eyebrow: 'Stories', title: 'African gaming, told through competition.', mainTitle: 'Latest from PlayMechi' }} />; }
export function V5SupportPage() { return <V5ScreenPage definition={{ ...page('search'), eyebrow: 'Help center', title: 'Get back to playing quickly.', primaryLabel: 'Contact support', primaryHref: '/support', mainTitle: 'Popular help topics' }} />; }
