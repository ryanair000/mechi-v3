import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, MessageCircleMore, Radio, Swords } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  'https://mechi.club';
const WHATSAPP_JOIN_URL = process.env.NEXT_PUBLIC_WHATSAPP_JOIN_URL?.trim() || '';
const CHEZAHUB_URL = process.env.NEXT_PUBLIC_CHEZAHUB_URL?.trim() || '';

const PRIMARY_PATH = {
  title: 'Start With Mechi',
  subtitle: 'The main platform',
  description:
    'Set up your profile, find ranked matches, and move through a cleaner competitive flow built for Kenyan players.',
  href: APP_URL,
  displayUrl: 'mechi.club',
  icon: Swords,
  cta: 'Open Mechi',
  highlights: ['Profiles', '1v1 queues', 'Tournaments'],
} as const;

const SECONDARY_PATHS = [
  {
    title: 'Join The WhatsApp Group',
    subtitle: 'Community chat',
    description:
      'Stay close to the scene, see updates fast, and keep the community energy alive outside the platform.',
    href: WHATSAPP_JOIN_URL,
    displayUrl: 'chat.whatsapp.com',
    icon: MessageCircleMore,
    cta: 'Open WhatsApp',
  },
  {
    title: 'Visit ChezaHub',
    subtitle: 'Partner ecosystem',
    description:
      'Explore the wider gaming network around Mechi and discover more of the surrounding community.',
    href: CHEZAHUB_URL,
    displayUrl: 'chezahub.co.ke',
    icon: Radio,
    cta: 'Open ChezaHub',
  },
] as const;

const DISCOVERY_STEPS = [
  {
    label: 'Discover',
    text: 'See what Mechi is and where to start.',
  },
  {
    label: 'Join',
    text: 'Pick the platform, community, or ecosystem path that fits you.',
  },
  {
    label: 'Stay Close',
    text: 'Move between ranked play, chat, and partner discovery without friction.',
  },
] as const;

export const metadata: Metadata = {
  title: 'Mechi Connect',
  description: 'Discover Mechi, join the WhatsApp community, and explore ChezaHub in one place.',
  alternates: {
    canonical: 'https://connect.mechi.club',
  },
  openGraph: {
    title: 'Mechi Connect',
    description: 'Discover Mechi, join the WhatsApp community, and explore ChezaHub in one place.',
    url: 'https://connect.mechi.club',
    siteName: 'Mechi',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mechi Connect',
    description: 'Discover Mechi, join the WhatsApp community, and explore ChezaHub in one place.',
  },
};

function DiscoveryLink({
  title,
  subtitle,
  description,
  href,
  displayUrl,
  cta,
  icon: Icon,
  featured = false,
  highlights = [],
}: {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  displayUrl: string;
  cta: string;
  icon: typeof Swords;
  featured?: boolean;
  highlights?: readonly string[];
}) {
  return (
    <Link
      href={href}
      aria-label={`${title} - ${displayUrl}`}
      className={`group block rounded-[1.6rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] transition-colors duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(50,224,196,0.18)] ${
        featured ? 'p-5 sm:p-6' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)]">
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`${featured ? 'text-lg sm:text-xl' : 'text-base'} font-black text-[var(--text-primary)]`}>
              {title}
            </p>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              {subtitle}
            </span>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>

          {highlights.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="inline-flex rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                >
                  {highlight}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--text-soft)]">{displayUrl}</span>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)]">
              {cta}
              <ArrowUpRight
                size={16}
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ConnectPage() {
  return (
    <main className="page-base relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(50,224,196,0.12),transparent_60%)]" />

      <div className="landing-shell relative flex min-h-[100svh] items-center py-8 sm:py-10 lg:py-14">
        <section className="mx-auto w-full max-w-4xl">
          <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-[0_24px_70px_rgba(11,17,33,0.08)] backdrop-blur-xl sm:p-7 lg:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="flex justify-center">
                <BrandLogo size="lg" showTagline />
              </div>

              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Brand + Community Discovery
              </p>

              <h1 className="mt-3 text-[2rem] font-black leading-[1.03] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[2.8rem]">
                A cleaner home for competitive gaming and community.
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                Mechi helps players discover the platform, join the community conversation,
                and stay connected to the wider ecosystem without digging through scattered links.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href={APP_URL}
                  className="btn-primary justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(255,107,107,0.22)]"
                >
                  Start on Mechi
                </Link>
                <Link
                  href={WHATSAPP_JOIN_URL}
                  className="btn-ghost justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(50,224,196,0.18)]"
                >
                  Join WhatsApp
                </Link>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {DISCOVERY_STEPS.map((step) => (
                <div
                  key={step.label}
                  className="rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--surface)] px-4 py-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                    {step.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    Start Here
                  </p>
                  <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                    Lead with the main product.
                  </h2>
                </div>
              </div>

              <div className="mt-4">
                <DiscoveryLink {...PRIMARY_PATH} featured highlights={PRIMARY_PATH.highlights} />
              </div>
            </div>

            <div className="mt-10">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Community + Ecosystem
                </p>
                <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
                  Keep discovery organized after the main entry point.
                </h2>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {SECONDARY_PATHS.map((path) => (
                  <DiscoveryLink key={path.title} {...path} />
                ))}
              </div>
            </div>

            <div className="mt-10 border-t border-[var(--border-color)] pt-4 text-center">
              <p className="text-sm text-[var(--text-soft)]">
                Best flow: open Mechi for matches, join WhatsApp for the chat, and use ChezaHub to
                explore the broader scene.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
