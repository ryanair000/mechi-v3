"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type { NavigationWeek } from "@/lib/types";
import { cn } from "@/lib/utils";

type ShellProps = {
  children: React.ReactNode;
  weeks: NavigationWeek[];
  currentWeekNumber: number;
};

const MAIN_NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/bounties", label: "Bounties", icon: Zap },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/ads", label: "Ads", icon: TrendingUp },
  { href: "/community", label: "Community", icon: Users },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-all",
        active
          ? "border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-white"
          : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-white/[0.03] hover:text-white",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl border",
          active
            ? "border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.16)] text-[var(--accent)]"
            : "border-[var(--border)] bg-white/[0.03] text-[var(--text-soft)]",
        )}
      >
        <Icon size={16} />
      </span>
      <span className="flex-1">{label}</span>
    </Link>
  );
}

export function MarketingShell({ children, weeks, currentWeekNumber }: ShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-[var(--border)] bg-[rgba(9,16,28,0.92)] px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-6">
          <p className="eyebrow">Mechi internal</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
            Marketing dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            One operator surface for the 30-day tournament campaign.
          </p>
        </div>

        <div className="space-y-2">
          {MAIN_NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActivePath(pathname, item.href)}
            />
          ))}
        </div>

        <div className="mt-7">
          <p className="eyebrow mb-3">Schedule</p>
          <div className="space-y-2">
            {weeks.map((week) => {
              const active = week.href ? isActivePath(pathname, week.href) : false;
              const content = (
                <>
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl border",
                      active
                        ? "border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.16)] text-[var(--accent)]"
                        : "border-[var(--border)] bg-white/[0.03] text-[var(--text-soft)]",
                    )}
                  >
                    <Calendar size={15} />
                  </span>
                  <span className="flex-1">{week.label}</span>
                  {week.week_number === currentWeekNumber ? (
                    <span className="rounded-full bg-[rgba(50,224,196,0.16)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                      Current
                    </span>
                  ) : null}
                </>
              );

              if (!week.href) {
                return (
                  <div
                    key={week.id}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.02] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={week.id}
                  href={week.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-white"
                      : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-white/[0.03] hover:text-white",
                  )}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        <form action="/api/auth/logout" method="post" className="mt-auto">
          <button type="submit" className="btn-ghost w-full justify-between">
            <span className="flex items-center gap-2">
              <LogOut size={16} />
              Logout
            </span>
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-soft)]">
              7d
            </span>
          </button>
        </form>
      </aside>

      <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 pb-32 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[rgba(9,16,28,0.96)] px-3 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MAIN_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold",
                  active
                    ? "border-[rgba(50,224,196,0.24)] bg-[rgba(50,224,196,0.12)] text-white"
                    : "border-[var(--border)] bg-white/[0.02] text-[var(--text-secondary)]",
                )}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
