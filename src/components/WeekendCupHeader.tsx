'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { BrandLogo } from '@/components/BrandLogo';
import { CountryLanguageBar } from '@/components/CountryLanguageBar';
import { PageBreadcrumbs } from '@/components/PageBreadcrumbs';
import { useRegionalSettings } from '@/components/RegionalSettingsProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getLoginPath } from '@/lib/navigation';
import {
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
} from '@/lib/weekend-cup';

type WeekendCupHeaderProps = {
  voteHref?: string;
  registerHref?: string;
};

export function WeekendCupHeader({
  voteHref = '#vote',
  registerHref = WEEKEND_CUP_REGISTRATION_PATH,
}: WeekendCupHeaderProps) {
  const { user } = useAuth();
  const { locale } = useRegionalSettings();
  const isSwahili = locale === 'sw-TZ';
  const signInHref = getLoginPath(
    voteHref.startsWith('/') ? voteHref : `${WEEKEND_CUP_PUBLIC_PATH}${voteHref}`
  );
  const navItems = isSwahili
    ? [
        { href: voteHref, label: 'Kura' },
        { href: '/leaderboard', label: 'Ubao wa Washindi' },
        { href: '/playmechi', label: 'Tournament Iliyopita' },
        { href: '/android-testers', label: 'Android' },
        { href: '/platform', label: 'Mfumo' },
      ]
    : [
        { href: voteHref, label: 'Vote' },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/playmechi', label: 'Last Tournament' },
        { href: '/android-testers', label: 'Android' },
        { href: '/platform', label: 'Platform' },
      ];

  return (
    <header className="sticky top-2 z-50 sm:top-3">
      <div className="relative mx-auto w-full max-w-[900px] px-3 sm:px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-px w-screen -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[rgba(50,224,196,0.22)] to-transparent"
        />
        <nav className="relative rounded-[var(--radius-hero)] border border-[rgba(112,139,174,0.22)] bg-[rgba(17,26,44,0.96)] px-2 py-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex min-h-[28px] items-center gap-2">
            <Link
              href={WEEKEND_CUP_PUBLIC_PATH}
              className="flex shrink-0 items-center rounded-[var(--radius-control)] px-1 py-0.5"
              aria-label="Weekend Cup home"
            >
              <BrandLogo size="xs" variant="symbol" />
            </Link>

            <div className="hidden min-w-0 flex-1 items-center justify-center gap-2.5 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[var(--radius-control)] px-1.5 py-1 font-[var(--font-display)] text-[0.72rem] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <CountryLanguageBar className="hidden lg:flex" />
              <ThemeToggle />
              <Link
                href={user ? '/dashboard' : signInHref}
                className="inline-flex min-h-[32px] items-center justify-center rounded-[var(--radius-control)] border border-[rgba(50,224,196,0.34)] bg-[rgba(17,35,55,0.88)] px-3 font-[var(--font-display)] text-[0.72rem] font-black uppercase tracking-[0.14em] text-[var(--accent-secondary-text)] transition-all hover:border-[rgba(50,224,196,0.55)] hover:bg-[rgba(50,224,196,0.12)] hover:text-[var(--text-primary)]"
              >
                {user ? (isSwahili ? 'Dashibodi' : 'Dashboard') : isSwahili ? 'Ingia' : 'Sign in'}
              </Link>
              <Link
                href={registerHref}
                className="inline-flex min-h-[32px] items-center justify-center rounded-[var(--radius-control)] bg-[#ff6268] px-3.5 font-[var(--font-display)] text-[0.72rem] font-black uppercase tracking-[0.14em] text-[#07111e] shadow-[0_12px_28px_rgba(255,98,104,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#ff7479]"
              >
                {isSwahili ? 'Jisajili' : 'Register'}
              </Link>
            </div>
          </div>

          <div className="mt-1.5 border-t border-[rgba(112,139,174,0.2)] pt-1.5 lg:hidden">
            <div className="pb-2">
              <CountryLanguageBar inline />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-[var(--radius-control)] px-3 py-1.5 font-[var(--font-display)] text-[0.72rem] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <PageBreadcrumbs className="mt-3 px-1 sm:px-2" />
      </div>
    </header>
  );
}
