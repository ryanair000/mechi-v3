'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Clock3,
  Link2,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Search,
  UserCheck,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import type {
  Profile,
  SupportMessage,
  SupportThread,
  SupportThreadPriority,
  SupportThreadStatus,
} from '@/types';

type SupportListResponse = {
  threads: SupportThread[];
  counts: Record<SupportThreadStatus, number>;
};

type SupportDetailResponse = {
  thread: SupportThread;
  messages: SupportMessage[];
  contactMatches: Array<
    Pick<Profile, 'id' | 'username' | 'phone' | 'whatsapp_number' | 'plan' | 'region'>
  >;
};

const STATUS_OPTIONS: Array<{ value: SupportThreadStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All threads' },
  { value: 'open', label: 'Open' },
  { value: 'waiting_on_ai', label: 'Waiting on AI' },
  { value: 'waiting_on_human', label: 'Waiting on human' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'blocked', label: 'Blocked' },
];

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusClass(status: SupportThreadStatus) {
  switch (status) {
    case 'open':
      return 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]';
    case 'waiting_on_ai':
      return 'bg-[rgba(96,165,250,0.14)] text-[#60A5FA]';
    case 'waiting_on_human':
      return 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]';
    case 'resolved':
      return 'bg-[rgba(34,197,94,0.14)] text-emerald-400';
    case 'blocked':
      return 'bg-[rgba(248,113,113,0.14)] text-red-400';
    default:
      return 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]';
  }
}

function priorityClass(priority: SupportThreadPriority) {
  switch (priority) {
    case 'urgent':
      return 'text-red-400';
    case 'high':
      return 'text-[var(--brand-coral)]';
    case 'normal':
      return 'text-[var(--brand-teal)]';
    case 'low':
    default:
      return 'text-[var(--text-soft)]';
  }
}

function channelClass(channel: SupportThread['channel']) {
  return channel === 'instagram'
    ? 'bg-[rgba(244,114,182,0.14)] text-pink-400'
    : 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]';
}

function channelLabel(channel: SupportThread['channel']) {
  return channel === 'instagram' ? 'Instagram' : 'WhatsApp';
}

function threadIdentity(thread: SupportThread) {
  return (
    thread.user?.username ??
    thread.contact_name ??
    thread.phone ??
    `${channelLabel(thread.channel)} user ${thread.wa_id}`
  );
}

function threadContactLine(thread: SupportThread) {
  if (thread.channel === 'instagram') {
    return thread.contact_name
      ? `@${thread.contact_name} | IG ${thread.wa_id}`
      : `Instagram sender ID ${thread.wa_id}`;
  }

  return `${thread.phone ?? 'No phone'} | WA ${thread.wa_id}`;
}

function latestPreview(thread: SupportThread) {
  const prefix =
    thread.latest_message?.sender_type === 'ai'
      ? 'AI'
      : thread.latest_message?.sender_type === 'admin'
        ? 'Admin'
        : thread.latest_message?.sender_type === 'system'
          ? 'System'
          : 'User';
  const body = thread.latest_message?.body?.trim() || 'No transcript yet.';
  return `${prefix}: ${body}`;
}

