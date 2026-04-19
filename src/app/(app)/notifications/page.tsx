'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  BellRing,
  ChevronRight,
  Clock3,
  MessageCircle,
  Smartphone,
  Swords,
  Trophy,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { ChallengesPanel } from '@/components/ChallengesPanel';
import { emitNotificationRefresh } from '@/components/NotificationNavButton';
import type { MatchChallenge, Notification } from '@/types';

type NotificationProfile = {
  username?: string;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean;
};

const WHATSAPP_JOIN_URL = process.env.NEXT_PUBLIC_WHATSAPP_JOIN_URL ?? '';

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [profile, setProfile] = useState<NotificationProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inboundChallenges, setInboundChallenges] = useState<MatchChallenge[]>([]);
  const [outboundChallenges, setOutboundChallenges] = useState<MatchChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
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
        setNotifications(nextNotifications);

        if ((notificationsData.unreadCount ?? 0) > 0) {
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
    void loadInbox();
  }, [loadInbox]);

  const whatsappNumber = profile?.whatsapp_number ?? user?.whatsapp_number ?? null;
  const whatsappEnabled = Boolean(
    profile?.whatsapp_notifications ?? user?.whatsapp_notifications ?? whatsappNumber
  );

  const handleChallengeAction = async (
    challengeId: string,
    action: 'accept' | 'decline' | 'cancel'
  ) => {
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
      await loadInbox();

      if (action === 'accept' && data.match_id) {
        toast.success('Challenge accepted. Match is live.');
        router.push(`/match/${data.match_id}`);
        return;
      }

      if (action === 'decline') {
        toast.success('Challenge declined');
      } else if (action === 'cancel') {
        toast.success('Challenge cancelled');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="page-container">
      <section className="card circuit-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Notifications Center</p>
            <h1 className="mt-3 text-[1.5rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Every app alert and WhatsApp backup now lives here.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              This page owns your match alerts now. Challenges, bracket movement, result reminders, and WhatsApp
              fallback all stay here instead of crowding the home dashboard.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(50,224,196,0.2)] bg-[rgba(50,224,196,0.12)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
            <BellRing size={14} />
            {whatsappEnabled ? 'Inbox + WhatsApp live' : 'Inbox only'}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                <MessageCircle size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Alert channel
                </p>
                <p className="mt-1 text-base font-black text-[var(--text-primary)]">WhatsApp notifications</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {whatsappEnabled
                    ? 'Queue, challenge, and match updates can still hit your phone when you step away from the app.'
                    : 'Turn WhatsApp alerts on in profile if you want a phone-first backup channel for your matches.'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Status
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                  {whatsappEnabled ? 'ON' : 'OFF'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                  Number
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                  {whatsappNumber || 'Not added yet'}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/profile" className="btn-primary shadow-none">
                Manage alerts
                <ChevronRight size={15} />
              </Link>
              {WHATSAPP_JOIN_URL ? (
                <a href={WHATSAPP_JOIN_URL} target="_blank" rel="noreferrer" className="btn-ghost">
                  Open WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3">
            {[
              {
                icon: Swords,
                title: `${inboundChallenges.length} pending challenges`,
                copy: inboundChallenges.length
                  ? 'Accept or decline direct 1-on-1 calls from here.'
                  : 'No one is waiting on your reply right now.',
              },
              {
                icon: Trophy,
                title: `${notifications.length} recent updates`,
                copy: notifications.length
                  ? 'Tournament joins, match locks, and disputes all stack here.'
                  : 'Your activity feed will start filling up as you play.',
              },
              {
                icon: Smartphone,
                title: whatsappEnabled ? 'WhatsApp alerts ready' : 'Phone alerts off',
                copy: whatsappEnabled
                  ? 'Your notifications page and your phone are now working as one alert lane.'
                  : 'Your app inbox is live. Add WhatsApp if you want backup pings too.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.05rem] border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]">
                    <item.icon size={15} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
        <div className="space-y-5">
          <ChallengesPanel
            inboundChallenges={inboundChallenges}
            outboundChallenges={outboundChallenges}
            loading={loading}
            actionId={actionId}
            onAction={handleChallengeAction}
          />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Activity Feed</p>
              <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Recent updates</h2>
            </div>
            <span className="brand-chip-coral px-3 py-1">{notifications.length} items</span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <>
                <div className="h-20 shimmer" />
                <div className="h-20 shimmer" />
                <div className="h-20 shimmer" />
              </>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-sm text-[var(--text-secondary)]">
                No updates yet. Once matches, tournaments, and challenges start moving, this feed will stop being quiet.
              </div>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]">
                      {item.type.includes('challenge') ? (
                        <Swords size={16} />
                      ) : item.type === 'match_chat_message' ? (
                        <MessageCircle size={16} />
                      ) : item.type.includes('tournament') ? (
                        <Trophy size={16} />
                      ) : (
                        <Clock3 size={16} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                        <p className="text-xs text-[var(--text-soft)]">{formatTimestamp(item.created_at)}</p>
                      </div>
                      {item.body ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                      ) : null}
                      {item.href ? (
                        <div className="mt-3">
                          <Link href={item.href} className="brand-link-coral inline-flex min-h-10 items-center text-xs font-semibold uppercase tracking-[0.14em]">
                            Open
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
