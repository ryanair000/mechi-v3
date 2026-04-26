'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpRight, Inbox, Loader2, Lock, RefreshCw, Send } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS } from '@/lib/config';
import type {
  GameKey,
  MatchChatMessage,
  MatchChatThreadState,
  MatchStatus,
  PlatformKey,
} from '@/types';

type InboxThread = {
  id: string;
  match_id: string;
  game: GameKey;
  platform?: PlatformKey | null;
  status: MatchStatus;
  can_reply: boolean;
  activity_at: string;
  unread_count: number;
  preview: string;
  opponent: {
    id: string;
    username: string;
    avatar_url?: string | null;
  };
};

const QUICK_REPLIES = ["I'm here", 'Send room code', 'Ready in 2 mins'] as const;

function formatThreadTime(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitial(value?: string | null) {
  return value?.trim().charAt(0).toUpperCase() || '?';
}

function getSenderLabel(message: MatchChatMessage, currentUserId: string, opponentUsername: string) {
  if (message.sender_type === 'system') {
    return 'Mechi';
  }

  if (message.sender_type === 'admin') {
    return message.sender?.username ?? 'Admin';
  }

  return message.sender_user_id === currentUserId
    ? 'You'
    : message.sender?.username ?? opponentUsername;
}

export default function InboxPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [requestedMatchId, setRequestedMatchId] = useState<string | null>(null);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [chatState, setChatState] = useState<MatchChatThreadState | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  );

  const loadThreads = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setThreadsLoading(true);
      }

      try {
        const res = await authFetch('/api/inbox');
        const data = (await res.json()) as { error?: string; threads?: InboxThread[] };

        if (!res.ok) {
          toast.error(data.error ?? 'Could not load inbox');
          return;
        }

        const nextThreads = data.threads ?? [];
        setThreads(nextThreads);
        setSelectedThreadId((current) => {
          if (requestedMatchId && nextThreads.some((thread) => thread.id === requestedMatchId)) {
            return requestedMatchId;
          }

          if (current && nextThreads.some((thread) => thread.id === current)) {
            return current;
          }

          return nextThreads[0]?.id ?? null;
        });
      } catch {
        toast.error('Could not load inbox');
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setThreadsLoading(false);
        }
      }
    },
    [authFetch, requestedMatchId]
  );

  const loadMessages = useCallback(
    async (matchId: string) => {
      setChatLoading(true);

      try {
        const res = await authFetch(`/api/matches/${matchId}/chat`);
        const data = (await res.json()) as {
          error?: string;
          messages?: MatchChatMessage[];
          state?: MatchChatThreadState;
        };

        if (!res.ok) {
          toast.error(data.error ?? 'Could not load messages');
          return;
        }

        setMessages(data.messages ?? []);
        setChatState(data.state ?? null);
        void loadThreads({ silent: true });
      } catch {
        toast.error('Could not load messages');
      } finally {
        setChatLoading(false);
      }
    },
    [authFetch, loadThreads]
  );

  useEffect(() => {
    setRequestedMatchId(new URLSearchParams(window.location.search).get('match'));
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      setChatState(null);
      return;
    }

    void loadMessages(selectedThreadId);
  }, [loadMessages, selectedThreadId]);

  const sendMessage = useCallback(
    async (message: string, messageType: 'text' | 'quick_reply' = 'text') => {
      const trimmedMessage = message.trim();
      if (!selectedThread || !trimmedMessage || !selectedThread.can_reply) {
        return;
      }

      setSending(true);
      try {
        const res = await authFetch(`/api/matches/${selectedThread.match_id}/chat`, {
          method: 'POST',
          body: JSON.stringify({
            message: trimmedMessage,
            message_type: messageType,
          }),
        });
        const data = (await res.json()) as { error?: string; message?: MatchChatMessage };

        if (!res.ok || !data.message) {
          toast.error(data.error ?? 'Could not send message');
          return;
        }

        setMessages((current) => [...current, data.message as MatchChatMessage]);
        setMessageInput('');
        void loadMessages(selectedThread.match_id);
      } catch {
        toast.error('Could not send message');
      } finally {
        setSending(false);
      }
    },
    [authFetch, loadMessages, selectedThread]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(messageInput);
  };

  return (
    <div className="page-container max-w-[72rem]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Inbox size={20} className="text-[var(--accent-secondary-text)]" />
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)]">Inbox</h1>
            <p className="text-sm text-[var(--text-secondary)]">Match conversations between gamers.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadThreads({ silent: true })}
          disabled={threadsLoading || refreshing}
          className="icon-button h-9 w-9"
          aria-label="Refresh inbox"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
        </button>
      </div>

      <section className="card overflow-hidden">
        <div className="grid min-h-[34rem] lg:grid-cols-[19rem_1fr]">
          <aside className="border-b border-[var(--border-color)] lg:border-b-0 lg:border-r">
            {threadsLoading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-16 rounded-md shimmer" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-5 text-sm text-[var(--text-secondary)]">
                No conversations yet. Start a match to open a gamer chat.
              </div>
            ) : (
              <div className="max-h-[34rem] overflow-y-auto">
                {threads.map((thread) => {
                  const active = thread.id === selectedThreadId;
                  const gameLabel = GAMES[thread.game]?.label ?? thread.game;
                  const platformLabel = thread.platform
                    ? PLATFORMS[thread.platform]?.label ?? thread.platform
                    : null;

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`flex w-full gap-3 border-b border-[var(--border-color)] px-4 py-3 text-left transition-colors last:border-0 ${
                        active
                          ? 'bg-[rgba(50,224,196,0.08)]'
                          : 'hover:bg-[var(--surface-elevated)]'
                      }`}
                    >
                      <span className="avatar-shell flex h-9 w-9 shrink-0 items-center justify-center text-xs font-black">
                        {getInitial(thread.opponent.username)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-[var(--text-primary)]">
                            {thread.opponent.username}
                          </span>
                          {thread.unread_count > 0 ? (
                            <span className="rounded-full bg-[var(--brand-coral)] px-1.5 py-0.5 text-[10px] font-black text-white">
                              {thread.unread_count}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block truncate text-xs text-[var(--text-secondary)]">
                          {thread.preview}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                          <span>{gameLabel}</span>
                          {platformLabel ? <span>{platformLabel}</span> : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="flex min-h-[34rem] flex-col">
            {selectedThread && user ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--text-primary)]">
                      {selectedThread.opponent.username}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-soft)]">
                      {GAMES[selectedThread.game]?.label ?? selectedThread.game} ·{' '}
                      {selectedThread.status}
                      {chatState?.latest_message_at
                        ? ` · ${formatThreadTime(chatState.latest_message_at)}`
                        : ''}
                    </p>
                  </div>
                  <Link
                    href={`/match/${selectedThread.match_id}`}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-[var(--border-color)] px-3 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
                  >
                    Match
                    <ArrowUpRight size={13} />
                  </Link>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {chatLoading ? (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--text-soft)]">
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-[var(--text-secondary)]">
                      No messages yet.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const mine = message.sender_user_id === user.id;
                      const system = message.sender_type === 'system';
                      const senderLabel = getSenderLabel(message, user.id, selectedThread.opponent.username);

                      return (
                        <div
                          key={message.id}
                          className={`flex ${system ? 'justify-center' : mine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[86%] rounded-md px-3 py-2 ${
                              system
                                ? 'border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] text-center'
                                : mine
                                  ? 'bg-[rgba(255,107,107,0.14)]'
                                  : 'border border-[var(--border-color)] bg-[var(--surface-elevated)]'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.12em] text-[var(--text-soft)]">
                              <span>{senderLabel}</span>
                              <span>{formatMessageTime(message.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-primary)]">
                              {message.body}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-[var(--border-color)] p-3">
                  {selectedThread.can_reply ? (
                    <form onSubmit={handleSubmit} className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {QUICK_REPLIES.map((reply) => (
                          <button
                            key={reply}
                            type="button"
                            onClick={() => void sendMessage(reply, 'quick_reply')}
                            disabled={sending}
                            className="rounded-md border border-[var(--border-color)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={messageInput}
                          onChange={(event) => setMessageInput(event.target.value)}
                          placeholder={`Message ${selectedThread.opponent.username}`}
                          className="input h-10 flex-1"
                          maxLength={280}
                        />
                        <button
                          type="submit"
                          disabled={sending || !messageInput.trim()}
                          className="btn-primary h-10 px-3"
                          aria-label="Send message"
                        >
                          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                          Send
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Lock size={15} />
                      This match is closed, so the conversation is read-only.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[var(--text-secondary)]">
                Select a conversation to start.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
