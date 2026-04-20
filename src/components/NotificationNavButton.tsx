'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';

export const NOTIFICATION_EVENT = 'mechi:notifications-changed';

interface NotificationNavButtonProps {
  className?: string;
}

export function NotificationNavButton({ className = '' }: NotificationNavButtonProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [unreadCount, setUnreadCount] = useState(0);
  const isActive = pathname.startsWith('/notifications');
  const displayedUnreadCount = user && !isActive ? unreadCount : 0;

  useEffect(() => {
    if (!user || isActive) {
      return;
    }

    let cancelled = false;

    async function loadUnreadCount() {
      try {
        const res = await authFetch('/api/notifications');
        if (!res.ok || cancelled) {
          return;
        }

        const data = (await res.json()) as { unreadCount?: number };
        if (!cancelled) {
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    }

    void loadUnreadCount();
    const refreshInterval = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);
    const handleRefresh = () => {
      void loadUnreadCount();
    };

    window.addEventListener(NOTIFICATION_EVENT, handleRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener(NOTIFICATION_EVENT, handleRefresh);
    };
  }, [authFetch, isActive, user]);

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md border text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] ${
        isActive
          ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
          : 'border-[var(--border-color)]'
      } ${className}`}
      aria-label="Notifications"
      title="Notifications"
    >
      <Bell size={13} />
      {displayedUnreadCount > 0 ? (
        <span className="absolute right-0.5 top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-coral)] px-1 text-[9px] font-black leading-none text-[var(--brand-night)]">
          {displayedUnreadCount > 9 ? '9+' : displayedUnreadCount}
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
