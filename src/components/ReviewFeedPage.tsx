'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  BellRing,
  ChevronRight,
  Clock3,
  Flame,
  MessageCircle,
  Radio,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Swords,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import { GAMES, PLATFORMS } from '@/lib/config';
import { cn } from '@/lib/utils';
import type { MatchChallenge, Notification, PlatformKey } from '@/types';

type FilterKey = 'all' | 'challenges' | 'matches' | 'tournaments' | 'system';

type NotificationProfile = {
  username?: string;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean;
};

type FeedItemAccent = 'teal' | 'coral' | 'amber' | 'blue';

type FeedItem = {
  actorHandle: string;
  actorInitial: string;
  actorLabel: string;
  accent: FeedItemAccent;
  actionLabel?: string;
  body?: string | null;
  createdAt: string;
  eyebrow: string;
  filter: Exclude<FilterKey, 'all'>;
  href?: string | null;
  icon: LucideIcon;
  id: string;
  kind: 'challenge_inbound' | 'challenge_outbound' | 'notification';
  metadataLabel?: string;
  challenge?: MatchChallenge;
  notification?: Notification;
  statusLabel: string;
  title: string;
};

const WHATSAPP_JOIN_URL = process.env.NEXT_PUBLIC_WHATSAPP_JOIN_URL ?? '';

const FILTERS: Array<{ key: FilterKey; label: string; shortLabel: string }> = [
  { key: 'all', label: 'Everything', shortLabel: 'All' },
  { key: 'challenges', label: 'Direct calls', shortLabel: 'Calls' },
  { key: 'matches', label: 'Matches', shortLabel: 'Matches' },
  { key: 'tournaments', label: 'Brackets', shortLabel: 'Brackets' },
  { key: 'system', label: 'System', shortLabel: 'System' },
];

const ACCENT_STYLES: Record<
  FeedItemAccent,
  {
    avatar: string;
    border: string;
    chip: string;
    rail: string;
  }
> = {
  teal: {
    avatar: 'border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]',
    border: 'border-[rgba(50,224,196,0.18)]',
    chip: 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]',
    rail: 'from-[rgba(50,224,196,0.35)] to-transparent',
  },
  coral: {
    avatar: 'border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.12)] text-[var(--brand-coral)]',
    border: 'border-[rgba(255,107,107,0.18)]',
    chip: 'border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.1)] text-[var(--brand-coral)]',
    rail: 'from-[rgba(255,107,107,0.4)] to-transparent',
  },
  amber: {
    avatar: 'border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.12)] text-[#f8c862]',
    border: 'border-[rgba(251,191,36,0.18)]',
    chip: 'border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.1)] text-[#f8c862]',
    rail: 'from-[rgba(251,191,36,0.35)] to-transparent',
  },
  blue: {
    avatar: 'border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.12)] text-[#8ebdff]',
    border: 'border-[rgba(96,165,250,0.18)]',
    chip: 'border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.1)] text-[#8ebdff]',
    rail: 'from-[rgba(96,165,250,0.32)] to-transparent',
  },
};

function getInitial(value?: string | null) {
  return value?.trim().charAt(0).toUpperCase() || 'M';
}

function getHandleFromLabel(value: string, fallback: string) {
  const compact = value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `@${compact || fallback}`;
}

function formatAbsoluteTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) {
    return 'now';
  }

  const elapsed = Date.now() - createdAt;
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) {
    return 'now';
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

function getChallengeGameLabel(challenge: MatchChallenge) {
  return GAMES[challenge.game]?.label ?? challenge.game;
}

function getChallengePlatformLabel(challenge: MatchChallenge) {
  return PLATFORMS[challenge.platform as PlatformKey]?.label ?? challenge.platform;
}

function normalizeFeedHref(href?: string | null) {
  if (!href) {
    return null;
  }

  return href === '/notifications' ? '/feed' : href;
}

function getNotificationPresentation(notification: Notification): Omit<FeedItem, 'createdAt' | 'id' | 'kind'> {
  switch (notification.type) {
    case 'challenge_received':
    case 'challenge_sent':
    case 'challenge_accepted':
    case 'challenge_declined':
    case 'challenge_cancelled':
      return {
        actorHandle: '@callouts',
        actorInitial: 'C',
        actorLabel: 'Challenge desk',
        accent: 'coral',
        actionLabel: notification.href ? 'Open challenge' : undefined,
        body: notification.body,
        eyebrow: 'Direct challenge',
        filter: 'challenges',
        href: normalizeFeedHref(notification.href),
        icon: Swords,
        metadataLabel: 'Heads-up',
        notification,
        statusLabel: 'Callout',
        title: notification.title,
      };
    case 'match_found':
      return {
        actorHandle: '@matchmaking',
        actorInitial: 'Q',
        actorLabel: 'Queue desk',
        accent: 'teal',
        actionLabel: notification.href ? 'Open match' : undefined,
        body: notification.body,
        eyebrow: 'Queue pulse',
        filter: 'matches',
        href: normalizeFeedHref(notification.href),
        icon: Radio,
        metadataLabel: 'Live now',
        notification,
        statusLabel: 'Match found',
        title: notification.title,
      };
    case 'match_chat_message':
      return {
        actorHandle: '@ringchat',
        actorInitial: 'M',
        actorLabel: 'Match chat',
        accent: 'blue',
        actionLabel: notification.href ? 'Reply in chat' : undefined,
        body: notification.body,
        eyebrow: 'Live match',
        filter: 'matches',
        href: normalizeFeedHref(notification.href),
        icon: MessageCircle,
        metadataLabel: 'Message',
        notification,
        statusLabel: 'Chat',
        title: notification.title,
      };
    case 'match_disputed':
      return {
        actorHandle: '@fairplay',
        actorInitial: 'R',
        actorLabel: 'Review desk',
        accent: 'amber',
        actionLabel: notification.href ? 'Review match' : undefined,
        body: notification.body,
        eyebrow: 'Needs review',
        filter: 'matches',
        href: normalizeFeedHref(notification.href),
        icon: ShieldAlert,
        metadataLabel: 'Dispute',
        notification,
        statusLabel: 'Review',
        title: notification.title,
      };
    case 'match_reported':
    case 'match_completed':
      return {
        actorHandle: '@results',
        actorInitial: 'R',
        actorLabel: 'Result desk',
        accent: 'teal',
        actionLabel: notification.href ? 'Open result' : undefined,
        body: notification.body,
        eyebrow: 'Result locked',
        filter: 'matches',
        href: normalizeFeedHref(notification.href),
        icon: BellRing,
        metadataLabel: 'Results',
        notification,
        statusLabel: 'Resolved',
        title: notification.title,
      };
    case 'tournament_joined':
    case 'tournament_player_joined':
    case 'tournament_started':
      return {
        actorHandle: '@brackets',
        actorInitial: 'T',
        actorLabel: 'Bracket desk',
        accent: 'blue',
        actionLabel: notification.href ? 'Open bracket' : undefined,
        body: notification.body,
        eyebrow: 'Tournament movement',
        filter: 'tournaments',
        href: normalizeFeedHref(notification.href),
        icon: Trophy,
        metadataLabel: 'Bracket',
        notification,
        statusLabel: 'Bracket',
        title: notification.title,
      };
    case 'bounty_won':
    default:
      return {
        actorHandle: '@system',
        actorInitial: 'S',
        actorLabel: 'System lane',
        accent: 'teal',
        actionLabel: notification.href ? 'Open update' : undefined,
        body: notification.body,
        eyebrow: 'System update',
        filter: 'system',
        href: normalizeFeedHref(notification.href),
        icon: Sparkles,
        metadataLabel: 'System',
        notification,
        statusLabel: 'Update',
        title: notification.title,
      };
  }
}

function buildFeedItems(
  inboundChallenges: MatchChallenge[],
  outboundChallenges: MatchChallenge[],
  notifications: Notification[]
) {
  const hiddenNotificationTypes = new Set(['challenge_received', 'challenge_sent']);
  const challengeItems: FeedItem[] = [
    ...inboundChallenges.map<FeedItem>((challenge) => {
      const challengerName = challenge.challenger?.username ?? 'A player';

      return {
        actorHandle: getHandleFromLabel(challengerName, 'player'),
        actorInitial: getInitial(challengerName),
        actorLabel: challengerName,
        accent: 'coral',
        body:
          challenge.message ??
          'Accept to open a live match room right away, or decline and keep your lane clean.',
        challenge,
        createdAt: challenge.created_at,
        eyebrow: 'Direct challenge',
        filter: 'challenges',
        href: null,
        icon: Swords,
        id: `inbound-${challenge.id}`,
        kind: 'challenge_inbound',
        metadataLabel: `${getChallengeGameLabel(challenge)} · ${getChallengePlatformLabel(challenge)}`,
        statusLabel: 'Reply needed',
        title: `Wants a ${getChallengeGameLabel(challenge)} match on ${getChallengePlatformLabel(challenge)}.`,
      };
    }),
    ...outboundChallenges.map<FeedItem>((challenge) => {
      const opponentName = challenge.opponent?.username ?? 'your opponent';

      return {
        actorHandle: getHandleFromLabel(opponentName, 'opponent'),
        actorInitial: getInitial(opponentName),
        actorLabel: opponentName,
        accent: 'teal',
        body:
          challenge.message ??
          'Your challenge is still live. Cancel it if you want to free up the lane and call someone else out.',
        challenge,
        createdAt: challenge.created_at,
        eyebrow: 'Outbound challenge',
        filter: 'challenges',
        href: null,
        icon: Clock3,
        id: `outbound-${challenge.id}`,
        kind: 'challenge_outbound',
        metadataLabel: `Expires ${formatAbsoluteTime(challenge.expires_at)}`,
        statusLabel: 'Pending reply',
        title: `Waiting on ${opponentName} to answer your ${getChallengeGameLabel(challenge)} callout.`,
      };
    }),
  ];

  const notificationItems = notifications
    .filter((notification) => !hiddenNotificationTypes.has(notification.type))
    .map((notification) => {
      const presentation = getNotificationPresentation(notification);

      return {
        ...presentation,
        createdAt: notification.created_at,
        id: notification.id,
        kind: 'notification' as const,
      };
    });

  return [...challengeItems, ...notificationItems].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function getSignalLabel(feedCount: number, pendingChallenges: number, reviewSignals: number) {
  if (reviewSignals > 0 || pendingChallenges > 2) {
    return { label: 'Hot', tone: 'text-[var(--brand-coral)]' };
  }

  if (feedCount > 5 || pendingChallenges > 0) {
    return { label: 'Active', tone: 'text-[var(--accent-secondary-text)]' };
  }

  return { label: 'Calm', tone: 'text-[var(--text-primary)]' };
}

export function ReviewFeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<NotificationProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inboundChallenges, setInboundChallenges] = useState<MatchChallenge[]>([]);
  const [outboundChallenges, setOutboundChallenges] = useState<MatchChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadFeed = useCallback(async () => {
    setLoading(true);

    try {
      const [profileRes, notificationsRes, challengesRes] = await Promise.all([
        authFetch('/api/users/profile'),
        authFetch('/api/notifications'),
        authFetch('/api/challenges'),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile as NotificationProfile);
      }

      if (notificationsRes.ok) {
        const notificationsData = (await notificationsRes.json()) as {
          notifications?: Notification[];
          unreadCount?: number;
        };
        const nextNotifications = notificationsData.notifications ?? [];
        const nextUnreadCount = notificationsData.unreadCount ?? 0;

        setNotifications(nextNotifications);
        setUnreadCount(nextUnreadCount);

        if (nextUnreadCount > 0) {
          void authFetch('/api/notifications', { method: 'PATCH' }).then(() => {
            emitNotificationRefresh();
          });
        }
      }

      if (challengesRes.ok) {
        const challengeData = (await challengesRes.json()) as {
          inbound?: MatchChallenge[];
          outbound?: MatchChallenge[];
        };

        setInboundChallenges(challengeData.inbound ?? []);
        setOutboundChallenges(challengeData.outbound ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const handleChallengeAction = useCallback(
    async (challengeId: string, action: 'accept' | 'decline' | 'cancel') => {
      setActionId(`${challengeId}:${action}`);

      try {
        const res = await authFetch(`/api/challenges/${challengeId}/${action}`, {
          method: 'POST',
        });
        const data = (await res.json()) as { error?: string; match_id?: string };

        if (!res.ok) {
          toast.error(data.error ?? 'Could not update challenge');
          return;
        }

        emitNotificationRefresh();
        await loadFeed();

        if (action === 'accept' && data.match_id) {
          toast.success('Challenge accepted. Match is live.');
          router.push(`/match/${data.match_id}`);
          return;
        }

        if (action === 'decline') {
          toast.success('Challenge declined');
          return;
        }

        if (action === 'cancel') {
          toast.success('Challenge cancelled');
        }
      } catch {
        toast.error('Network error');
      } finally {
        setActionId(null);
      }
    },
    [authFetch, loadFeed, router]
  );

  const whatsappNumber = profile?.whatsapp_number ?? user?.whatsapp_number ?? null;
  const whatsappEnabled = Boolean(
    profile?.whatsapp_notifications ?? user?.whatsapp_notifications ?? whatsappNumber
  );

  const feedItems = buildFeedItems(inboundChallenges, outboundChallenges, notifications);
  const filteredItems =
    selectedFilter === 'all' ? feedItems : feedItems.filter((item) => item.filter === selectedFilter);
  const pendingChallenges = inboundChallenges.length;
  const reviewSignals = notifications.filter((item) => item.type === 'match_disputed').length;
  const signal = getSignalLabel(feedItems.length, pendingChallenges, reviewSignals);

  return (
    <div className="page-container space-y-5">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-title">Review feed</p>
            <h1 className="mt-3 text-[1.7rem] font-black leading-[1.02] text-[var(--text-primary)] sm:text-[2.35rem]">
              A Twitter-style lane for challenges, match updates, and bracket movement.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Scan the timeline, handle direct calls inline, and catch anything that needs review
              without bouncing between separate inbox screens.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]',
                signal.label === 'Hot'
                  ? 'border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.1)] text-[var(--brand-coral)]'
                  : 'border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.1)] text-[var(--accent-secondary-text)]'
              )}
            >
              <Flame size={14} />
              {signal.label} lane
            </div>
            <Link href="/profile" className="btn-outline min-h-10 px-3 py-2 text-xs">
              Manage alerts
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              Needs you
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{pendingChallenges}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Pending challenge replies waiting on your next move.
            </p>
          </div>
          <div className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              Review signals
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{reviewSignals}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              Match disputes or edge cases that could need a closer look.
            </p>
          </div>
          <div className="rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              Backup channel
            </p>
            <p className="mt-2 text-xl font-black text-[var(--text-primary)]">
              {whatsappEnabled ? 'WhatsApp live' : 'In-app only'}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {whatsappEnabled
                ? whatsappNumber || 'Your number is ready for fallback alerts.'
                : 'Turn on phone alerts if you want a backup lane outside the app.'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[16rem_minmax(0,1fr)_16rem]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-title">Lane pulse</p>
                <h2 className="mt-2 text-lg font-black text-[var(--text-primary)]">What changed</h2>
              </div>
              <span className="brand-chip px-2.5 py-1">{feedItems.length} cards</span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Unread on entry',
                  value: unreadCount,
                  helper: 'Fresh updates found before this page marked them read.',
                },
                {
                  label: 'Calls waiting',
                  value: pendingChallenges,
                  helper: 'Inbound direct challenges that still need an answer.',
                },
                {
                  label: 'Replying lanes',
                  value: outboundChallenges.length,
                  helper: 'Challenges you sent that are still waiting on the other player.',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{item.value}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <p className="section-title">Filters</p>
            <div className="mt-3 space-y-2">
              {FILTERS.map((filter) => {
                const count =
                  filter.key === 'all'
                    ? feedItems.length
                    : feedItems.filter((item) => item.filter === filter.key).length;
                const isActive = selectedFilter === filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setSelectedFilter(filter.key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[0.95rem] border px-3 py-2.5 text-left text-sm transition-colors',
                      isActive
                        ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] text-[var(--text-primary)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                    aria-pressed={isActive}
                  >
                    <span className="font-semibold">{filter.label}</span>
                    <span className="text-xs font-black">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="card mb-4 overflow-hidden p-3">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {FILTERS.map((filter) => {
                const count =
                  filter.key === 'all'
                    ? feedItems.length
                    : feedItems.filter((item) => item.filter === filter.key).length;
                const isActive = selectedFilter === filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setSelectedFilter(filter.key)}
                    className={cn(
                      'flex-shrink-0 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                      isActive
                        ? 'border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.1)] text-[var(--brand-coral)]'
                        : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:text-[var(--text-primary)]'
                    )}
                    aria-pressed={isActive}
                  >
                    {filter.shortLabel} · {count}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <>
                <div className="h-40 shimmer rounded-[1.25rem]" />
                <div className="h-40 shimmer rounded-[1.25rem]" />
                <div className="h-40 shimmer rounded-[1.25rem]" />
              </>
            ) : filteredItems.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-base font-black text-[var(--text-primary)]">
                  No {selectedFilter === 'all' ? 'feed' : selectedFilter} activity yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Try another filter, or keep playing and this lane will start filling with live
                  match movement.
                </p>
                {selectedFilter !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedFilter('all')}
                    className="btn-outline mt-4 min-h-10 px-3 py-2 text-xs"
                  >
                    Show everything
                  </button>
                ) : null}
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const accent = ACCENT_STYLES[item.accent];
                const absoluteTime = formatAbsoluteTime(item.createdAt);
                const relativeTime = formatRelativeTime(item.createdAt);
                const pendingAccept =
                  item.kind === 'challenge_inbound' && actionId === `${item.challenge?.id}:accept`;
                const pendingDecline =
                  item.kind === 'challenge_inbound' && actionId === `${item.challenge?.id}:decline`;
                const pendingCancel =
                  item.kind === 'challenge_outbound' && actionId === `${item.challenge?.id}:cancel`;

                return (
                  <article
                    key={item.id}
                    className={cn(
                      'feed-card group relative overflow-hidden rounded-[1.35rem] border bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] p-4 sm:p-5',
                      accent.border
                    )}
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r', accent.rail)} />

                    <div className="flex items-start gap-3.5">
                      <div className="relative">
                        <div
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-2xl border text-base font-black',
                            accent.avatar
                          )}
                        >
                          {item.actorInitial}
                        </div>
                        <div
                          className={cn(
                            'absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--surface-strong)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
                          )}
                        >
                          <item.icon size={12} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-black text-[var(--text-primary)]">
                                {item.actorLabel}
                              </p>
                              <p className="text-xs text-[var(--text-soft)]">{item.actorHandle}</p>
                              <p
                                className="text-xs text-[var(--text-soft)]"
                                title={absoluteTime}
                              >
                                · {relativeTime}
                              </p>
                            </div>
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                              {item.eyebrow}
                            </p>
                          </div>

                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                              accent.chip
                            )}
                          >
                            {item.statusLabel}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-black text-[var(--text-primary)]">{item.title}</h3>

                        {item.body ? (
                          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                        ) : null}

                        {item.metadataLabel ? (
                          <div className="mt-3">
                            <span className="brand-chip px-2.5 py-1 text-[10px]">{item.metadataLabel}</span>
                          </div>
                        ) : null}

                        {item.kind === 'challenge_inbound' && item.challenge ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleChallengeAction(item.challenge!.id, 'accept')}
                              disabled={pendingAccept || pendingDecline}
                              className="btn-primary min-h-10 px-3 py-2 text-xs"
                            >
                              {pendingAccept ? 'Accepting...' : 'Accept challenge'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleChallengeAction(item.challenge!.id, 'decline')}
                              disabled={pendingAccept || pendingDecline}
                              className="btn-danger min-h-10 px-3 py-2 text-xs"
                            >
                              {pendingDecline ? 'Declining...' : 'Decline'}
                            </button>
                          </div>
                        ) : null}

                        {item.kind === 'challenge_outbound' && item.challenge ? (
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => void handleChallengeAction(item.challenge!.id, 'cancel')}
                              disabled={pendingCancel}
                              className="btn-outline min-h-10 px-3 py-2 text-xs"
                            >
                              {pendingCancel ? 'Cancelling...' : 'Cancel callout'}
                            </button>
                          </div>
                        ) : null}

                        {item.kind === 'notification' && item.href ? (
                          <div className="mt-4">
                            <Link
                              href={item.href}
                              className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]"
                            >
                              {item.actionLabel ?? 'Open update'}
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="card p-4">
            <p className="section-title">Quick jumps</p>
            <div className="mt-3 space-y-2">
              {[
                {
                  href: '/queue',
                  label: 'Open queue',
                  helper: 'Jump back into ranked search.',
                  icon: Radio,
                },
                {
                  href: '/tournaments',
                  label: 'Open brackets',
                  helper: 'Check what is moving in tournaments.',
                  icon: Trophy,
                },
                {
                  href: '/leaderboard',
                  label: 'Scan ladder',
                  helper: 'Find players to call out next.',
                  icon: Flame,
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3.5 py-3 transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] text-[var(--accent-secondary-text)]">
                    <item.icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[var(--text-primary)]">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{item.helper}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] text-[var(--accent-secondary-text)]">
                <Smartphone size={16} />
              </div>
              <div>
                <p className="text-sm font-black text-[var(--text-primary)]">Phone fallback</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  {whatsappEnabled
                    ? 'WhatsApp backup is active for critical match moments.'
                    : 'You are only using the in-app lane right now.'}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Status
                </span>
                <span className="text-sm font-black text-[var(--text-primary)]">
                  {whatsappEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Number
                </span>
                <span className="truncate text-right text-sm font-semibold text-[var(--text-primary)]">
                  {whatsappNumber || 'Not added'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/profile" className="btn-outline min-h-10 px-3 py-2 text-xs">
                Profile settings
              </Link>
              {WHATSAPP_JOIN_URL ? (
                <a
                  href={WHATSAPP_JOIN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost min-h-10 px-3 py-2 text-xs"
                >
                  Open WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        @keyframes feed-card-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }

          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .feed-card {
          opacity: 0;
          animation: feed-card-in 220ms ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .feed-card {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
