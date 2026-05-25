'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Home, MessageCircle, Newspaper, Trophy, User } from 'lucide-react';

import Dock from '@/components/ui/dock';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/playmechi/tournament', label: 'Arena', icon: Trophy, activeHrefs: ['/tournaments'] },
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/community', label: 'Community', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeItem =
    NAV_ITEMS.find(({ href, activeHrefs = [] }) => {
      return (
        pathname === href ||
        pathname.startsWith(`${href}/`) ||
        activeHrefs.some(
          (activeHref) => pathname === activeHref || pathname.startsWith(`${activeHref}/`)
        )
      );
    }) ?? NAV_ITEMS[0];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <Dock
        activeLabel={activeItem.label}
        className="px-3"
        items={NAV_ITEMS.map(({ href, label, icon }) => ({
          href,
          label,
          icon,
          onClick: () => router.push(href),
        }))}
      />
    </div>
  );
}
