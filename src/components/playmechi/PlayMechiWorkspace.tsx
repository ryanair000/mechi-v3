'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  CreditCard,
  Gamepad2,
  Menu,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  PLAYMECHI_SCREEN_GROUPS,
  PLAYMECHI_SCREEN_MAP,
  PLAYMECHI_SCREENS,
  type WorkspaceRole,
  type WorkspaceScreenDefinition,
  type WorkspaceSection,
} from './screen-definitions';
import styles from './PlayMechiWorkspace.module.css';

const icons = {
  Discover: Compass,
  Tournaments: Trophy,
  Matches: Gamepad2,
  Rankings: BarChart3,
  Profile: Users,
  Overview: Sparkles,
  Participants: Users,
  Reports: BarChart3,
  Organization: Building2,
  Marketplace: Compass,
  Campaigns: Trophy,
  Messages: MessageSquareText,
  Finance: CreditCard,
};

const navigation: Record<WorkspaceRole, Array<[string, string]>> = {
  gamer: [
    ['Discover', 'tournament-directory'],
    ['Tournaments', 'tournament-detail'],
    ['Matches', 'match-room'],
    ['Rankings', 'rankings'],
    ['Profile', 'gamer-profile'],
  ],
  organizer: [
    ['Overview', 'control-center'],
    ['Tournaments', 'host-tournament'],
    ['Participants', 'participants-checkin'],
    ['Reports', 'analytics-reporting'],
    ['Organization', 'organization-workspace'],
  ],
  partner: [
    ['Overview', 'sponsorship-marketplace'],
    ['Marketplace', 'sponsorship-marketplace'],
    ['Campaigns', 'active-sponsorship'],
    ['Reports', 'sponsor-report'],
    ['Messages', 'inbox'],
  ],
};

function screenHref(slug: string) {
  return `/playmechi/ui/${slug}`;
}

function actionHref(action?: string, screen?: WorkspaceScreenDefinition) {
  const normalized = action?.toLowerCase() ?? '';
  if (normalized.includes('host')) return screenHref('host-tournament');
  if (normalized.includes('join') || normalized.includes('registration')) return screenHref('registration-payment');
  if (normalized.includes('match')) return screenHref('match-room');
  if (normalized.includes('dispute')) return screenHref('dispute-resolution');
  if (normalized.includes('payment') || normalized.includes('transaction') || normalized.includes('payout')) return screenHref('finance-payouts');
  if (normalized.includes('organizer')) return screenHref('organizer-profile');
  if (normalized.includes('rank')) return screenHref('rankings');
  if (normalized.includes('support') || normalized.includes('report an issue')) return screenHref('support');
  if (screen?.slug === 'tournament-directory') return screenHref('tournament-detail');
  return screen ? screenHref(screen.slug) : '/playmechi/ui';
}

