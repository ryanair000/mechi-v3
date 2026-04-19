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
  {
    title: 'Features',
    href: '#',
  },
  {
    title: 'Solution',
    href: '#',
  },
  {
    title: 'Customers',
    href: '#',
  },
  {
    title: 'Pricing',
    href: '/pricing',
  },
  {
    title: 'Help',
    href: '#',
  },
  {
    title: 'About',
    href: '#',
  },
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
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Social Link 1"
            className="text-muted-foreground hover:text-primary block"
          >
            <Share2 className="size-6" />
          </Link>
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Social Link 2"
            className="text-muted-foreground hover:text-primary block"
          >
            <MessageCircle className="size-6" />
          </Link>
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Social Link 3"
            className="text-muted-foreground hover:text-primary block"
          >
            <LinkIcon className="size-6" />
          </Link>
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Social Link 4"
            className="text-muted-foreground hover:text-primary block"
          >
            <Globe className="size-6" />
          </Link>
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Social Link 5"
            className="text-muted-foreground hover:text-primary block"
          >
            <Send className="size-6" />
          </Link>
          <Link
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Social Link 6"
            className="text-muted-foreground hover:text-primary block"
          >
            <Feather className="size-6" />
          </Link>
        </div>

        <span className="text-muted-foreground block text-center text-sm">
          Copyright {new Date().getFullYear()} Mechi. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
