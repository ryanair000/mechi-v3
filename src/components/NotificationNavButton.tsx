'use client';

export const NOTIFICATION_EVENT = 'mechi:notifications-changed';

interface NotificationNavButtonProps {
  className?: string;
}

export function NotificationNavButton(props: NotificationNavButtonProps) {
  void props;
  return null;
}

export function emitNotificationRefresh() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATION_EVENT));
}
