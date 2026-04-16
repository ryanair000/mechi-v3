'use client';

import Image from 'next/image';
import { useState } from 'react';
import { GAMES, getGameCapsuleImage, getGameImage } from '@/lib/config';
import type { GameKey, GameMode } from '@/types';

interface GameCoverProps {
  gameKey: GameKey;
  variant?: 'header' | 'capsule';
  className?: string;
  overlay?: boolean;
  priority?: boolean;
  displayMode?: GameMode;
}

export function GameCover({
  gameKey,
  variant = 'header',
  className = '',
  overlay = false,
  priority = false,
  displayMode,
}: GameCoverProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const game = GAMES[gameKey];
  const desiredImageUrl = variant === 'capsule' ? getGameCapsuleImage(gameKey) : getGameImage(gameKey);
  const imageUrl = failedImageUrl === desiredImageUrl ? null : desiredImageUrl;
  const isUnoptimizedImage = Boolean(imageUrl?.startsWith('http') || imageUrl?.endsWith('.svg'));
  const mode = displayMode ?? game.mode;

  return (
    <div className={`relative overflow-hidden bg-[var(--surface-strong)] ${className}`}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={game.label}
          fill
          sizes={variant === 'capsule' ? '(max-width: 768px) 45vw, 300px' : '(max-width: 768px) 92vw, 460px'}
          className="h-full w-full object-cover"
          onError={() => setFailedImageUrl(desiredImageUrl)}
          priority={priority}
          unoptimized={isUnoptimizedImage}
        />
      ) : (
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(145deg,rgba(10,16,28,0.98),rgba(28,42,68,0.92))]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(50,224,196,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,107,107,0.2),transparent_38%)]" />
          <div className="absolute inset-[10%] rounded-[1.4rem] border border-white/10" />
          <div className="absolute right-[-8%] top-[-12%] h-[58%] w-[48%] rounded-full border border-white/12" />
          <div className="absolute bottom-[-16%] left-[-10%] h-[52%] w-[44%] rounded-full border border-white/10" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-950/88 via-gray-950/28 to-transparent px-4 pb-4 pt-10">
            <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">
              {mode === 'lobby' ? 'Lobby Queue' : 'Ranked Queue'}
            </div>
            <p
              className={`mt-3 font-black leading-tight text-white ${
                variant === 'capsule' ? 'text-2xl' : 'text-xl'
              }`}
            >
              {game.label}
            </p>
            <p className="mt-1 text-xs text-white/68">Local artwork fallback with no external dependency.</p>
          </div>
        </div>
      )}

      {overlay ? (
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/25 to-transparent" />
      ) : null}
    </div>
  );
}
