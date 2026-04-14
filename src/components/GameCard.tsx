'use client';

import Image from 'next/image';
import { GAMES, getGameImage, PLATFORMS } from '@/lib/config';
import type { GameKey } from '@/types';
import { Loader2, Swords, Users } from 'lucide-react';

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
  gameKey, rating, wins, losses, queueCount,
  onJoinQueue, onViewLobby, isQueuing = false, isDisabled = false,
}: GameCardProps) {
  const game = GAMES[gameKey];
  if (!game) return null;

  const imageUrl = getGameImage(gameKey);
  const isLobby = game.mode === 'lobby';
  const winRate = wins !== undefined && losses !== undefined && wins + losses > 0
    ? Math.round((wins / (wins + losses)) * 100) : null;

  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden group hover:border-white/15 transition-all duration-200">
      {/* Cover */}
      <div className="relative h-32 bg-white/5 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl} alt={game.label} fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">🎮</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Mode badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isLobby ? 'bg-blue-500/80 text-white' : 'bg-emerald-500/80 text-white'}`}>
            {isLobby ? 'LOBBY' : '1v1'}
          </span>
        </div>

        {/* Live indicator */}
        {queueCount !== undefined && queueCount > 0 && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-1 text-[10px] font-bold bg-black/60 backdrop-blur-sm text-emerald-400 px-2 py-1 rounded-lg">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              {queueCount} live
            </span>
          </div>
        )}

        {/* Game name */}
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-white font-bold text-sm leading-tight drop-shadow-lg">{game.label}</p>
          <div className="flex gap-1 mt-1">
            {game.platforms.map((p) => (
              <span key={p} title={PLATFORMS[p]?.label} className="text-xs">{PLATFORMS[p]?.icon}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {/* Stats */}
        {rating !== undefined && (
          <div className="grid grid-cols-4 gap-1 mb-3">
            <div className="text-center">
              <div className="text-sm font-black text-white">{rating}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wide">ELO</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-black text-emerald-400">{wins ?? 0}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wide">W</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-black text-red-400">{losses ?? 0}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wide">L</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-black text-blue-400">{winRate !== null ? `${winRate}%` : '-'}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wide">WR</div>
            </div>
          </div>
        )}

        {/* Action */}
        {isLobby ? (
          <button onClick={onViewLobby} disabled={isDisabled}
            className="w-full btn-ghost text-xs py-2.5 min-h-[36px]">
            <Users size={13} /> View Lobbies
          </button>
        ) : (
          <button onClick={onJoinQueue} disabled={isDisabled || isQueuing}
            className={`w-full text-xs py-2.5 min-h-[36px] rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
              isQueuing
                ? 'bg-white/5 text-white/40 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white'
            }`}>
            {isQueuing ? <><Loader2 size={12} className="animate-spin" /> Searching...</> : <><Swords size={12} /> Find Match</>}
          </button>
        )}
      </div>
    </div>
  );
}
