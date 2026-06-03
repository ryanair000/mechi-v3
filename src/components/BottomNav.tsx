'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Gamepad2, History, Home, MessageCircle, User } from 'lucide-react';

import Dock from '@/components/ui/dock';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/play', label: 'Play', icon: Gamepad2, activeHrefs: ['/queue'] },
  { href: '/dashboard/challenges', label: 'Challenges', icon: MessageCircle, activeHrefs: ['/challenges'] },
  { href: '/dashboard/matches', label: 'Matches', icon: History, activeHrefs: ['/matches', '/match'] },
  { href: '/dashboard/profile', label: 'Profile', icon: User, activeHrefs: ['/profile'] },
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
