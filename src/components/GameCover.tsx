'use client';

import Image from 'next/image';
import { useState } from 'react';
import { GAMES, getGameCapsuleImage, getGameImage } from '@/lib/config';
import type { GameKey } from '@/types';

interface GameCoverProps {
  gameKey: GameKey;
  variant?: 'header' | 'capsule';
  className?: string;
  overlay?: boolean;
  priority?: boolean;
}

function getFallbackLabel(gameKey: GameKey) {
  const words = GAMES[gameKey].label.split(' ');
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function GameCover({
  gameKey,
  variant = 'header',
  className = '',
  overlay = false,
  priority = false,
}: GameCoverProps) {
  const [imgError, setImgError] = useState(false);
  const game = GAMES[gameKey];
  const imageUrl =
    !imgError
      ? (variant === 'capsule' ? getGameCapsuleImage(gameKey) : getGameImage(gameKey))
      : null;

  return (
    <div className={`relative overflow-hidden bg-[var(--surface-strong)] ${className}`}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={game.label}
          fill
          sizes={variant === 'capsule' ? '(max-width: 768px) 45vw, 300px' : '(max-width: 768px) 92vw, 460px'}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(140deg,rgba(50,224,196,0.2),rgba(255,107,107,0.14))]">
          <span className="text-xl font-black tracking-[0.08em] text-white/80">{getFallbackLabel(gameKey)}</span>
        </div>
      )}

      {overlay ? (
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/25 to-transparent" />
      ) : null}
    </div>
  );
}
