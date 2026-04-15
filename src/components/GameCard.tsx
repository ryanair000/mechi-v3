'use client';

import { Loader2, Swords, Users } from 'lucide-react';
import { GAMES, PLATFORMS } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import { GameCover } from '@/components/GameCover';
import { PlatformLogo } from '@/components/PlatformLogo';
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

  const isLobby = game.mode === 'lobby';
  const winRate =
    wins !== undefined && losses !== undefined && wins + losses > 0
      ? Math.round((wins / (wins + losses)) * 100)
      : null;
  const division = rating !== undefined ? getRankDivision(rating) : null;

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] transition-all duration-200 hover:border-white/10">
      <div className="relative h-36 overflow-hidden bg-white/[0.03]">
        <GameCover
          gameKey={gameKey}
          variant="header"
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          overlay
        />

        <div className="absolute right-2.5 top-2.5">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold text-white ${isLobby ? 'bg-blue-500/80' : 'bg-emerald-500/80'}`}
          >
            {isLobby ? 'LOBBY' : '1V1'}
          </span>
        </div>

        {queueCount !== undefined && queueCount > 0 ? (
          <div className="absolute left-2.5 top-2.5">
            <span className="flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400 backdrop-blur-sm">
              <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
              {queueCount} in queue
            </span>
          </div>
        ) : null}

        <div className="absolute bottom-2.5 left-3 right-3">
          <p className="text-sm font-semibold leading-tight text-white drop-shadow">{game.label}</p>
          <div className="mt-1 flex gap-1">
            {game.platforms.map((platform) => (
              <span key={platform} title={PLATFORMS[platform]?.label} className="inline-flex items-center">
                <PlatformLogo platform={platform} size={12} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3">
        {rating !== undefined ? (
          <div className="mb-3 grid grid-cols-4 gap-1">
            <div className="text-center">
              <div className="text-sm font-bold" style={{ color: division?.color ?? '#ffffff' }}>
                {division?.label ?? '-'}
              </div>
              <div className="text-[9px] uppercase text-white/20">Rank</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-emerald-400">{wins ?? 0}</div>
              <div className="text-[9px] uppercase text-white/20">W</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-red-400">{losses ?? 0}</div>
              <div className="text-[9px] uppercase text-white/20">L</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-blue-400">{winRate !== null ? `${winRate}%` : '-'}</div>
              <div className="text-[9px] uppercase text-white/20">WR</div>
            </div>
          </div>
        ) : null}

        {isLobby ? (
          <button onClick={onViewLobby} disabled={isDisabled} className="btn-ghost w-full min-h-[36px] py-2 text-xs">
            <Users size={13} /> View Lobbies
          </button>
        ) : (
          <button
            onClick={onJoinQueue}
            disabled={isDisabled || isQueuing}
            className={`flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
              isQueuing
                ? 'cursor-not-allowed bg-white/[0.04] text-white/30'
                : 'cursor-pointer bg-emerald-500 text-white hover:bg-emerald-400 active:scale-[0.98]'
            }`}
          >
            {isQueuing ? (
              <>
                <Loader2 size={12} className="animate-spin" /> Searching...
              </>
            ) : (
              <>
                <Swords size={12} /> Find Match
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
