'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCheck, ChevronDown, Loader2, Lock, MessageCircle, Send } from 'lucide-react';
import type { MatchChatMessage, MatchChatThreadState } from '@/types';

type MatchChatPanelProps = {
  currentUserId: string;
  opponentUsername: string;
  messages: MatchChatMessage[];
  state: MatchChatThreadState | null;
  loading: boolean;
  canReply: boolean;
  input: string;
  sending: boolean;
  quickReplies: readonly string[];
  onInputChange: (value: string) => void;
  onQuickReply: (value: string) => void;
  onSend: () => void;
  showComposer?: boolean;
};

function formatChatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeTime(value?: string | null) {
  if (!value) {
    return 'just now';
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function getSenderLabel(
  message: MatchChatMessage,
  currentUserId: string,
  opponentUsername: string
) {
  if (message.sender_type === 'system') {
    return 'Mechi';
  }

  if (message.sender_type === 'admin') {
    return message.sender?.username ?? 'Admin';
  }

  if (message.sender_user_id === currentUserId) {
    return 'You';
  }

  return message.sender?.username ?? opponentUsername;
}

function getSystemEventLabel(message: MatchChatMessage) {
  const event = String(message.meta?.event ?? message.meta?.seed ?? 'timeline');

  if (event === 'match-start' || event === 'timeline') {
    return 'Match live';
  }

  if (event === 'match_reported') {
    return 'Result submitted';
  }

  if (event === 'match_disputed') {
    return 'Dispute';
  }

  if (event === 'dispute_proof_uploaded') {
    return 'Proof uploaded';
  }

  if (event === 'match_completed') {
    return 'Closed';
  }

  if (event === 'match_cancelled') {
    return 'Cancelled';
  }

  if (event === 'admin_help_requested') {
    return 'Admin help';
  }

  if (event === 'admin_help_resolved') {
    return 'Resolved';
  }

  if (event === 'admin_help_dismissed') {
    return 'Closed';
  }

  return 'Timeline';
}

export function MatchChatPanel({
  currentUserId,
  opponentUsername,
  messages,
  state,
  loading,
  canReply,
  input,
  sending,
  quickReplies,
  onInputChange,
  onQuickReply,
  onSend,
  showComposer = true,
}: MatchChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const latestPlayerMessage =
    [...messages].reverse().find((message) => message.sender_type === 'player') ?? null;
  const latestMessage = messages[messages.length - 1] ?? null;
  const waitingOnOpponent =
    state?.latest_player_message_sender_user_id === currentUserId &&
    !state?.opponent_has_seen_latest_message &&
    canReply;
  const opponentsTurn =
    Boolean(state?.latest_player_message_sender_user_id) &&
    state?.latest_player_message_sender_user_id !== currentUserId &&
    canReply;
  const lastActorLabel = latestMessage
    ? getSenderLabel(latestMessage, currentUserId, opponentUsername)
    : 'No activity yet';
  const headerStatus = state?.opponent_has_seen_latest_message
    ? `Seen by ${opponentUsername}`
    : waitingOnOpponent
      ? `Waiting on ${opponentUsername}`
      : opponentsTurn
        ? 'Your turn'
        : canReply
          ? 'Thread open'
          : 'Read only';
  const latestPreview = latestMessage
    ? `${lastActorLabel}: ${latestMessage.body}`
    : 'Share room code or a quick ready check without leaving the match.';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  return (
    <div className="card mb-4 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
        >
          <div className="flex flex-wrap items-center gap-2">
            <MessageCircle size={16} className="text-[var(--brand-teal)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Match chat</h3>
            <span className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
              {headerStatus}
            </span>
            <span className="inline-flex items-center rounded-full bg-[var(--surface-strong)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>
          <p className="mt-2 truncate text-sm text-[var(--text-secondary)]">{latestPreview}</p>
          <p className="mt-1 text-xs text-[var(--text-soft)]">
            {state?.latest_message_at
              ? `${lastActorLabel} moved ${formatRelativeTime(state.latest_message_at)}`
              : canReply
                ? 'Tap open to coordinate fast.'
                : 'Open to review the thread.'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[rgba(50,224,196,0.24)]"
          aria-label={expanded ? 'Collapse match chat' : 'Expand match chat'}
        >
          {expanded ? 'Hide' : 'Open'}
          <ChevronDown
            size={14}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface-strong)]">
          <div className="max-h-[12rem] min-h-[7rem] space-y-3 overflow-y-auto p-4 no-scrollbar">
            {loading ? (
              <div className="flex h-full min-h-[7rem] items-center justify-center">
                <div className="inline-flex items-center gap-2 text-sm text-[var(--text-soft)]">
                  <Loader2 size={16} className="animate-spin" />
                  Loading chat...
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-[7rem] items-center justify-center text-center">
                <div className="max-w-sm">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    No chat messages yet.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Send a quick note like &quot;I&apos;m here&quot; or &quot;Send room code&quot; to kick
                    things off.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isSystem = message.sender_type === 'system';
                const isMine = message.sender_user_id === currentUserId;
                const senderLabel = getSenderLabel(message, currentUserId, opponentUsername);

                if (isSystem) {
                  return (
                    <div
                      key={message.id}
                      className="rounded-[1rem] border border-[rgba(50,224,196,0.18)] bg-[rgba(50,224,196,0.08)] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                            {senderLabel}
                          </p>
                          <span className="rounded-full bg-[rgba(50,224,196,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                            {getSystemEventLabel(message)}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-soft)]">
                          {formatChatTime(message.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {message.body}
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-[1.1rem] px-4 py-3 ${
                        isMine
                          ? 'bg-[rgba(255,107,107,0.12)] text-[var(--text-primary)]'
                          : message.sender_type === 'admin'
                            ? 'border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] text-[var(--text-primary)]'
                            : 'border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                          {senderLabel}
                        </p>
                        <span className="text-[11px] text-[var(--text-soft)]">
                          {formatChatTime(message.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[inherit]">{message.body}</p>
                      {isMine && latestPlayerMessage?.id === message.id ? (
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[var(--text-soft)]">
                          {state?.opponent_has_seen_latest_message ? (
                            <>
                              <CheckCheck
                                size={12}
                                className="text-[var(--accent-secondary-text)]"
                              />
                              Seen {formatRelativeTime(state?.opponent_last_read_at)}
                            </>
                          ) : (
                            'Sent'
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {canReply ? (
            showComposer ? (
              <div className="border-t border-[var(--border-color)] p-3 sm:p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => onQuickReply(reply)}
                      className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[rgba(50,224,196,0.24)] hover:text-[var(--text-primary)]"
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <textarea
                      value={input}
                      onChange={(event) => onInputChange(event.target.value)}
                      placeholder={`Message ${opponentUsername} about room code, invite timing, or setup...`}
                      className="input-field min-h-[3.25rem] resize-none text-sm"
                      maxLength={280}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={sending || !input.trim()}
                    className="btn-primary min-w-[8.5rem] justify-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    Send
                  </button>
                </div>
              </div>
            ) : null
          ) : (
            <div className="border-t border-[var(--border-color)] p-3 sm:p-4">
              <div className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] p-3.5">
                <Lock size={16} className="mt-0.5 shrink-0 text-[var(--text-soft)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Match chat is now read-only.
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    Once the match is closed, the thread stays visible for reference but no new
                    player messages can be sent.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
