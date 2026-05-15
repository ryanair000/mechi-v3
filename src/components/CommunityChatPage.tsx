'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Megaphone, MessageCircle, RefreshCw } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import type { CommunityMessage, CommunityRoomResponse } from '@/types';

const COMMUNITY_MESSAGE_LIMIT = 80;
const COMMUNITY_POLL_INTERVAL_MS = 5000;

type AuthFetch = ReturnType<typeof useAuthFetch>;

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMuteUntil(value?: string | null) {
  if (!value) {
    return 'soon';
  }

  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function isFuture(value?: string | null) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

function getSenderLabel(message: CommunityMessage, currentUserId?: string | null) {
  if (message.sender_type === 'system') {
    return 'Mechi';
  }

  if (message.sender_user_id === currentUserId) {
    return 'You';
  }

  return message.sender?.username ?? 'Community';
}

async function fetchCommunityRoom(authFetch: AuthFetch) {
  const res = await authFetch(`/api/community/room?limit=${COMMUNITY_MESSAGE_LIMIT}`);
  const data = (await res.json()) as CommunityRoomResponse & { error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? 'Could not load community chat.');
  }

  return data;
}

export function CommunityChatPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [roomData, setRoomData] = useState<CommunityRoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [composerMode, setComposerMode] = useState<'text' | 'announcement'>('text');

  const canModerate = roomData?.can_moderate ?? false;
  const isLocked = Boolean(roomData?.room.is_locked);
  const isMuted = isFuture(roomData?.state.mute_until);
  const messages = roomData?.messages ?? [];
  const pinnedMessage = roomData?.pinned_message ?? null;
  const mutedMembers = roomData?.muted_members ?? [];
  const memberCount = roomData?.member_count ?? 0;

  const canSend =
    messageInput.trim().length > 0 &&
    !sending &&
    (!isLocked || canModerate) &&
    !isMuted;

  useEffect(() => {
    if (!canModerate && composerMode !== 'text') {
      setComposerMode('text');
    }
  }, [canModerate, composerMode]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages.length, pinnedMessage?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadRoom = async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const data = await fetchCommunityRoom(authFetch);
        if (!cancelled) {
          setRoomData(data);
        }
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : 'Could not load community chat.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void loadRoom();
    const intervalId = window.setInterval(() => {
      void loadRoom({ silent: true });
    }, COMMUNITY_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authFetch]);

  async function handleRefresh() {
    try {
      setRefreshing(true);
      const data = await fetchCommunityRoom(authFetch);
      setRoomData(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not refresh community.');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    setSending(true);
    try {
      const res = await authFetch('/api/community/room', {
        method: 'POST',
        body: JSON.stringify({
          message: messageInput.trim(),
          message_type: composerMode,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? 'Could not send message.');
      }

      setMessageInput('');
      const nextRoom = await fetchCommunityRoom(authFetch);
      setRoomData(nextRoom);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-container max-w-[72rem] space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Community</p>
            <h1 className="mt-3 text-[1.75rem] font-black leading-[1.02] text-[var(--text-primary)] sm:text-[2.2rem]">
              Mechi Community
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              One live room for the signed-in Mechi crowd. Talk like a shared squad chat, line up
              challenges, call for games, and keep match-night comms in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/challenges" className="btn-outline h-10 px-3 text-xs font-black uppercase tracking-[0.12em]">
              Challenges
            </Link>
            <Link href="/leaderboard" className="btn-outline h-10 px-3 text-xs font-black uppercase tracking-[0.12em]">
              Leaderboard
            </Link>
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">
                {isLocked ? 'Read only' : 'Live'}
              </span>
              <span className="text-[var(--text-soft)]">|</span>
              <span>{memberCount} joined</span>
            </div>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={loading || refreshing}
              className="icon-button h-10 w-10"
              aria-label="Refresh community"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : undefined} />
            </button>
          </div>
        </div>
      </section>

      {isLocked ? (
        <section className="rounded-[var(--radius-panel)] border border-[rgba(255,184,107,0.28)] bg-[rgba(255,184,107,0.12)] px-5 py-4">
          <p className="text-sm font-black text-[var(--text-primary)]">Community is in read-only mode</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Moderators can still post updates, but everyone else is temporarily locked from sending.
          </p>
        </section>
      ) : null}

      {isMuted ? (
        <section className="rounded-[var(--radius-panel)] border border-[rgba(255,92,119,0.3)] bg-[rgba(255,92,119,0.1)] px-5 py-4">
          <p className="text-sm font-black text-[var(--text-primary)]">You are muted in community</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            You can still read the room. Posting unlocks after {formatMuteUntil(roomData?.state.mute_until)}.
          </p>
        </section>
      ) : null}

      {pinnedMessage ? (
        <section className="rounded-[var(--radius-panel)] border border-[rgba(255,209,102,0.28)] bg-[rgba(255,209,102,0.1)] px-5 py-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--brand-gold)]">
            Pinned message
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {getSenderLabel(pinnedMessage, user?.id)} | {formatMessageTime(pinnedMessage.created_at)}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {pinnedMessage.is_deleted ? 'This pinned message was deleted.' : pinnedMessage.body}
          </p>
        </section>
      ) : null}

      {canModerate && mutedMembers.length > 0 ? (
        <section className="rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] px-5 py-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Muted users
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {mutedMembers.map((member) => (
              <div
                key={member.user.id}
                className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
              >
                <span className="font-semibold text-[var(--text-primary)]">
                  {member.user.username}
                </span>{' '}
                until {formatMuteUntil(member.muted_until)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <MessageCircle size={18} className="text-[var(--accent-secondary-text)]" />
            <div>
              <p className="text-sm font-black text-[var(--text-primary)]">
                {roomData?.room.name ?? 'Community'}
              </p>
              <p className="text-xs text-[var(--text-soft)]">
                {loading ? 'Opening room...' : 'Polling every 5 seconds'}
              </p>
            </div>
          </div>
          {canModerate && composerMode === 'announcement' ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,209,102,0.24)] bg-[rgba(255,209,102,0.1)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--brand-gold)]">
              <Megaphone size={12} />
              Announcement mode
            </div>
          ) : null}
        </div>

        <div ref={messagesRef} className="max-h-[34rem] space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-[var(--text-soft)]">
              <Loader2 size={16} className="mr-2 animate-spin" />
              Opening community...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-center text-sm text-[var(--text-soft)]">
              Start the room with a useful update, a match-night question, or a quick hello.
            </div>
          ) : (
            messages.map((message) => {
              if (message.sender_type === 'system') {
                return (
                  <div
                    key={message.id}
                    className="rounded-[var(--radius-card)] border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] px-4 py-3"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--accent-secondary-text)]">
                      Mechi update
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{message.body}</p>
                  </div>
                );
              }

              const mine = message.sender_user_id === user?.id;
              const announcement = message.message_type === 'announcement';

              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-[1.15rem] border px-4 py-3 ${
                      message.is_deleted
                        ? 'border-[var(--border-color)] bg-[var(--surface-elevated)]'
                        : announcement
                          ? 'border-[rgba(255,209,102,0.24)] bg-[rgba(255,209,102,0.1)]'
                          : mine
                            ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)]'
                            : 'border-[var(--border-color)] bg-[var(--surface-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-soft)]">
                        {getSenderLabel(message, user?.id)}
                      </p>
                      <p className="text-[11px] text-[var(--text-soft)]">
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                    <p
                      className={`mt-2 text-sm leading-6 ${
                        message.is_deleted
                          ? 'italic text-[var(--text-soft)]'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {message.is_deleted ? 'Message deleted by moderation.' : message.body}
                    </p>
                    {announcement ? (
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--brand-gold)]">
                        Announcement
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="card p-5">
        {canModerate ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { value: 'text' as const, label: 'Message' },
              { value: 'announcement' as const, label: 'Announcement' },
            ].map((option) => {
              const active = composerMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setComposerMode(option.value)}
                  className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                    active
                      ? 'border-[var(--brand-teal)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                      : 'border-[var(--border-color)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[var(--text-soft)]">
            {composerMode === 'announcement' ? 'Announcement' : 'Message'}
          </label>
          <textarea
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            maxLength={500}
            rows={4}
            placeholder={
              composerMode === 'announcement'
                ? 'Post a moderator announcement...'
                : 'Write to the Mechi community...'
            }
            className="w-full rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-soft)] focus:border-[var(--border-strong)]"
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--text-soft)]">
              {composerMode === 'announcement'
                ? 'Announcements are reserved for moderators and admins.'
                : isLocked && !canModerate
                  ? 'The room is locked for read-only mode.'
                  : isMuted
                    ? `You are muted until ${formatMuteUntil(roomData?.state.mute_until)}.`
                    : 'Keep it clean, concise, and useful.'}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[var(--text-soft)]">
                {messageInput.trim().length}/500
              </span>
              <button
                type="submit"
                disabled={!canSend}
                className="btn-primary inline-flex min-h-11 items-center justify-center px-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 size={15} className="mr-2 animate-spin" />
                    Sending...
                  </>
                ) : composerMode === 'announcement' ? (
                  'Post announcement'
                ) : (
                  'Send message'
                )}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