export default function SupportInboxClient() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [counts, setCounts] = useState<Record<SupportThreadStatus, number>>({
    open: 0,
    waiting_on_ai: 0,
    waiting_on_human: 0,
    resolved: 0,
    blocked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportDetailResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportThreadStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [relinkLookup, setRelinkLookup] = useState('');

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (query.trim()) params.set('q', query.trim());
      params.set('limit', '60');

      const response = await authFetch(`/api/admin/support?${params.toString()}`);
      const data = (await response.json()) as SupportListResponse & { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? 'Could not load support inbox');
        setThreads([]);
        return;
      }

      setThreads(data.threads ?? []);
      setCounts(
        data.counts ?? {
          open: 0,
          waiting_on_ai: 0,
          waiting_on_human: 0,
          resolved: 0,
          blocked: 0,
        }
      );
      setSelectedThreadId((current) => {
        if (current && (data.threads ?? []).some((thread) => thread.id === current)) {
          return current;
        }
        return data.threads?.[0]?.id ?? null;
      });
    } catch {
      toast.error('Network error while loading support inbox');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, query, statusFilter]);

  const fetchDetail = useCallback(
    async (threadId: string) => {
      setDetailLoading(true);
      try {
        const response = await authFetch(`/api/admin/support/${threadId}`);
        const data = (await response.json()) as SupportDetailResponse & { error?: string };
        if (!response.ok) {
          toast.error(data.error ?? 'Could not load thread');
          setDetail(null);
          return;
        }

        setDetail(data);
        setReply('');
        setRelinkLookup('');
      } catch {
        toast.error('Network error while loading thread');
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (selectedThreadId) {
      void fetchDetail(selectedThreadId);
    } else {
      setDetail(null);
    }
  }, [fetchDetail, selectedThreadId]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  );

  const runThreadAction = useCallback(
    async (
      action: 'assign' | 'unassign' | 'resolve' | 'reopen' | 'block' | 'relink',
      extra?: Record<string, unknown>
    ) => {
      if (!selectedThreadId) return;
      setActioning(action);
      try {
        const response = await authFetch(`/api/admin/support/${selectedThreadId}`, {
          method: 'PATCH',
          body: JSON.stringify({ action, ...(extra ?? {}) }),
        });
        const data = (await response.json()) as SupportDetailResponse & { error?: string };
        if (!response.ok) {
          toast.error(data.error ?? 'Could not update thread');
          return;
        }

        setDetail(data);
        await fetchThreads();
        toast.success('Thread updated');
      } catch {
        toast.error('Network error while updating thread');
      } finally {
        setActioning(null);
      }
    },
    [authFetch, fetchThreads, selectedThreadId]
  );

  const sendReply = useCallback(async () => {
    if (!selectedThreadId || !reply.trim()) return;
    setActioning('reply');
    try {
      const response = await authFetch(`/api/admin/support/${selectedThreadId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: reply.trim() }),
      });
      const data = (await response.json()) as SupportDetailResponse & { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? 'Could not send reply');
        return;
      }

      setDetail(data);
      setReply('');
      await fetchThreads();
      toast.success('Reply sent');
    } catch {
      toast.error('Network error while sending reply');
    } finally {
      setActioning(null);
    }
  }, [authFetch, fetchThreads, reply, selectedThreadId]);

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="brand-kicker">Support Inbox</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
              WhatsApp and Instagram conversations, AI handoffs, and human follow-through.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Every inbound Meta message lands here first, links to a Mechi player when possible, and
              either gets an AI answer or a clean handoff to the support lane.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-5">
            {(['open', 'waiting_on_ai', 'waiting_on_human', 'resolved', 'blocked'] as SupportThreadStatus[]).map(
              (status) => (
                <div
                  key={status}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    {status.replaceAll('_', ' ')}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                    {counts[status] ?? 0}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_auto]">
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              placeholder="Search phone, username, WhatsApp number, or transcript"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as SupportThreadStatus | 'all')}
            className="input"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => void fetchThreads()} className="btn-ghost whitespace-nowrap">
            <RefreshCcw size={14} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="card p-4">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
            <div>
              <p className="section-title">Threads</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Pick a conversation to review transcript, assignee, delivery state, and AI confidence.
              </p>
            </div>
            <span className="brand-chip px-3 py-1">{threads.length} loaded</span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <>
                <div className="h-28 shimmer rounded-3xl" />
                <div className="h-28 shimmer rounded-3xl" />
                <div className="h-28 shimmer rounded-3xl" />
              </>
            ) : threads.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 text-sm text-[var(--text-secondary)]">
                No support threads matched this filter yet.
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full rounded-3xl border p-4 text-left transition-colors ${
                    thread.id === selectedThreadId
                      ? 'border-[rgba(50,224,196,0.28)] bg-[rgba(50,224,196,0.08)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-elevated)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-[var(--text-primary)]">
                      {threadIdentity(thread)}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${channelClass(thread.channel)}`}>
                      {channelLabel(thread.channel)}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(thread.status)}`}>
                      {thread.status.replaceAll('_', ' ')}
                    </span>
                    <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${priorityClass(thread.priority)}`}>
                      {thread.priority}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {threadContactLine(thread)}
                    {thread.user?.plan ? ` | ${thread.user.plan}` : ''}
                    {thread.assignee?.username ? ` | assigned to ${thread.assignee.username}` : ' | unassigned'}
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {latestPreview(thread)}
                  </p>
                  <p className="mt-3 text-[11px] text-[var(--text-soft)]">
                    Updated {formatTimestamp(thread.last_message_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          {!selectedThread ? (
            <div className="flex min-h-[26rem] items-center justify-center rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-center">
              <div>
                <MessageCircle size={22} className="mx-auto text-[var(--text-soft)]" />
                <p className="mt-4 text-lg font-bold text-[var(--text-primary)]">Pick a support thread</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Once you choose a conversation, the transcript and action panel will show up here.
                </p>
              </div>
            </div>
          ) : detailLoading || !detail ? (
            <div className="space-y-3">
              <div className="h-24 shimmer rounded-3xl" />
              <div className="h-48 shimmer rounded-3xl" />
              <div className="h-32 shimmer rounded-3xl" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl font-black text-[var(--text-primary)]">
                        {threadIdentity(detail.thread)}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${channelClass(detail.thread.channel)}`}
                      >
                        {channelLabel(detail.thread.channel)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(detail.thread.status)}`}>
                        {detail.thread.status.replaceAll('_', ' ')}
                      </span>
                      <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${priorityClass(detail.thread.priority)}`}>
                        {detail.thread.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {threadContactLine(detail.thread)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      Last message {formatTimestamp(detail.thread.last_message_at)}
                      {detail.thread.last_ai_reply_at ? ` | Last AI reply ${formatTimestamp(detail.thread.last_ai_reply_at)}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void runThreadAction('assign', { assigned_to: user?.id ?? null })}
                      disabled={actioning !== null || !user?.id}
                      className="btn-ghost"
                    >
                      {actioning === 'assign' ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                      Assign to me
                    </button>
                    <button
                      type="button"
                      onClick={() => void runThreadAction(detail.thread.status === 'resolved' ? 'reopen' : 'resolve')}
                      disabled={actioning !== null}
                      className="btn-outline"
                    >
                      {detail.thread.status === 'resolved' ? 'Reopen' : 'Resolve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runThreadAction(detail.thread.status === 'blocked' ? 'reopen' : 'block')}
                      disabled={actioning !== null}
                      className="btn-danger"
                    >
                      {detail.thread.status === 'blocked' ? 'Unblock' : 'Block'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      Linked player
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {detail.thread.user?.username ?? 'Not linked yet'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {detail.thread.user
                        ? `${detail.thread.user.plan} | ${detail.thread.user.region ?? 'No region'}`
                        : 'Use relink below if this contact belongs to a Mechi player.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      Assignee
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {detail.thread.assignee?.username ?? 'Nobody yet'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {detail.thread.assignee?.role ?? 'Unassigned'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                      Escalation
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {detail.thread.escalation_reason ?? 'None active'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Thread ID {detail.thread.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
                <div className="flex items-center gap-2">
                  <Link2 size={15} className="text-[var(--brand-teal)]" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Relink to Mechi user</p>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    value={relinkLookup}
                    onChange={(event) => setRelinkLookup(event.target.value)}
                    className="input"
                    placeholder="Enter username, user ID, or phone / handle"
                  />
                  <button
                    type="button"
                    onClick={() => void runThreadAction('relink', { lookup: relinkLookup })}
                    disabled={actioning !== null}
                    className="btn-ghost"
                  >
                    Relink
                  </button>
                </div>
                {detail.contactMatches.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {detail.contactMatches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => {
                          setRelinkLookup(match.username);
                          void runThreadAction('relink', { lookup: match.username });
                        }}
                        disabled={actioning !== null}
                        className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]"
                      >
                        {match.username} | {match.phone ?? match.whatsapp_number ?? 'No phone'}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
                <div className="flex items-center gap-2">
                  <MessageCircle size={15} className="text-[var(--brand-coral)]" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Manual reply</p>
                </div>
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  className="input mt-4 min-h-32 resize-y py-3"
                  placeholder={`Send a human follow-up through the official Mechi ${channelLabel(detail.thread.channel)} lane...`}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={actioning !== null || !reply.trim()}
                    className="btn-primary"
                  >
                    {actioning === 'reply' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Send reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setReply('')}
                    disabled={actioning !== null || !reply}
                    className="btn-ghost"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5">
                <div className="flex items-center gap-2">
                  <Clock3 size={15} className="text-[var(--brand-teal)]" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Transcript</p>
                </div>

                <div className="mt-4 space-y-3">
                  {detail.messages.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
                      No transcript saved yet.
                    </div>
                  ) : (
                    detail.messages.map((message) => {
                      const deliveryMeta = (
                        message.meta?.delivery ?? message.meta?.whatsapp ?? message.meta?.instagram ?? {}
                      ) as Record<string, unknown>;
                      return (
                        <div
                          key={message.id}
                          className={`rounded-3xl border p-4 ${
                            message.sender_type === 'user'
                              ? 'border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.07)]'
                              : message.sender_type === 'admin'
                                ? 'border-[rgba(255,107,107,0.18)] bg-[rgba(255,107,107,0.08)]'
                                : message.sender_type === 'ai'
                                  ? 'border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.08)]'
                                  : 'border-[var(--border-color)] bg-[var(--surface)]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-[var(--text-primary)]">
                              {message.sender_type}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
                              {message.direction}
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-soft)]">
                              {message.message_type}
                            </span>
                            {typeof message.ai_confidence === 'number' ? (
                              <span className="text-[11px] uppercase tracking-[0.14em] text-[#60A5FA]">
                                AI {Math.round(message.ai_confidence * 100)}%
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                            {message.body || '[No text body captured]'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-soft)]">
                            <span>{formatTimestamp(message.created_at)}</span>
                            {typeof deliveryMeta.status === 'string' ? (
                              <span>
                                {typeof deliveryMeta.channel === 'string'
                                  ? `${deliveryMeta.channel}: ${deliveryMeta.status}`
                                  : `delivery: ${deliveryMeta.status}`}
                              </span>
                            ) : null}
                            {typeof deliveryMeta.error === 'string' && deliveryMeta.error ? (
                              <span className="text-red-400">{deliveryMeta.error}</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {actioning && actioning !== 'reply' ? (
        <div className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-2 text-sm text-[var(--text-secondary)] shadow-lg">
          <Loader2 size={14} className="animate-spin" />
          Working...
        </div>
      ) : null}
    </div>
  );
}
