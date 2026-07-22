'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CalendarCheck,
  ChevronDown,
  CircleDollarSign,
  Gamepad2,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Medal,
  Menu,
  Radio,
  Search,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  Swords,
  LifeBuoy,
  Video,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import styles from './Workspace.module.css';

type NavItem = { label: string; href: string; icon: typeof Home };

const playerNavigation: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Tournaments', href: '/tournaments', icon: Trophy },
  { label: 'Play 1v1', href: '/challenges', icon: Swords },
  { label: 'My Team', href: '/teams', icon: UsersRound },
  { label: 'Matches', href: '/matches', icon: Gamepad2 },
  { label: 'Rankings', href: '/leaderboard', icon: Medal },
  { label: 'Rewards', href: '/rewards', icon: Sparkles },
  { label: 'Profile', href: '/profile', icon: UserRound },
  { label: 'Support', href: '/support', icon: LifeBuoy },
];

const creatorNavigation: NavItem[] = [
  { label: 'Overview', href: '/creator', icon: LayoutDashboard },
  { label: 'Content', href: '/creator/content', icon: Video },
  { label: 'Live', href: '/creator/live', icon: Radio },
  { label: 'Coverage', href: '/creator/coverage', icon: CalendarCheck },
  { label: 'Tournaments', href: '/creator/tournaments', icon: Trophy },
  { label: 'Audience', href: '/creator/audience', icon: UsersRound },
  { label: 'Opportunities', href: '/creator/opportunities', icon: Sparkles },
  { label: 'Earnings', href: '/creator/earnings', icon: CircleDollarSign },
  { label: 'Profile', href: '/creator/profile', icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard' || href === '/creator') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlayMechiWorkspaceShell({ children, workspaceOverride }: { children: React.ReactNode; workspaceOverride?: 'player' | 'creator' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const creatorMode = workspaceOverride === 'creator' || (!workspaceOverride && (pathname === '/creator' || pathname.startsWith('/creator/')));
  const navigation = creatorMode ? creatorNavigation : playerNavigation;

  const switchWorkspace = (workspace: 'player' | 'creator') => {
    setMobileOpen(false);
    router.push(workspace === 'creator' ? '/creator' : '/dashboard');
  };

  return (
    <div className={styles.shell} data-workspace={creatorMode ? 'creator' : 'player'}>
      <a className={styles.skipLink} href="#workspace-content">Skip to content</a>
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link className={styles.brand} href="/">
            <Image src="/mechi-logo.png" alt="PlayMechi" width={46} height={46} priority />
            <span>PLAY<span>MECHI</span></span>
          </Link>
          <button className={styles.closeMenu} onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className={styles.workspacePicker}>
          <span>Using Mechi as</span>
          <button type="button" aria-haspopup="listbox">
            <span className={creatorMode ? styles.creatorWorkspaceIcon : styles.playerWorkspaceIcon}>
              {creatorMode ? <Video size={18} /> : <Gamepad2 size={18} />}
            </span>
            <span>
              <strong>{creatorMode ? 'Creator Studio' : 'Player'}</strong>
              <small>{creatorMode ? 'Create and grow' : 'Play and track results'}</small>
            </span>
            <ChevronDown size={17} />
          </button>
          <div className={styles.workspaceChoices} role="listbox" aria-label="Choose workspace">
            <button
              role="option"
              aria-selected={!creatorMode}
              className={!creatorMode ? styles.workspaceChoiceActive : ''}
              onClick={() => switchWorkspace('player')}
            >
              <Gamepad2 size={17} /> Player
            </button>
            <button
              role="option"
              aria-selected={creatorMode}
              className={creatorMode ? styles.workspaceChoiceActive : ''}
              onClick={() => switchWorkspace('creator')}
            >
              <Video size={17} /> Creator Studio
            </button>
          </div>
        </div>

        <nav className={styles.navigation} aria-label={`${creatorMode ? 'Creator' : 'Player'} navigation`} onClick={() => setMobileOpen(false)}>
          <span className={styles.navLabel}>{creatorMode ? 'Creator tools' : 'Play'}</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link className={isActive(pathname, item.href) ? styles.navActive : ''} href={item.href} key={item.href}>
                <Icon size={19} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/notifications"><Bell size={18} /> Notifications</Link>
          <Link href="/messages"><Inbox size={18} /> Messages</Link>
          <button onClick={logout}><LogOut size={18} /> Sign out</button>
        </div>
      </aside>

      {mobileOpen ? <button aria-label="Close menu overlay" className={styles.scrim} onClick={() => setMobileOpen(false)} /> : null}

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button className={styles.menuButton} onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className={styles.mobileBrand}>PLAY<span>MECHI</span></div>
          <label className={styles.search}>
            <Search size={18} />
            <span className={styles.visuallyHidden}>Search PlayMechi</span>
            <input placeholder="Search tournaments, players, creators..." />
            <kbd>⌘ K</kbd>
          </label>
          <div className={styles.topActions}>
            <Link className={styles.iconButton} href="/notifications" aria-label="Notifications"><Bell size={20} /></Link>
            <Link className={styles.userMenu} href="/profile">
              <span>{String(user?.username ?? 'P').slice(0, 1).toUpperCase()}</span>
              <span><strong>{user?.username ?? 'Player'}</strong><small>{creatorMode ? 'Creator tools' : 'Player account'}</small></span>
              <ChevronDown size={16} />
            </Link>
          </div>
        </header>
        <main id="workspace-content" className={styles.main}>{children}</main>
      </div>

      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return <Link className={isActive(pathname, item.href) ? styles.mobileActive : ''} href={item.href} key={item.href}><Icon size={20} /><span>{item.label}</span></Link>;
        })}
        <button onClick={() => setMobileOpen(true)}><Menu size={20} /><span>More</span></button>
      </nav>
    </div>
  );
}
