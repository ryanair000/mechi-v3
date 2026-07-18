'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clapperboard,
  FileText,
  Home,
  Inbox,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Moon,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Swords,
  Trophy,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import {
  getWorkspaceHref,
  V5_WORKSPACES,
  V5_WORKSPACE_ORDER,
  type V5NavIcon,
  type V5WorkspaceKind,
} from '@/components/v5/app/v5-workspaces';
import styles from './V5AppShell.module.css';

const NAV_ICONS: Record<V5NavIcon, typeof Home> = {
  home: Home,
  trophy: Trophy,
  swords: Swords,
  users: UsersRound,
  chart: BarChart3,
  wallet: WalletCards,
  inbox: Inbox,
  profile: UserRound,
  video: Clapperboard,
  radio: Radio,
  content: FileText,
  briefcase: BriefcaseBusiness,
  building: Building2,
  megaphone: Megaphone,
  coins: CircleDollarSign,
  settings: Settings,
  shield: ShieldCheck,
  venue: MapPin,
  book: BookOpen,
  search: Search,
  check: CheckCircle2,
};

interface V5AppShellProps {
  workspace: V5WorkspaceKind;
  section: string;
  children: React.ReactNode;
}

interface WorkspaceSummary {
  id: string;
  type: V5WorkspaceKind;
  name: string;
  status: string;
  persisted?: boolean;
}

export function V5AppShell({ workspace, section, children }: V5AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const authFetch = useAuthFetch();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceSummary[]>([]);
  const definition = V5_WORKSPACES[workspace];

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname || '/app/player');
      router.replace(`/login?next=${next}`);
    }
  }, [loading, pathname, router, user]);

  useEffect(() => {
    let active = true;
    async function loadWorkspaces() {
      try {
        const response = await authFetch('/api/v5/workspaces');
        const payload = response.ok ? await response.json() as { workspaces?: WorkspaceSummary[] } : null;
        if (active) setAvailableWorkspaces(Array.isArray(payload?.workspaces) ? payload.workspaces : []);
      } catch {
        if (active) setAvailableWorkspaces([]);
      }
    }
    if (user) void loadWorkspaces();
    return () => { active = false; };
  }, [authFetch, user]);

  const initials = useMemo(() => {
    const source = user?.username || user?.email || 'Mechi player';
    return source
      .split(/\s|@|_/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [user]);

  if (loading || !user) {
    return <V5AppLoading />;
  }

  const nav = (
    <>
      <div className={styles.brandRow}>
        <Link className={styles.brand} href="/app/player" aria-label="PlayMechi dashboard">
          <Image src="/mechi-logo-shield.png" alt="" width={35} height={35} priority />
          <span>PLAY<span>MECHI</span></span>
        </Link>
        <button
          className={styles.mobileClose}
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      <div className={styles.switcherWrap}>
        <button
          className={styles.workspaceButton}
          type="button"
          onClick={() => setSwitcherOpen((open) => !open)}
          aria-expanded={switcherOpen}
        >
          <span className={`${styles.workspaceMark} ${styles[definition.accent]}`}>
            {definition.shortLabel.slice(0, 1)}
          </span>
          <span className={styles.workspaceCopy}>
            <strong>{definition.shortLabel}</strong>
            <small>Active workspace</small>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {switcherOpen ? (
          <div className={styles.switcherMenu} role="menu" aria-label="Switch workspace">
            <div className={styles.switcherTitle}>Work as</div>
            {V5_WORKSPACE_ORDER.map((kind) => {
              const item = V5_WORKSPACES[kind];
              const active = kind === workspace;
              const savedWorkspace = availableWorkspaces.find((candidate) => candidate.type === kind);
              return (
                <Link
                  key={kind}
                  href={getWorkspaceHref(kind)}
                  className={active ? styles.switcherItemActive : styles.switcherItem}
                  role="menuitem"
                  onClick={() => setSwitcherOpen(false)}
                >
                  <span className={`${styles.workspaceMarkSmall} ${styles[item.accent]}`}>
                    {item.shortLabel.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{item.shortLabel}</strong>
                    <small>{savedWorkspace ? `${savedWorkspace.name} · ${savedWorkspace.persisted === false ? 'available' : savedWorkspace.status}` : kind === 'team' ? 'Create or join a team' : 'Set up this workspace'}</small>
                  </span>
                  {active ? <CheckCircle2 size={17} /> : null}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <nav className={styles.sideNav} aria-label={`${definition.shortLabel} navigation`}>
        {definition.nav.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = item.section === section;
          return (
            <Link
              key={item.section || 'overview'}
              href={getWorkspaceHref(workspace, item.section)}
              className={active ? styles.navItemActive : styles.navItem}
              aria-current={active ? 'page' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={19} strokeWidth={2} />
              <span>{item.label}</span>
              {item.badge ? <em>{item.badge}</em> : null}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/support" className={styles.supportLink}>
          <ShieldCheck size={18} />
          <span>Help & safety</span>
        </Link>
        <p>V5 · Competition you can trust</p>
      </div>
    </>
  );

  return (
    <div className={styles.app} data-workspace={workspace}>
      <aside className={styles.sidebar}>{nav}</aside>
      {mobileOpen ? (
        <div className={styles.mobileLayer}>
          <button
            type="button"
            className={styles.backdrop}
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className={styles.mobileSidebar}>{nav}</aside>
        </div>
      ) : null}

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <button
            className={styles.menuButton}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <button className={styles.searchButton} type="button" aria-label="Search PlayMechi">
            <Search size={18} />
            <span>Search tournaments, players and teams</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className={styles.topActions}>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label={`Use ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {resolvedTheme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link className={styles.iconButton} href="/app/player/inbox" aria-label="Notifications">
              <Bell size={19} />
              <span className={styles.unreadDot} />
            </Link>
            <div className={styles.profileWrap}>
              <button
                className={styles.profileButton}
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
              >
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt="" width={34} height={34} />
                ) : (
                  <span>{initials || 'M'}</span>
                )}
                <span className={styles.profileCopy}>
                  <strong>{user.username}</strong>
                  <small>{definition.shortLabel}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {profileOpen ? (
                <div className={styles.profileMenu}>
                  <Link href="/app/player/profile"><UserRound size={17} />Account profile</Link>
                  <Link href="/app/player/profile"><Settings size={17} />Preferences</Link>
                  <button type="button" onClick={logout}><LogOut size={17} />Sign out</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>

        <nav className={styles.bottomNav} aria-label={`${definition.shortLabel} mobile navigation`}>
          {definition.nav.slice(0, 4).map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = item.section === section;
            return (
              <Link
                key={item.section || 'overview'}
                href={getWorkspaceHref(workspace, item.section)}
                className={active ? styles.bottomItemActive : styles.bottomItem}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={19} />
                <span>{item.label.replace('Local ', '')}</span>
              </Link>
            );
          })}
          <button type="button" className={styles.bottomItem} onClick={() => setMobileOpen(true)}>
            <Menu size={19} />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

function V5AppLoading() {
  return (
    <div className={styles.loadingShell} aria-label="Loading your PlayMechi workspace" role="status">
      <aside />
      <div>
        <header />
        <main>
          <span />
          <span />
          <span />
          <span />
        </main>
      </div>
    </div>
  );
}
