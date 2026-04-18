'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { NOTIFICATION_EVENT } from '@/components/NotificationNavButton';
import type { Notification, NotificationType } from '@/types';

const HIGH_SIGNAL_NOTIFICATION_TYPES = new Set<NotificationType>([
  'match_found',
  'challenge_received',
  'challenge_accepted',
  'match_chat_message',
  'match_completed',
  'match_disputed',
  'tournament_started',
]);

const NOTIFICATION_TOAST_STORAGE_PREFIX = 'mechi-toast-notifications';

function getStorageKey(userId: string) {
  return `${NOTIFICATION_TOAST_STORAGE_PREFIX}:${userId}`;
}

function readSeenIds(userId: string) {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const raw = sessionStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

function writeSeenIds(userId: string, ids: Set<string>) {
  if (typeof window === 'undefined') {
    return;
  }

  const limitedIds = Array.from(ids).slice(-200);
  sessionStorage.setItem(getStorageKey(userId), JSON.stringify(limitedIds));
}

export function NotificationToastBridge() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const authFetch = useAuthFetch();
  const isNotificationsPage = pathname.startsWith('/notifications');
  const initializedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user) {
      initializedUserId.current = null;
      return;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const res = await authFetch('/api/notifications?limit=20');
        if (!res.ok || cancelled) {
          return;
        }

        const payload = (await res.json()) as { notifications?: Notification[] };
        const notifications = payload.notifications ?? [];
        const seenIds = readSeenIds(user.id);

        if (initializedUserId.current !== user.id) {
          notifications.forEach((notification) => seenIds.add(notification.id));
          writeSeenIds(user.id, seenIds);
          initializedUserId.current = user.id;
          return;
        }

        const pendingToasts = notifications
          .filter(
            (notification) =>
              HIGH_SIGNAL_NOTIFICATION_TYPES.has(notification.type) && !seenIds.has(notification.id)
          )
          .reverse();

        notifications.forEach((notification) => seenIds.add(notification.id));
        writeSeenIds(user.id, seenIds);

        if (isNotificationsPage) {
          return;
        }

        pendingToasts.forEach((notification) => {
          toast.success(notification.title);
        });
      } catch {
        // Best-effort only.
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 20000);
    const handleRefresh = () => {
      void loadNotifications();
    };

    window.addEventListener(NOTIFICATION_EVENT, handleRefresh);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener(NOTIFICATION_EVENT, handleRefresh);
    };
  }, [authFetch, isNotificationsPage, loading, user]);

  return null;
}
