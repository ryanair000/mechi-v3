export type NotificationPriority = 'critical' | 'action' | 'success' | 'info' | 'live';

export type NotificationCategory =
  | 'Match'
  | 'Tournament'
  | 'Proof'
  | 'Community'
  | 'Support'
  | 'Account'
  | 'System';

export type NotificationGroup = 'Today' | 'Yesterday' | 'Earlier';

export type NotificationItem = {
  id: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  title: string;
  body: string;
  time: string;
  group: NotificationGroup;
  destination: string;
  destinationHint: string;
  unread: boolean;
};

export const notificationFilters = [
  'All',
  'Match',
  'Tournament',
  'Proof',
  'Community',
  'Support',
  'Account',
] as const;

export type NotificationFilter = (typeof notificationFilters)[number];

export const priorityTone: Record<
  NotificationPriority,
  { accent: string; bg: string; border: string; chip: string }
> = {
  critical: {
    accent: '#FF6B6B',
    bg: 'rgba(255,107,107,0.12)',
    border: 'rgba(255,107,107,0.32)',
    chip: 'CRITICAL',
  },
  action: {
    accent: '#32E0C4',
    bg: 'rgba(50,224,196,0.12)',
    border: 'rgba(50,224,196,0.28)',
    chip: 'ACTION',
  },
  success: {
    accent: '#32E0C4',
    bg: 'rgba(50,224,196,0.12)',
    border: 'rgba(50,224,196,0.2)',
    chip: 'SUCCESS',
  },
  info: {
    accent: '#6B7A76',
    bg: '#FFFFFF',
    border: '#DDE3EB',
    chip: 'INFO',
  },
  live: {
    accent: '#32E0C4',
    bg: '#EFFFFB',
    border: 'rgba(50,224,196,0.24)',
    chip: 'LIVE',
  },
};
