'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { cn } from '@/lib/utils';

export const NOTIFICATION_EVENT = 'mechi:notifications-changed';
const NOTIFICATION_POLL_INTERVAL_MS = 8000;

interface NotificationNavButtonProps {
  className?: string;
}

function getDisplayCount(value: number) {
  if (value > 99) {
    return '99+';
  }

  return String(value);
}

export function NotificationNavButton({ className }: NotificationNavButtonProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const authFetch = useAuthFetch();
  const [unreadCount, setUnreadCount] = useState(0);
  const isActive = pathname.startsWith('/notifications');
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

  return (
    <Link
      href="/notifications"
      aria-label={
        visibleUnreadCount > 0
          ? `Open notifications. ${visibleUnreadCount} unread.`
          : 'Open notifications'
      }
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-strong)] hover:text-[var(--text-primary)]',
        isActive &&
          'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]',
        className
      )}
    >
      <Bell size={15} />
      {visibleUnreadCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--brand-coral)] px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
          {getDisplayCount(visibleUnreadCount)}
        </span>
      ) : null}
    </Link>
  );
}

export function emitNotificationRefresh() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATION_EVENT));
}
