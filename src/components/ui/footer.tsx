import Link from 'next/link';
import {
  AtSign,
  Camera,
  Gamepad2,
  MessageCircle,
  Music2,
  Play,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const links = [
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
];

const socialLinks = [
  {
    label: 'Instagram',
    href: '#',
    Icon: Camera,
  },
  {
    label: 'Facebook',
    href: '#',
    Icon: Users,
  },
  {
    label: 'X / Twitter',
    href: '#',
    Icon: AtSign,
  },
  {
    label: 'Twitch',
    href: '#',
    Icon: Gamepad2,
  },
  {
    label: 'YouTube',
    href: '#',
    Icon: Play,
  },
  {
    label: 'Discord',
    href: '#',
    Icon: MessageCircle,
  },
  {
    label: 'TikTok',
    href: '#',
    Icon: Music2,
  },
] as const;

export default function FooterSection() {
  return (
    <footer className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Link href="/" aria-label="go home" className="mx-auto block size-fit">
          <BrandLogo size="sm" />
        </Link>

        <div className="my-8 flex flex-wrap justify-center gap-6 text-sm">
          {links.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="text-muted-foreground hover:text-primary block duration-150"
            >
              <span>{link.title}</span>
            </Link>
          ))}
        </div>

        <div className="my-8 flex flex-wrap justify-center gap-6 text-sm">
          {socialLinks.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="text-muted-foreground hover:text-primary block"
            >
              <Icon className="size-6" />
            </Link>
          ))}
        </div>

        <span className="text-muted-foreground block text-center text-sm">
          Copyright {new Date().getFullYear()} Mechi. Compete. Connect. Rise.
        </span>
      </div>
    </footer>
  );
}
