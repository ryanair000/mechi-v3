'use client';

import Image from 'next/image';
import { Loader2, Swords, Users } from 'lucide-react';
import { GAMES, PLATFORMS, getGameImage } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import type { GameKey } from '@/types';

interface GameCardProps {
  gameKey: GameKey;
  rating?: number;
  wins?: number;
  losses?: number;
  queueCount?: number;
  onJoinQueue?: () => void;
  onViewLobby?: () => void;
  isQueuing?: boolean;
  isDisabled?: boolean;
}

export function GameCard({
  gameKey,
  rating,
  wins,
  losses,
  queueCount,
  onJoinQueue,
  onViewLobby,
  isQueuing = false,
  isDisabled = false,
}: GameCardProps) {
  const game = GAMES[gameKey];
  if (!game) return null;

  const imageUrl = getGameImage(gameKey);
  const isLobby = game.mode === 'lobby';
  const winRate =
    wins !== undefined && losses !== undefined && wins + losses > 0
      ? Math.round((wins / (wins + losses)) * 100)
      : null;
  const division = getRankDivision(rating ?? 1000);

  return (
    <div className="card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(50,224,196,0.22)]">
      <div className="relative h-32 overflow-hidden bg-[var(--surface-elevated)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={game.label}
            fill
            className="object-cover transition-transform duration-500 hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">Game</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,17,33,0.88)] via-[rgba(11,17,33,0.24)] to-transparent" />

        <div className="absolute right-2.5 top-2.5">
          <span
            className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${
              isLobby
                ? 'bg-[rgba(50,224,196,0.16)] text-[var(--accent-secondary-text)]'
                : 'bg-[rgba(255,107,107,0.18)] text-[var(--brand-night)]'
            }`}
          >
            {isLobby ? 'Lobby' : '1v1'}
          </span>
        </div>

        {queueCount !== undefined && queueCount > 0 && (
          <div className="absolute left-2.5 top-2.5">
            <span className="flex items-center gap-1 rounded-full bg-[rgba(11,17,33,0.7)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-teal)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-teal)]" />
              {queueCount} in queue
            </span>
          </div>
        )}

        <div className="absolute bottom-2.5 left-3 right-3">
          <p className="text-[13px] font-black leading-tight text-white drop-shadow-sm">{game.label}</p>
          <div className="mt-1 flex gap-1">
            {game.platforms.map((platform) => (
              <span key={platform} title={PLATFORMS[platform]?.label} className="text-xs">
                {PLATFORMS[platform]?.icon}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-2.5">
        {rating !== undefined && (
          <div className="mb-2.5 grid grid-cols-4 gap-1">
            <div className="text-center">
              <div
                className="text-[12px] font-black"
                style={{ color: division.color }}
              >
                {division.label}
              </div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">Rank</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] font-black text-[var(--accent-secondary-text)]">{wins ?? 0}</div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">W</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] font-black text-red-500">{losses ?? 0}</div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">L</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] font-black text-[var(--brand-coral)]">
                {winRate !== null ? `${winRate}%` : '-'}
              </div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-soft)]">Win rate</div>
            </div>
          </div>
        )}

        {isLobby ? (
          <button onClick={onViewLobby} disabled={isDisabled} className="btn-ghost min-h-[34px] w-full py-1.5 text-xs">
            <Users size={13} /> View lobbies
          </button>
        ) : (
          <button
            onClick={onJoinQueue}
            disabled={isDisabled || isQueuing}
            className={`flex min-h-[34px] w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              isQueuing
                ? 'cursor-not-allowed border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)]'
                : 'btn-primary'
            }`}
          >
            {isQueuing ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Searching...
              </>
            ) : (
              <>
                <Swords size={12} /> Find match
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
