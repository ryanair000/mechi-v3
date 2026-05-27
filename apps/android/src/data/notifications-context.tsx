import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { getNotifications, markAllNotificationsRead } from '../api/mechi';
import type { LiveNotification } from '../types';
import type { NotificationItem } from './notifications';

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  archive: (id: string) => void;
  restore: (item: NotificationItem) => void;
  refetch: () => void;
  isLoading: boolean;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [localOverrides, setLocalOverrides] = useState<Record<string, NotificationItem>>({});
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(80),
    refetchInterval: 30_000,
    enabled: Platform.OS !== 'web',
  });
  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const liveNotifications = useMemo(
    () =>
      notificationsQuery.data?.notifications?.length
        ? notificationsQuery.data.notifications.map(toNotificationItem)
        : [],
    [notificationsQuery.data?.notifications]
  );
  const notifications = useMemo(
    () =>
      liveNotifications
        .map((item) => localOverrides[item.id] ?? item)
        .filter((item) => !archivedIds.includes(item.id)),
    [archivedIds, liveNotifications, localOverrides]
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount:
        notificationsQuery.data?.unreadCount ??
        notifications.filter((item) => item.unread).length,
      markRead: (id) =>
        setLocalOverrides((current) => {
          const notification = notifications.find((item) => item.id === id);
          if (!notification) return current;

          return {
            ...current,
            [id]: {
              ...notification,
              unread: false,
            },
          };
        }),
      markAllRead: () => {
        setLocalOverrides((current) =>
          Object.fromEntries(
            notifications.map((item) => [item.id, { ...(current[item.id] ?? item), unread: false }])
          )
        );
        markAllMutation.mutate();
      },
      archive: (id) => setArchivedIds((current) => (current.includes(id) ? current : [...current, id])),
      restore: (item) =>
        setArchivedIds((current) => current.filter((id) => id !== item.id)),
      refetch: () => {
        void notificationsQuery.refetch();
      },
      isLoading: notificationsQuery.isLoading,
    }),
    [markAllMutation, notifications, notificationsQuery]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

function toNotificationItem(notification: LiveNotification): NotificationItem {
  const createdAt = new Date(notification.created_at);
  const now = new Date();
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
  const ageMinutes = Math.floor(ageMs / 60_000);
  const group =
    ageMs < 24 * 60 * 60 * 1000
      ? 'Today'
      : ageMs < 48 * 60 * 60 * 1000
        ? 'Yesterday'
        : 'Earlier';

  return {
    id: notification.id,
    priority: getPriority(notification),
    category: getCategory(notification.type),
    title: notification.title,
    body: notification.body ?? '',
    time:
      ageMinutes < 1
        ? 'Now'
        : ageMinutes < 60
          ? `${ageMinutes} min ago`
          : ageMinutes < 24 * 60
            ? `${Math.floor(ageMinutes / 60)} h ago`
            : createdAt.toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi' }),
    group,
    destination: getDestination(notification.href),
    destinationHint: getDestinationHint(notification.href),
    unread: !notification.read_at,
  };
}

function getPriority(notification: LiveNotification): NotificationItem['priority'] {
  if (!notification.read_at) {
    if (notification.type.includes('tournament') || notification.type.includes('match')) {
      return 'critical';
    }

    return 'action';
  }

  if (notification.type.includes('verified') || notification.type.includes('completed')) {
    return 'success';
  }

  return 'info';
}

function getCategory(type: string): NotificationItem['category'] {
  if (type.includes('tournament')) return 'Tournament';
  if (type.includes('match')) return 'Match';
  if (type.includes('community')) return 'Community';
  if (type.includes('challenge')) return 'Community';
  if (type.includes('bounty')) return 'Proof';
  return 'System';
}

function getDestination(href?: string | null) {
  if (!href) return '/notifications';
  if (href.startsWith('/community')) return '/(tabs)/community';
  if (href.startsWith('/profile')) return '/(tabs)/profile';
  if (href.startsWith('/notifications')) return '/notifications';
  if (href.startsWith('/weekendcup') || href.startsWith('/playmechi') || href.startsWith('/tournaments')) {
    return '/(tabs)/arena';
  }
  return href.startsWith('/') ? href : '/notifications';
}

function getDestinationHint(href?: string | null) {
  const destination = getDestination(href);
  if (destination.includes('arena')) return 'Open Arena';
  if (destination.includes('community')) return 'Open community';
  if (destination.includes('profile')) return 'Open profile';
  return 'Open';
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error('useNotifications must be used inside NotificationsProvider');
  }

  return context;
}
