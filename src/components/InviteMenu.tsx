'use client';

import { useMemo, useState } from 'react';
import { Copy, Link2, MessageCircle, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  canNativeShare,
  copyLink,
  getInviteUrl,
  inviteShareText,
  nativeShare,
  shareToWhatsApp,
} from '@/lib/share';

interface InviteMenuProps {
  inviteCode: string;
  username: string;
  variant?: 'primary' | 'ghost' | 'inline';
  onShared?: (action: string) => void | Promise<void>;
}

export function InviteMenu({
  inviteCode,
  username,
  variant = 'ghost',
  onShared,
}: InviteMenuProps) {
  const [open, setOpen] = useState(false);
  const inviteUrl = useMemo(() => getInviteUrl(inviteCode), [inviteCode]);
  const shareText = useMemo(() => inviteShareText(username), [username]);

  const notifyShared = async (action: string) => {
    try {
      await onShared?.(action);
    } catch {
      // Keep invite actions resilient even if reward tracking fails.
    }
  };

  const buttonClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'inline'
        ? 'flex items-center gap-2 text-sm font-medium text-white/40 transition-colors hover:text-white/70'
        : 'btn-ghost';

  const handleCopy = async (value: string, successMessage: string) => {
    const copied = await copyLink(value);
    if (copied) {
      toast.success(successMessage);
      await notifyShared('invite_copy');
    } else {
      toast.error('Failed to copy');
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        <UserPlus size={14} />
        Invite
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border border-white/[0.08] bg-gray-900 p-5 pb-8 sm:rounded-2xl sm:pb-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Invite friends</h3>
                <p className="mt-1 text-xs text-white/35">Your code travels with the short link.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-white/20 transition-colors hover:text-white/40"
                aria-label="Close invite menu"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                Invite code
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="truncate text-sm font-semibold text-white">{inviteCode}</code>
                <button
                  type="button"
                  onClick={() => void handleCopy(inviteUrl, 'Invite link copied')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/70 transition-colors hover:bg-white/[0.05]"
                  aria-label="Copy invite link"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="mt-3 truncate text-xs text-white/40">{inviteUrl}</p>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <button
                type="button"
                onClick={() => void handleCopy(inviteUrl, 'Invite link copied')}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Link2 size={18} className="text-white/70" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Copy link</p>
                  <p className="text-xs text-white/25">Paste it anywhere</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  shareToWhatsApp(shareText, inviteUrl);
                  void notifyShared('invite_whatsapp');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/15">
                  <MessageCircle size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">WhatsApp</p>
                  <p className="text-xs text-white/25">Send your invite in one tap</p>
                </div>
              </button>

              {canNativeShare() ? (
                <button
                  type="button"
                  onClick={async () => {
                    const shared = await nativeShare({
                      title: `${username}'s Mechi invite`,
                      text: shareText,
                      url: inviteUrl,
                    });
                    if (shared) {
                      await notifyShared('invite_native');
                      setOpen(false);
                    }
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                    <UserPlus size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">More options</p>
                    <p className="text-xs text-white/25">Share through your device</p>
                  </div>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
