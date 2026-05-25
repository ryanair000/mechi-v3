'use client';

import Dock from '@/components/ui/dock';
import { Home, MessageCircle, Newspaper, Trophy, User } from 'lucide-react';

const DemoOne = () => {
  const dockItems = [
    { icon: Home, label: 'Home', onClick: () => undefined },
    { icon: Trophy, label: 'Arena', onClick: () => undefined },
    { icon: Newspaper, label: 'Feed', onClick: () => undefined },
    { icon: MessageCircle, label: 'Community', onClick: () => undefined },
    { icon: User, label: 'Profile', onClick: () => undefined },
  ];

  return <Dock activeLabel="Home" items={dockItems} className="py-12" />;
};

export { DemoOne };
