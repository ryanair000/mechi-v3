'use client';

import Image from 'next/image';
import { GAMES, getGameImage, PLATFORMS } from '@/lib/config';
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

  return (
    <div className="card overflow-hidden group">
      {/* Cover Image */}
      <div className="relative h-28 bg-gray-200 dark:bg-gray-800 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={game.label}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">🎮</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Mode badge */}
        <div className="absolute top-2 right-2">
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isLobby
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isLobby ? `${game.maxPlayers}P Lobby` : '1v1'}
          </span>
        </div>

        {/* Game name overlay */}
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-white font-bold text-sm leading-tight drop-shadow">{game.label}</p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        {/* Platform icons */}
        <div className="flex items-center gap-1 mb-3">
          {game.platforms.map((p) => (
            <span key={p} title={PLATFORMS[p]?.label} className="text-base">
              {PLATFORMS[p]?.icon}
            </span>
          ))}
        </div>

        {/* Stats */}
        {rating !== undefined && (
          <div className="flex items-center justify-between mb-3">
            <div className="text-center">
              <div className="text-base font-black text-gray-900 dark:text-white">{rating}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Rating</div>
            </div>
            <div className="text-center">
              <div className="text-base font-black text-emerald-600">{wins ?? 0}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-base font-black text-red-500">{losses ?? 0}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">Losses</div>
            </div>
            {winRate !== null && (
              <div className="text-center">
                <div className="text-base font-black text-blue-500">{winRate}%</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">WR</div>
              </div>
            )}
          </div>
        )}

        {/* Queue count */}
        {queueCount !== undefined && queueCount > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle animate-pulse" />
            {queueCount} {queueCount === 1 ? 'player' : 'players'} waiting
          </p>
        )}

        {/* Action button */}
        {isLobby ? (
          <button
            onClick={onViewLobby}
            disabled={isDisabled}
            className="w-full btn-ghost text-sm py-2"
          >
            View Lobbies
          </button>
        ) : (
          <button
            onClick={onJoinQueue}
            disabled={isDisabled || isQueuing}
            className={`w-full text-sm py-2 ${
              isQueuing ? 'btn-ghost' : 'btn-primary'
            }`}
          >
            {isQueuing ? 'Searching...' : 'Find Match'}
          </button>
        )}
      </div>
    </div>
  );
}
