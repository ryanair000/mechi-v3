'use client';

import { useState } from 'react';
import { Download, Link2, MessageCircle, Share2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  canNativeShare,
  copyLink,
  downloadImage,
  nativeShare,
  shareToWhatsApp,
} from '@/lib/share';

interface ShareMenuProps {
  /** Text for WhatsApp / native share */
  text: string;
  /** URL to share */
  url: string;
  /** Title for native share */
  title: string;
  /** Optional: URL of an OG image to download for Instagram */
  imageUrl?: string;
  /** Filename for downloaded image */
  imageFilename?: string;
  /** Button style variant */
  variant?: 'primary' | 'ghost' | 'inline' | 'unstyled';
  /** Optional extra button classes */
  className?: string;
  /** Optional callback after a successful share action */
  onShared?: (action: string) => void | Promise<void>;
}

export function ShareMenu({
  text,
  url,
  title,
  imageUrl,
  imageFilename,
  variant = 'ghost',
  className = '',
  onShared,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);

  const notifyShared = async (action: string) => {
    try {
      await onShared?.(action);
    } catch {
      // Non-blocking: sharing should still succeed even if reward tracking fails.
    }
  };

  const handleNativeShare = async () => {
    const success = await nativeShare({ title, text, url });
    if (success) {
      await notifyShared('native_share');
      setOpen(false);
    }
  };

  const handleWhatsApp = () => {
    shareToWhatsApp(text, url);
    void notifyShared('whatsapp_share');
    setOpen(false);
  };

  const handleCopyLink = async () => {
    const success = await copyLink(url);
    if (success) {
      toast.success('Link copied!');
      await notifyShared('copy_link');
    }
    else toast.error('Failed to copy');
    setOpen(false);
  };

  const handleDownloadImage = async () => {
    if (imageUrl) {
      downloadImage(imageUrl, imageFilename ?? 'mechi-share.png');
      toast.success('Image downloading. Share it on Instagram!');
      await notifyShared('download_image');
    }
    setOpen(false);
  };

  const btnClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'inline'
        ? 'flex items-center gap-2 text-sm font-medium text-white/40 transition-colors hover:text-white/70'
        : variant === 'unstyled'
          ? ''
          : 'btn-ghost';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${btnClass} ${className}`.trim()}
      >
        <Share2 size={14} />
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border border-white/[0.08] bg-gray-900 p-5 pb-8 sm:rounded-2xl sm:pb-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Share</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-white/20 transition-colors hover:text-white/40"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/15">
                  <MessageCircle size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">WhatsApp</p>
                  <p className="text-xs text-white/25">Share with friends or groups</p>
                </div>
              </button>

              {imageUrl && (
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-pink-500/15">
                    <Download size={18} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Save for Instagram</p>
                    <p className="text-xs text-white/25">Download image to share as a story</p>
                  </div>
                </button>
              )}

              {canNativeShare() && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                    <Share2 size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">More Options</p>
                    <p className="text-xs text-white/25">Share via any app on your device</p>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Link2 size={18} className="text-white/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Copy Link</p>
                  <p className="text-xs text-white/25">Paste anywhere</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
