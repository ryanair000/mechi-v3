import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const quickLinks = [
  { title: 'Home', href: '/' },
  { title: 'Pricing', href: '/pricing' },
  { title: 'Sign in', href: '/login' },
  { title: 'Join free', href: '/register' },
];

const productLinks = [
  { title: 'Leaderboard', href: '/leaderboard' },
  { title: 'Tournaments', href: '/tournaments' },
  { title: 'Lobbies', href: '/lobbies' },
  { title: 'Notifications', href: '/notifications' },
];

export default function FooterSection() {
  return (
    <footer className="border-t border-[var(--border-color)] py-8 sm:py-10">
      <div className="landing-shell">
        <div className="card overflow-hidden p-6 sm:p-7">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
            <div>
              <BrandLogo size="sm" />
              <p className="mt-4 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                Mechi V3 keeps queues, direct challenges, tournaments, score reports, and match updates in one place so players stop guessing and start competing.
              </p>

              <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-secondary-text)]">
                  Beta V3
                </p>
                <p className="mt-2 text-sm font-black text-[var(--text-primary)]">
                  Open to the first 100 players.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  50 spots left. Registration closes on May 7, 2026.
                </p>
              </div>

              <div className="mt-5">
                <Link href="/register" className="btn-primary shadow-none">
                  Join the beta
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div>
              <p className="section-title">Quick links</p>
              <div className="mt-4 grid gap-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.title}
                    href={link.href}
                    className="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--border-color)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
                  >
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="section-title">Product</p>
              <div className="mt-4 grid gap-2">
                {productLinks.map((link) => (
                  <Link
                    key={link.title}
                    href={link.href}
                    className="rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[var(--border-color)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]"
                  >
                    {link.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border-color)] pt-5 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
            <p>Copyright {new Date().getFullYear()} Mechi. Competitive play, cleaned up.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/pricing" className="brand-link text-sm font-semibold">
                Free / Pro / Elite
              </Link>
              <Link href="/register" className="brand-link-coral text-sm font-semibold">
                Start free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