export function PlayMechiWorkspace({ screen }: { screen: WorkspaceScreenDefinition }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(screen.tabs?.[0] ?? 'Overview');
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return screen.sections;
    return screen.sections.map((section) => ({
      ...section,
      rows: section.rows?.filter((row) => row.join(' ').toLowerCase().includes(normalized)),
    }));
  }, [query, screen.sections]);

  return (
    <div className={styles.app} data-playmechi-ui="true">
      <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brandRow}>
          <Link href="/" className={styles.brand} aria-label="PlayMechi home">
            <span className={styles.brandMark}>M</span>
            <span>PlayMechi</span>
          </Link>
          <button className={styles.mobileClose} onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>

        <div className={styles.workspaceCard}>
          <strong>{screen.role === 'organizer' ? 'Mechi Arena' : screen.role === 'partner' ? 'Partner workspace' : 'Personal profile'}</strong>
          <span>{screen.role === 'organizer' ? 'Organizer workspace' : screen.role === 'partner' ? 'Growth workspace' : 'Gamer workspace'}</span>
        </div>

        <nav className={styles.nav} aria-label="Workspace navigation">
          {navigation[screen.role].map(([label, slug]) => {
            const Icon = icons[label as keyof typeof icons] ?? Compass;
            const active = screen.slug === slug || (label === 'Tournaments' && screen.slug.includes('tournament'));
            return (
              <Link key={`${label}-${slug}`} href={screenHref(slug)} className={active ? styles.navActive : ''} onClick={() => setMobileNavOpen(false)}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <Link className={styles.sidebarCta} href={screen.role === 'organizer' ? screenHref('host-tournament') : screenHref('tournament-directory')}>
            {screen.role === 'organizer' ? 'Host tournament' : 'Find tournament'}
          </Link>
          <div className={styles.userRow}>
            <span className={styles.avatar}>A</span>
            <span><strong>Alex M.</strong><small>{screen.role === 'partner' ? 'Partner' : screen.role[0].toUpperCase() + screen.role.slice(1)}</small></span>
          </div>
        </div>
      </aside>

      {mobileNavOpen ? <button className={styles.scrim} aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarTitle}>
            <button className={styles.menuButton} onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div>
              <span>{screen.role === 'organizer' ? 'Organizer' : screen.role === 'partner' ? 'Partner' : 'PlayMechi'} / {screen.title}</span>
              <strong>{screen.pageLabel}</strong>
            </div>
          </div>
          <div className={styles.topActions}>
            <Link href="/playmechi/ui" className={styles.utilityLink}>All screens</Link>
            <Link href={screenHref('rankings')} className={styles.utilityLink}>Rankings</Link>
            <Link href={screenHref('notifications')} className={styles.iconButton} aria-label="Notifications"><Bell size={17} /><i /></Link>
            <Link href={screenHref('settings')} className={styles.avatarButton} aria-label="Account settings">A</Link>
          </div>
        </header>

        <main className={styles.main}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <div className={styles.heroMeta}>
                {screen.slug === 'tournament-directory' ? <span>PLAYMECHI TOURNAMENTS</span> : null}
                {screen.status ? <StatusPill label={screen.status} tone={screen.statusTone} /> : null}
              </div>
              <h1>{screen.title}</h1>
              <p>{screen.description}</p>
            </div>
            <div className={styles.heroActions}>
              {screen.secondaryAction ? <Link className={styles.secondaryButton} href={actionHref(screen.secondaryAction, screen)}>{screen.secondaryAction}</Link> : null}
              {screen.primaryAction ? <Link className={styles.primaryButton} href={actionHref(screen.primaryAction, screen)}>{screen.primaryAction}</Link> : null}
            </div>
          </section>

          {screen.slug === 'tournament-directory' ? <DirectoryFilters query={query} setQuery={setQuery} /> : null}

          {screen.tabs?.length ? (
            <div className={styles.tabs} role="tablist" aria-label={`${screen.title} sections`}>
              {screen.tabs.map((tab) => (
                <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? styles.tabActive : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>
          ) : null}

          {screen.alert ? <Alert title={screen.alert[0]} text={screen.alert[1]} tone={screen.alert[2]} /> : null}

          {screen.metrics?.length ? (
            <section className={styles.metrics} aria-label="Summary metrics">
              {screen.metrics.map(([label, value, hint]) => (
                <article key={`${label}-${value}`}><span>{label}</span><strong>{value}</strong>{hint ? <small>{hint}</small> : null}</article>
              ))}
            </section>
          ) : null}

          <div className={`${styles.contentGrid} ${!screen.rail?.length ? styles.contentSingle : ''}`}>
            <div className={styles.primaryColumn}>
              {sections.map((section, index) => (
                <ContentSection key={`${section.title}-${index}`} section={section} screen={screen} directory={screen.slug === 'tournament-directory'} />
              ))}
            </div>
            {screen.rail?.length ? (
              <aside className={styles.rail}>
                {screen.rail.map((section, index) => <ContentSection key={`${section.title}-${index}`} section={section} screen={screen} compact />)}
              </aside>
            ) : null}
          </div>

          <footer className={styles.screenFooter}>
            <span>Figma screen {screen.figmaNode}</span>
            <Link href="/playmechi/ui">Browse all 38 approved screen families <ChevronRight size={14} /></Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

function DirectoryFilters({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  const [active, setActive] = useState('All');
  return (
    <section className={styles.directoryTools}>
      <div className={styles.filters}>
        <label className={styles.searchField}><span>Search</span><div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games, organizers, tournaments" /></div></label>
        {['Game · All games','Entry · Any entry','Format · Solo or team'].map((label) => <button key={label} type="button" className={styles.selectButton}>{label}</button>)}
        <button type="button" className={styles.secondaryButton}>More filters</button>
      </div>
      <div className={styles.quickFilters}>{['All','Open','Free entry','Team','Live now'].map((item) => <button type="button" key={item} className={active === item ? styles.quickActive : ''} onClick={() => setActive(item)}>{item}</button>)}</div>
    </section>
  );
}

function Alert({ title, text, tone }: { title: string; text: string; tone: 'teal' | 'warning' | 'coral' }) {
  const Icon = tone === 'teal' ? ShieldCheck : tone === 'warning' ? CircleHelp : Bell;
  return <section className={`${styles.alert} ${styles[`alert_${tone}`]}`}><Icon size={20} /><div><strong>{title}</strong><p>{text}</p></div><Link href={screenHref('system-states')}>How it works</Link></section>;
}

function StatusPill({ label, tone = 'teal' }: { label: string; tone?: WorkspaceScreenDefinition['statusTone'] }) {
  return <span className={`${styles.pill} ${styles[`pill_${tone}`]}`}><i />{label}</span>;
}

function ContentSection({ section, screen, compact = false, directory = false }: { section: WorkspaceSection; screen: WorkspaceScreenDefinition; compact?: boolean; directory?: boolean }) {
  if (directory) return <TournamentCards section={section} />;
  return (
    <section className={`${styles.card} ${compact ? styles.compactCard : ''} ${section.tone ? styles[`card_${section.tone}`] : ''}`}>
      <div className={styles.cardHeader}>
        <div>{section.eyebrow ? <span>{section.eyebrow}</span> : null}<h2>{section.title}</h2>{section.description ? <p>{section.description}</p> : null}</div>
      </div>
      {section.rows?.length ? <DataRows rows={section.rows} compact={compact} /> : null}
      {section.bullets?.length ? <ul className={styles.bullets}>{section.bullets.map((bullet) => <li key={bullet}><Check size={15} />{bullet}</li>)}</ul> : null}
      {section.action ? <Link className={section.tone === 'teal' ? styles.primaryButton : styles.secondaryButton} href={actionHref(section.action, screen)}>{section.action}</Link> : null}
    </section>
  );
}

function DataRows({ rows, compact }: { rows: string[][]; compact?: boolean }) {
  return <div className={`${styles.dataRows} ${compact ? styles.dataRowsCompact : ''}`}>{rows.map((row, index) => <div className={styles.dataRow} key={`${row.join('-')}-${index}`}>{row.map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`} className={cellIndex === 0 ? styles.rowLead : ''}>{cell}{/(paid|verified|ready|checked|open|active|complete)$/i.test(cell) ? <i className={styles.inlineStatus} /> : null}</span>)}</div>)}</div>;
}

function TournamentCards({ section }: { section: WorkspaceSection }) {
  return (
    <section className={styles.directorySection}>
      <div className={styles.directoryHeading}><div><h2>{section.title}</h2><p>{section.description}</p></div><span>Recommended first</span></div>
      <div className={styles.tournamentGrid}>
        {section.rows?.map((row, index) => {
          const live = row[3]?.toLowerCase() === 'live';
          return <article className={styles.tournamentCard} key={row[0]}>
            <div className={`${styles.gameBanner} ${live ? styles.gameBannerLive : ''}`}><strong>{row[1]}</strong><span>PLAYMECHI TOURNAMENT</span></div>
            <div className={styles.tournamentBody}>
              <StatusPill label={row[3]} tone={live ? 'coral' : 'teal'} />
              <h3>{row[0]}</h3>
              <p>{index % 2 ? 'Nairobi Esports Hub · Verified' : 'Mechi Arena · Verified'}</p>
              <small>{index % 2 ? 'Today, 19:00 · 12/24 teams · Squad' : 'Sun, 20:00 · 32/64 players · Solo'}</small>
              <em>{row[2]}</em>
              <Link className={live ? styles.primaryButton : styles.secondaryButton} href={row[4] || (live ? screenHref('match-room') : screenHref('tournament-detail'))}>{live ? 'Watch live' : 'View tournament'}</Link>
            </div>
          </article>;
        })}
      </div>
    </section>
  );
}

export function PlayMechiUiIndex() {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const available = PLAYMECHI_SCREENS.filter((screen) => `${screen.title} ${screen.pageLabel} ${screen.slug}`.toLowerCase().includes(normalized));
  return (
    <div className={styles.indexPage} data-playmechi-ui="true">
      <header className={styles.indexHeader}>
        <Link href="/" className={styles.brand}><span className={styles.brandMark}>M</span><span>PlayMechi</span></Link>
        <Link href="/" className={styles.secondaryButton}>Approved homepage</Link>
      </header>
      <main className={styles.indexMain}>
        <div className={styles.indexHero}><span>APPROVED PRODUCT UI</span><h1>All PlayMechi screens</h1><p>38 responsive screen families wired into one consistent, user-friendly tournament platform.</p></div>
        <label className={styles.indexSearch}><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search screens" /></label>
        {PLAYMECHI_SCREEN_GROUPS.map((group) => {
          const screens = group.slugs.map((slug) => PLAYMECHI_SCREEN_MAP.get(slug)).filter((screen): screen is WorkspaceScreenDefinition => Boolean(screen && available.includes(screen)));
          if (!screens.length) return null;
          return <section className={styles.indexGroup} key={group.title}><div className={styles.indexGroupTitle}><h2>{group.title}</h2><span>{screens.length} screens</span></div><div className={styles.indexGrid}>{screens.map((screen) => <Link href={screenHref(screen.slug)} className={styles.indexCard} key={screen.slug}><span>Figma {screen.figmaNode}</span><h3>{screen.title}</h3><p>{screen.pageLabel}</p><div><em>{screen.role}</em><ChevronRight size={16} /></div></Link>)}</div></section>;
        })}
      </main>
    </div>
  );
}
