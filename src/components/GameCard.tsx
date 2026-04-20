'use client';

import { Loader2, Swords, Users } from 'lucide-react';
import { GAMES, PLATFORMS } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';
import { GameCover } from '@/components/GameCover';
import type { GameKey, GameMode, PlatformKey } from '@/types';

interface GameCardProps {
  gameKey: GameKey;
  rating?: number;
  wins?: number;
  losses?: number;
  queueCount?: number;
  platform?: PlatformKey | null;
  onJoinQueue?: () => void;
  onViewLobby?: () => void;
  isQueuing?: boolean;
  isDisabled?: boolean;
  displayMode?: GameMode;
}

function getModeChipClass(isLobby: boolean) {
  return isLobby
    ? 'bg-[rgba(96,165,250,0.8)] text-white'
    : 'bg-[rgba(34,197,94,0.8)] text-white';
}

export function GameCard({
  gameKey,
  rating,
  wins,
  losses,
  queueCount = 0,
  platform,
  onJoinQueue,
  onViewLobby,
  isQueuing = false,
  isDisabled = false,
  displayMode,
}: GameCardProps) {
  const game = GAMES[gameKey];
  if (!game) return null;

  const mode = displayMode ?? game.mode;
  const isLobby = mode === 'lobby';
  const division = rating !== undefined ? getRankDivision(rating) : null;
  const totalMatches = (wins ?? 0) + (losses ?? 0);
  const winRate = totalMatches > 0 ? Math.round(((wins ?? 0) / totalMatches) * 100) : 0;
  const platformLabel = platform ? PLATFORMS[platform]?.label ?? platform.toUpperCase() : null;

  return (
    <div className="card-hover group overflow-hidden">
      <div className="relative h-[120px] overflow-hidden">
        <GameCover
          gameKey={gameKey}
          variant="header"
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
          overlay
          displayMode={mode}
        />

        {queueCount > 0 ? (
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[4px] border border-[rgba(50,224,196,0.22)] bg-black/60 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--accent-secondary-text)]">
            <span className="inline-block h-[5px] w-[5px] rounded-full bg-[var(--brand-teal)]" />
            {queueCount} in queue
          </div>
        ) : null}

        <span
          className={`absolute right-2 top-2 rounded-[3px] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] ${getModeChipClass(isLobby)}`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isLobby ? 'LOBBY' : '1V1'}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p
            className="text-[1.05rem] font-black leading-none text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {game.label}
          </p>
          {platformLabel ? (
            <p className="mt-1 text-[10px] text-white/70">{platformLabel}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {!isLobby && division ? (
          <div className="grid grid-cols-4 gap-1">
            <div className="rounded-[5px] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-1 py-1.5 text-center">
              <div
                className="text-[11px] font-black"
                style={{ color: division.color, fontFamily: 'var(--font-display)' }}
              >
                {division.label}
              </div>
              <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--text-soft)]">
                Rank
              </div>
            </div>
            <div className="rounded-[5px] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-1 py-1.5 text-center">
              <div className="text-[11px] font-black text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>
                {wins ?? 0}
              </div>
              <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--text-soft)]">
                W
              </div>
            </div>
            <div className="rounded-[5px] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-1 py-1.5 text-center">
              <div className="text-[11px] font-black text-rose-400" style={{ fontFamily: 'var(--font-display)' }}>
                {losses ?? 0}
              </div>
              <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--text-soft)]">
                L
              </div>
            </div>
            <div className="rounded-[5px] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-1 py-1.5 text-center">
              <div className="text-[11px] font-black text-sky-400" style={{ fontFamily: 'var(--font-display)' }}>
                {`${winRate}%`}
              </div>
              <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-[var(--text-soft)]">
                WR
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[5px] border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-3 text-center">
            <p className="text-[11px] font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
              {platformLabel ?? 'Open lobby'}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[var(--text-soft)]">
              {game.maxPlayers ? `Up to ${game.maxPlayers} players` : 'Room-based play'}
            </p>
          </div>
        )}

        {isLobby ? (
          <button
            onClick={onViewLobby}
            disabled={isDisabled}
            className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-[6px] border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.1)] px-3 text-[12px] font-bold text-[var(--accent-secondary-text)]"
          >
            <Users size={12} /> View lobbies
          </button>
        ) : (
          <button
            onClick={onJoinQueue}
            disabled={isDisabled || isQueuing}
            className={`w-full justify-center transition-all ${
              isQueuing
                ? 'btn-outline min-h-[38px] rounded-[6px] px-3 text-[12px] font-bold cursor-not-allowed opacity-60'
                : 'btn-teal min-h-[38px] rounded-[6px] px-3 text-[12px] font-bold shadow-[0_8px_20px_rgba(50,224,196,0.18)]'
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
