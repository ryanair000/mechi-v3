import Link from 'next/link';
import {
  Feather,
  Globe,
  Link as LinkIcon,
  MessageCircle,
  Send,
  Share2,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

const links = [
  { title: 'Home', href: '/' },
  { title: 'Pricing', href: '/pricing' },
  { title: 'Leaderboard', href: '/leaderboard' },
  { title: 'Tournaments', href: '/tournaments' },
  { title: 'Lobbies', href: '/lobbies' },
  { title: 'Sign in', href: '/login' },
];

const socialLinks = [
  { href: '/pricing', label: 'Pricing', Icon: Share2 },
  { href: '/leaderboard', label: 'Leaderboard', Icon: MessageCircle },
  { href: '/tournaments', label: 'Tournaments', Icon: LinkIcon },
  { href: '/lobbies', label: 'Lobbies', Icon: Globe },
  { href: '/register', label: 'Register', Icon: Send },
  { href: '/', label: 'Home', Icon: Feather },
];

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
          {socialLinks.map(({ href, label, Icon }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className="text-muted-foreground hover:text-primary block"
            >
              <Icon className="size-6" />
            </Link>
          ))}
        </div>

        <span className="text-muted-foreground block text-center text-sm">
          Copyright {new Date().getFullYear()} Mechi. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
