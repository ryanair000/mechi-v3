import Link from 'next/link';
import {
  FaDiscord,
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaTwitch,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';
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
  {
    title: 'Privacy Policy',
    href: '/privacy-policy',
  },
  {
    title: 'Terms of Service',
    href: '/terms-of-service',
  },
];

const socialLinks = [
  {
    label: 'Instagram',
    href: '#',
    Icon: FaInstagram,
  },
  {
    label: 'Facebook',
    href: '#',
    Icon: FaFacebook,
  },
  {
    label: 'X / Twitter',
    href: '#',
    Icon: FaXTwitter,
  },
  {
    label: 'Twitch',
    href: '#',
    Icon: FaTwitch,
  },
  {
    label: 'YouTube',
    href: '#',
    Icon: FaYoutube,
  },
  {
    label: 'Discord',
    href: '#',
    Icon: FaDiscord,
  },
  {
    label: 'TikTok',
    href: '#',
    Icon: FaTiktok,
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
