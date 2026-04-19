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
    group: 'Product',
    items: [
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
    ],
  },
  {
    group: 'Solution',
    items: [
      {
        title: 'Startup',
        href: '#',
      },
      {
        title: 'Freelancers',
        href: '#',
      },
      {
        title: 'Organizations',
        href: '#',
      },
      {
        title: 'Students',
        href: '#',
      },
      {
        title: 'Collaboration',
        href: '#',
      },
      {
        title: 'Design',
        href: '#',
      },
      {
        title: 'Management',
        href: '#',
      },
    ],
  },
  {
    group: 'Company',
    items: [
      {
        title: 'About',
        href: '#',
      },
      {
        title: 'Careers',
        href: '#',
      },
      {
        title: 'Blog',
        href: '#',
      },
      {
        title: 'Press',
        href: '#',
      },
      {
        title: 'Contact',
        href: '#',
      },
      {
        title: 'Help',
        href: '#',
      },
    ],
  },
  {
    group: 'Legal',
    items: [
      {
        title: 'Licence',
        href: '#',
      },
      {
        title: 'Privacy',
        href: '#',
      },
      {
        title: 'Cookies',
        href: '#',
      },
      {
        title: 'Security',
        href: '#',
      },
    ],
  },
];

export default function FooterDemoSection() {
  return (
    <footer className="border-b bg-white pt-20 dark:bg-transparent">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" aria-label="go home" className="block size-fit">
              <BrandLogo size="sm" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 md:col-span-3">
            {links.map((linkGroup) => (
              <div key={linkGroup.group} className="space-y-4 text-sm">
                <span className="block font-medium">{linkGroup.group}</span>
                {linkGroup.items.map((item) => (
                  <Link
                    key={`${linkGroup.group}-${item.title}`}
                    href={item.href}
                    className="text-muted-foreground hover:text-primary block duration-150"
                  >
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t py-6">
          <span className="text-muted-foreground order-last block text-center text-sm md:order-first">
            Copyright {new Date().getFullYear()} Mechi. All rights reserved.
          </span>
          <div className="order-first flex flex-wrap justify-center gap-6 text-sm md:order-last">
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
              <Feather className="size-6" />
            </Link>
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Social Link 6"
              className="text-muted-foreground hover:text-primary block"
            >
              <Send className="size-6" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
