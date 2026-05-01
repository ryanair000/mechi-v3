import Link from 'next/link';
import {
  FaDiscord,
  FaFacebookF,
  FaInstagram,
  FaTwitch,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6';
import { BrandLogo } from '@/components/BrandLogo';
import { cn } from '@/lib/utils';

const links = [
  {
    title: 'How It Works',
    href: '/#how-it-works',
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
    title: 'Privacy Policy',
    href: '/privacy-policy',
  },
  {
    title: 'Terms of Service',
    href: '/terms-of-service',
  },
];

type FooterSectionProps = {
  className?: string;
};

export default function FooterSection({ className }: FooterSectionProps) {
  return (
    <footer className={cn('py-16 md:py-32', className)}>
      <div className="landing-shell">
        <Link href="/" aria-label="go home" className="mx-auto block size-fit">
          <BrandLogo size="sm" />
        </Link>

        <div className="my-8 flex flex-wrap justify-center gap-6 text-sm">
          {links.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className="text-muted-foreground hover:text-primary block duration-150"
            >
              <span>{link.title}</span>
            </Link>
          ))}
        </div>
        <div className="my-8 flex flex-wrap justify-center gap-6 text-sm">
          <Link
            href="https://www.instagram.com/playmechi"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-muted-foreground hover:text-primary block"
          >
            <FaInstagram className="size-6" />
          </Link>
          <Link
            href="https://www.facebook.com/playmechi"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-muted-foreground hover:text-primary block"
          >
            <FaFacebookF className="size-6" />
          </Link>
          <Link
            href="https://www.x.com/playmechi"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="text-muted-foreground hover:text-primary block"
          >
            <FaXTwitter className="size-6" />
          </Link>
          <Link
            href="https://www.youtube.com/@playmechi"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="text-muted-foreground hover:text-primary block"
          >
            <FaYoutube className="size-6" />
          </Link>
          <Link
            href="https://discord.gg/playmechi"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Discord"
            className="text-muted-foreground hover:text-primary block"
          >
            <FaDiscord className="size-6" />
          </Link>
          <Link
            href="https://www.twitch.tv/playmechi"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitch"
            className="text-muted-foreground hover:text-primary block"
          >
            <FaTwitch className="size-6" />
          </Link>
        </div>
        <span className="text-muted-foreground block text-center text-sm">
          Copyright {new Date().getFullYear()} Mechi, All rights reserved
        </span>
      </div>
    </footer>
  );
}
