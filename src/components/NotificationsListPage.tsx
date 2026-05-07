'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, Circle } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import type { Notification } from '@/types';

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Now';
  }

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

function normalizeNotificationHref(href?: string | null) {
  if (!href) {
    return null;
  }

  return href === '/feed' ? '/notifications' : href;
}

export function NotificationsListPage() {
  const authFetch = useAuthFetch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/notifications?limit=50');
      if (!res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const data = (await res.json()) as {
        notifications?: Notification[];
        unreadCount?: number;
      };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);

      if ((data.unreadCount ?? 0) > 0) {
        void authFetch('/api/notifications', { method: 'PATCH' }).then(() => {
          setUnreadCount(0);
          emitNotificationRefresh();
        });
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Notifications</p>
            <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Updates
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              A simple list of match, tournament, and account alerts.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            <CheckCheck size={15} className="text-[var(--brand-teal)]" />
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="border-b border-[var(--border-color)] px-4 py-4 last:border-b-0">
                <div className="h-12 shimmer" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Bell size={34} className="mx-auto text-[var(--text-soft)] opacity-40" />
            <p className="mt-4 font-semibold text-[var(--text-primary)]">No notifications yet</p>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              Match and tournament alerts will show up here.
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => {
              const href = normalizeNotificationHref(notification.href);
              const unread = !notification.read_at;
              const content = (
                <div className="flex gap-3 border-b border-[var(--border-color)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-elevated)] sm:px-5">
                  <div className="mt-1">
                    {unread ? (
                      <Circle size={10} className="fill-[var(--brand-coral)] text-[var(--brand-coral)]" />
                    ) : (
                      <Bell size={15} className="text-[var(--text-soft)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p className="font-semibold text-[var(--text-primary)]">{notification.title}</p>
                      <span className="shrink-0 text-xs text-[var(--text-soft)]">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                    </div>
                    {notification.body ? (
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                        {notification.body}
                      </p>
                    ) : null}
                  </div>
                </div>
              );

              return href ? (
                <Link key={notification.id} href={href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={notification.id}>{content}</div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
