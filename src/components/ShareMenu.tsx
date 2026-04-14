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
  text: string;
  url: string;
  title: string;
  imageUrl?: string;
  imageFilename?: string;
  variant?: 'primary' | 'ghost' | 'inline';
}

export function ShareMenu({
  text,
  url,
  title,
  imageUrl,
  imageFilename,
  variant = 'ghost',
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);

  const handleNativeShare = async () => {
    const success = await nativeShare({ title, text, url });
    if (success) setOpen(false);
  };

  const handleWhatsApp = () => {
    shareToWhatsApp(text, url);
    setOpen(false);
  };

  const handleCopyLink = async () => {
    const success = await copyLink(url);
    if (success) {
      toast.success('Link copied!');
    } else {
      toast.error('Failed to copy');
    }
    setOpen(false);
  };

  const handleDownloadImage = () => {
    if (imageUrl) {
      downloadImage(imageUrl, imageFilename ?? 'mechi-share.png');
      toast.success('Image downloading. Share it on Instagram!');
    }
    setOpen(false);
  };

  const buttonClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'inline'
        ? 'flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]'
        : 'btn-ghost';

  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass}>
        <Share2 size={14} />
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(11,17,33,0.55)] sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-sm rounded-t-2xl p-5 pb-8 sm:rounded-2xl sm:pb-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-[var(--text-primary)]">Share Mechi</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-[var(--text-soft)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <button
                onClick={handleWhatsApp}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(50,224,196,0.14)]">
                  <MessageCircle size={18} className="text-[var(--accent-secondary-text)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">WhatsApp</p>
                  <p className="text-xs text-[var(--text-soft)]">Share with friends or groups</p>
                </div>
              </button>

              {imageUrl && (
                <button
                  onClick={handleDownloadImage}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)]"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,107,107,0.14)]">
                    <Download size={18} className="text-[var(--brand-coral)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Save for Instagram</p>
                    <p className="text-xs text-[var(--text-soft)]">Download image to share as a story</p>
                  </div>
                </button>
              )}

              {canNativeShare() && (
                <button
                  onClick={handleNativeShare}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)]"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,107,107,0.14)]">
                    <Share2 size={18} className="text-[var(--brand-coral)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">More options</p>
                    <p className="text-xs text-[var(--text-soft)]">Share through any app on your device</p>
                  </div>
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--surface-elevated)]"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)]">
                  <Link2 size={18} className="text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Copy link</p>
                  <p className="text-xs text-[var(--text-soft)]">Paste it anywhere</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
