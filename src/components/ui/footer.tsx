import Link from 'next/link';
import {
  Globe,
  Mail,
  MessageCircle,
  ShieldCheck,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

type FooterLink = {
  title: string;
  href: string;
};

type FooterActionLink = FooterLink & {
  icon: LucideIcon;
  external?: boolean;
};

const SUPPORT_EMAIL = 'support@mechi.club';
const WHATSAPP_GROUP_URL = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL;

const links: FooterLink[] = [
  {
    title: 'How It Works',
    href: '/#how-it-works',
  },
  {
    title: 'Games',
    href: '/#supported',
  },
  {
    title: 'Pricing',
    href: '/pricing',
  },
  {
    title: 'Ranks',
    href: '/#ranks',
  },
  {
    title: 'Tournaments',
    href: '/tournaments',
  },
  {
    title: 'Sign In',
    href: '/login',
  },
  {
    title: 'Privacy Policy',
    href: '/privacy-policy',
  },
  {
    title: 'Terms of Service',
    href: '/terms-of-service',
  },
  {
    title: 'User Data Deletion',
    href: '/user-data-deletion',
  },
];

const actionLinks: FooterActionLink[] = [
  {
    title: 'Support',
    href: `mailto:${SUPPORT_EMAIL}`,
    icon: Mail,
    external: true,
  },
  {
    title: 'Connect',
    href: '/connect',
    icon: Globe,
  },
  {
    title: 'Join Free',
    href: '/register',
    icon: ShieldCheck,
  },
  {
    title: 'Open Inbox',
    href: '/login',
    icon: Share2,
  },
];

if (WHATSAPP_GROUP_URL) {
  actionLinks.push({
    title: 'WhatsApp',
    href: WHATSAPP_GROUP_URL,
    icon: MessageCircle,
    external: true,
  });
}

function FooterAction({ title, href, icon: Icon, external = false }: FooterActionLink) {
  const className =
    'inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]';

  if (external) {
    return (
      <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel={href.startsWith('mailto:') ? undefined : 'noreferrer'} className={className}>
        <Icon size={15} />
        {title}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <Icon size={15} />
      {title}
    </Link>
  );
}

export default function FooterSection() {
  return (
    <footer className="landing-section border-none pt-0">
      <div className="landing-shell">
        <div className="card p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-md">
              <BrandLogo size="sm" showTagline />
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Cleaner queues, direct challenges, lobbies, and tournament flow for competitive
                players across East Africa.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {actionLinks.map((link) => (
                <FooterAction key={link.title} {...link} />
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--border-color)] pt-6">
            {links.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {link.title}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-[var(--border-color)] pt-5 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:justify-between">
            <span>Copyright {new Date().getFullYear()} Mechi. Compete. Connect. Rise.</span>
            <span>{SUPPORT_EMAIL}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
