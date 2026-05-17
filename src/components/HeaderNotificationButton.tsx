'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { cn } from '@/lib/utils';

const NOTIFICATION_EVENT = 'mechi:notifications-changed';
const NOTIFICATION_POLL_INTERVAL_MS = 8000;

interface HeaderNotificationButtonProps {
  compact?: boolean;
}

function getDisplayCount(value: number) {
  if (value > 99) {
    return '99+';
  }

  return String(value);
}

export function HeaderNotificationButton({ compact = false }: HeaderNotificationButtonProps) {
  const { user, loading } = useAuth();
  const authFetch = useAuthFetch();
  const [unreadCount, setUnreadCount] = useState(0);
  const visibleUnreadCount = user ? unreadCount : 0;

  useEffect(() => {
    if (loading || !user) {
      return;
    }

    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const res = await authFetch('/api/notifications?limit=1');
        if (!res.ok || cancelled) {
          return;
        }

        const payload = (await res.json()) as { unreadCount?: number };
        if (!cancelled) {
          setUnreadCount(payload.unreadCount ?? 0);
        }
      } catch {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadUnreadCount();
      }
    };

    const handleRefresh = () => {
      void loadUnreadCount();
    };

    void loadUnreadCount();
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, NOTIFICATION_POLL_INTERVAL_MS);

    window.addEventListener('focus', handleRefresh);
    window.addEventListener(NOTIFICATION_EVENT, handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener(NOTIFICATION_EVENT, handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authFetch, loading, user]);

  const buttonClass = compact
    ? 'relative inline-flex h-[1.8rem] w-[1.8rem] items-center justify-center rounded-[0.7rem] border border-[rgba(129,148,178,0.18)] bg-[rgba(17,27,46,0.88)] text-[color:rgba(193,203,218,0.96)] transition-colors hover:border-[rgba(50,224,196,0.32)] hover:text-[var(--text-primary)]'
    : 'relative inline-flex h-[2.3rem] w-[2.3rem] items-center justify-center rounded-[0.85rem] border border-[rgba(129,148,178,0.18)] bg-[rgba(17,27,46,0.88)] text-[color:rgba(193,203,218,0.96)] transition-colors hover:border-[rgba(50,224,196,0.32)] hover:text-[var(--text-primary)]';

  const iconSize = compact ? 13 : 15;

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={
        visibleUnreadCount > 0
          ? `Open notifications. ${visibleUnreadCount} unread.`
          : 'Open notifications'
      }
      className={cn(buttonClass)}
    >
      <Bell size={iconSize} />
      {visibleUnreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--brand-coral)] px-1 py-0.5 text-[9px] font-black leading-none text-white">
          {getDisplayCount(visibleUnreadCount)}
        </span>
      ) : null}
    </Link>
  );
}
