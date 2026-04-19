import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { PlatformLogo } from '@/components/PlatformLogo';
import type { PlatformKey } from '@/types';

const footerGroups = [
  {
    title: 'Explore',
    items: [
      { title: 'How It Works', href: '/#how-it-works' },
      { title: 'Supported Games', href: '/#supported' },
      { title: 'Pricing', href: '/pricing' },
      { title: 'Ranks', href: '/#ranks' },
    ],
  },
  {
    title: 'Compete',
    items: [
      { title: 'Queue', href: '/queue' },
      { title: 'Challenges', href: '/challenges' },
      { title: 'Lobbies', href: '/lobbies' },
      { title: 'Tournaments', href: '/tournaments' },
      { title: 'Leaderboard', href: '/leaderboard' },
    ],
  },
  {
    title: 'Account',
    items: [
      { title: 'Join Free', href: '/register' },
      { title: 'Sign In', href: '/login' },
      { title: 'Tutorials', href: '/tutorials' },
      { title: 'Suggest A Game', href: '/suggest' },
      { title: 'Share Profile', href: '/share' },
    ],
  },
] as const;

const supportedPlatforms: Array<{ platform: PlatformKey; label: string }> = [
  { platform: 'ps', label: 'PlayStation' },
  { platform: 'xbox', label: 'Xbox' },
  { platform: 'nintendo', label: 'Nintendo' },
  { platform: 'pc', label: 'PC' },
  { platform: 'mobile', label: 'Mobile' },
];

const socials = [
  { label: 'Instagram', shortLabel: 'IG', href: null },
  { label: 'Facebook', shortLabel: 'FB', href: null },
  { label: 'X / Twitter', shortLabel: 'X', href: null },
  { label: 'Twitch', shortLabel: 'TW', href: null },
  { label: 'YouTube', shortLabel: 'YT', href: null },
  { label: 'Discord', shortLabel: 'DC', href: null },
  { label: 'TikTok', shortLabel: 'TT', href: null },
] as const;

function SocialBadge({
  label,
  shortLabel,
  href,
}: {
  label: string;
  shortLabel: string;
  href: string | null;
}) {
  const classes =
    'inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[rgba(50,224,196,0.28)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]';

  const content = (
    <>
      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--accent-secondary-soft)] px-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
        {shortLabel}
      </span>
      <span>{label}</span>
      {!href ? (
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-soft)]">
          Soon
        </span>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <span className={classes} aria-label={`${label} coming soon`}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={classes}
    >
      {content}
    </Link>
  );
}

export default function FooterSection() {
  return (
    <footer className="border-t border-[var(--border-color)] py-16 sm:py-20">
      <div className="landing-shell">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.35fr)] lg:gap-16">
          <div className="max-w-xl">
            <Link href="/" aria-label="Go home" className="inline-flex">
              <BrandLogo size="md" showTagline />
            </Link>

            <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Mechi gives players a cleaner way to queue, challenge, join lobbies, enter
              tournaments, and report results without the usual chat chaos.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {supportedPlatforms.map((platform) => (
                <span
                  key={platform.platform}
                  className="brand-chip rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.12em]"
                >
                  <PlatformLogo platform={platform.platform} size={14} />
                  <span>{platform.label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title} className="space-y-4">
                <p className="section-title">{group.title}</p>
                <div className="space-y-2.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="block text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface)] p-5 shadow-[var(--surface-highlight),var(--shadow-soft)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="section-title">Socials</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                These are the community lanes we are preparing for Mechi. Plug in your real handles
                when each channel is ready to go live.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {socials.map((social) => (
                <SocialBadge
                  key={social.label}
                  label={social.label}
                  shortLabel={social.shortLabel}
                  href={social.href}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--border-color)] pt-6 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <span>Copyright {new Date().getFullYear()} Mechi. Compete. Connect. Rise.</span>

          <div className="flex flex-wrap gap-4">
            <Link href="/register" className="transition-colors hover:text-[var(--text-primary)]">
              Join Free
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-[var(--text-primary)]">
              Pricing
            </Link>
            <Link href="/login" className="transition-colors hover:text-[var(--text-primary)]">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
