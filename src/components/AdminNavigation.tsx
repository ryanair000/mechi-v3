'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AtSign,
  BarChart2,
  ChevronRight,
  Clock3,
  DoorOpen,
  Headset,
  MessageCircle,
  ScrollText,
  Shield,
  Swords,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

type AdminRole = 'admin' | 'moderator' | string;
type AdminNavVariant = 'desktop' | 'mobile';

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

type AdminNavSection = {
  label: string;
  secondary?: boolean;
  items: AdminNavItem[];
};

const PRIMARY_ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Overview', icon: BarChart2 },
  { href: '/admin/queue', label: 'Queue', icon: Clock3 },
  { href: '/admin/matches', label: 'Matches', icon: Swords },
  { href: '/admin/lobbies', label: 'Lobbies', icon: DoorOpen },
  { href: '/admin/rewards', label: 'Rewards', icon: Shield },
  { href: '/admin/bounties', label: 'Bounties', icon: Zap },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/support', label: 'Support', icon: Headset },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
];

const TOOL_ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle, adminOnly: true },
  { href: '/admin/instagram', label: 'Instagram', icon: AtSign, adminOnly: true },
  { href: '/admin/logs', label: 'Audit Log', icon: ScrollText, adminOnly: true },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(href));
}

function getVisibleSections(role: AdminRole): AdminNavSection[] {
  const filterItems = (items: AdminNavItem[]) =>
    items.filter((item) => !item.adminOnly || role === 'admin');

  const sections: AdminNavSection[] = [
    {
      label: 'Decision lanes',
      items: filterItems(PRIMARY_ADMIN_NAV),
    },
    {
      label: 'Tools',
      secondary: true,
      items: filterItems(TOOL_ADMIN_NAV),
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}

export function AdminNavigation({
  role,
  variant = 'desktop',
}: {
  role: AdminRole;
  variant?: AdminNavVariant;
}) {
  const pathname = usePathname();
  const visibleSections = getVisibleSections(role);

  if (variant === 'mobile') {
    return (
      <div className="flex flex-col gap-2">
        {visibleSections.map((section) => (
          <div key={section.label} className="space-y-2">
            <div className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
              {section.label}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {section.items.map(({ href, label, icon: Icon }) => {
                const isActive = isPathActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.12)] text-[var(--text-primary)]'
                        : section.secondary
                          ? 'border-[var(--border-color)] bg-transparent text-[var(--text-soft)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon
                      size={14}
                      className={isActive ? 'text-[var(--accent-secondary-text)]' : undefined}
                    />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleSections.map((section) => (
        <div key={section.label} className="space-y-1.5">
          <div className="px-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            {section.label}
          </div>
          <div className="space-y-1">
            {section.items.map(({ href, label, icon: Icon }) => {
              const isActive = isPathActive(pathname, href);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-[13px] font-semibold transition-all ${
                    isActive
                      ? 'border-[rgba(50,224,196,0.16)] bg-[rgba(50,224,196,0.08)] text-[var(--text-primary)]'
                      : section.secondary
                        ? 'border-transparent text-[var(--text-soft)] hover:border-[var(--border-color)] hover:bg-white/[0.02] hover:text-white'
                        : 'border-transparent text-white/72 hover:border-[var(--border-color)] hover:bg-white/[0.03] hover:text-white'
                  }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                        isActive
                          ? 'border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                          : section.secondary
                          ? 'border-[var(--border-color)] bg-transparent text-[var(--text-soft)] group-hover:text-white/85'
                          : 'border-[var(--border-color)] bg-white/[0.03] text-white/60 group-hover:text-white/85'
                    }`}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="flex-1">{label}</span>
                  <ChevronRight
                    size={13}
                    className={`transition-opacity ${
                      isActive
                        ? 'opacity-60 text-[var(--accent-secondary-text)]'
                        : 'opacity-0 group-hover:opacity-50'
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
