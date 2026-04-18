'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Lock, MessageCircle, Send } from 'lucide-react';
import type { MatchChatMessage } from '@/types';

type MatchChatPanelProps = {
  currentUserId: string;
  opponentUsername: string;
  messages: MatchChatMessage[];
  loading: boolean;
  canReply: boolean;
  input: string;
  sending: boolean;
  quickReplies: readonly string[];
  onInputChange: (value: string) => void;
  onQuickReply: (value: string) => void;
  onSend: () => void;
};

function formatChatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getSenderLabel(
  message: MatchChatMessage,
  currentUserId: string,
  opponentUsername: string
) {
  if (message.sender_type === 'system') {
    return 'Mechi';
  }

  if (message.sender_user_id === currentUserId) {
    return 'You';
  }

  return message.sender?.username ?? opponentUsername;
}

export function MatchChatPanel({
  currentUserId,
  opponentUsername,
  messages,
  loading,
  canReply,
  input,
  sending,
  quickReplies,
  onInputChange,
  onQuickReply,
  onSend,
}: MatchChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  return (
    <div className="card mb-4 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-[var(--brand-teal)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Match chat</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Keep setup details here so both players can confirm room code, invite timing, and any
            quick game-plan notes without leaving Mechi.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
          {canReply ? 'Private to this match' : 'Read only'}
        </div>
      </div>

      <div className="mt-4 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--surface-strong)]">
        <div className="max-h-[22rem] min-h-[14rem] space-y-3 overflow-y-auto p-4 no-scrollbar sm:p-5">
          {loading ? (
            <div className="flex h-full min-h-[10rem] items-center justify-center">
              <div className="inline-flex items-center gap-2 text-sm text-[var(--text-soft)]">
                <Loader2 size={16} className="animate-spin" />
                Loading chat...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-[10rem] items-center justify-center text-center">
              <div className="max-w-sm">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No chat messages yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Send a quick note like “I&apos;m here” or “Send room code” to kick things off.
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                        {senderLabel}
                      </p>
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
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-[var(--border-color)] p-4 sm:p-5">
          {canReply ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => onQuickReply(reply)}
                    className="rounded-full border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[rgba(50,224,196,0.24)] hover:text-[var(--text-primary)]"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                    Send a message
                  </label>
                  <textarea
                    value={input}
                    onChange={(event) => onInputChange(event.target.value)}
                    placeholder={`Message ${opponentUsername} about room code, invite timing, or setup...`}
                    className="input-field min-h-[6.25rem] resize-none"
                    maxLength={280}
                  />
                </div>
                <button
                  type="button"
                  onClick={onSend}
                  disabled={sending || !input.trim()}
                  className="btn-primary min-w-[10rem] justify-center disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3 rounded-[1rem] border border-[var(--border-color)] bg-[var(--surface)] p-3.5">
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
          )}
        </div>
      </div>
    </div>
  );
}
