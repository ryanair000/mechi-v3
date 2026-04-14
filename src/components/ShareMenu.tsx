'use client';

import { useState } from 'react';
import { Share2, MessageCircle, Download, Link2, X } from 'lucide-react';
import { shareToWhatsApp, copyLink, nativeShare, canNativeShare, downloadImage } from '@/lib/share';
import toast from 'react-hot-toast';

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
  variant?: 'primary' | 'ghost' | 'inline';
}

export function ShareMenu({ text, url, title, imageUrl, imageFilename, variant = 'ghost' }: ShareMenuProps) {
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
    if (success) toast.success('Link copied!');
    else toast.error('Failed to copy');
    setOpen(false);
  };

  const handleDownloadImage = () => {
    if (imageUrl) {
      downloadImage(imageUrl, imageFilename ?? 'mechi-share.png');
      toast.success('Image downloading — share it on Instagram!');
    }
    setOpen(false);
  };

  const btnClass = variant === 'primary' ? 'btn-primary' :
    variant === 'inline' ? 'flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white/70 transition-colors' :
    'btn-ghost';

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnClass}>
        <Share2 size={14} />
        Share
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-gray-900 border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm">Share</h3>
              <button onClick={() => setOpen(false)} className="text-white/20 hover:text-white/40 p-1 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1">
              {/* WhatsApp */}
              <button onClick={handleWhatsApp}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors text-left w-full">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">WhatsApp</p>
                  <p className="text-xs text-white/25">Share with friends or groups</p>
                </div>
              </button>

              {/* Download for Instagram */}
              {imageUrl && (
                <button onClick={handleDownloadImage}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors text-left w-full">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center flex-shrink-0">
                    <Download size={18} className="text-pink-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Save for Instagram</p>
                    <p className="text-xs text-white/25">Download image to share as a story</p>
                  </div>
                </button>
              )}

              {/* Native share (mobile) */}
              {canNativeShare() && (
                <button onClick={handleNativeShare}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors text-left w-full">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <Share2 size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">More Options</p>
                    <p className="text-xs text-white/25">Share via any app on your device</p>
                  </div>
                </button>
              )}

              {/* Copy link */}
              <button onClick={handleCopyLink}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors text-left w-full">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
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
