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

const GAME_EMOJI: Record<GameKey, string> = {
  efootball: '⚽',
  efootball_mobile: '⚽',
  fc26: '🏆',
  mk11: '🥊',
  nba2k26: '🏀',
  tekken8: '👊',
  sf6: '🥋',
  codm: '🔫',
  pubgm: '🎯',
  cs2: '💥',
  valorant: '🎯',
  mariokart: '🏎️',
  smashbros: '⚡',
  freefire: '🔥',
  rocketleague: '🚀',
};

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
  const isRemoteImage = Boolean(imageUrl?.startsWith('http'));

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
          unoptimized={isRemoteImage}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(140deg,rgba(50,224,196,0.2),rgba(255,107,107,0.14))]">
          <span
            aria-hidden="true"
            className={variant === 'capsule' ? 'text-5xl' : 'text-4xl'}
          >
            {GAME_EMOJI[gameKey]}
          </span>
          <span className="sr-only">{game.label}</span>
        </div>
      )}

      {overlay ? (
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/25 to-transparent" />
      ) : null}
    </div>
  );
}
