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

export function GameCard({
  gameKey,
  rating,
  wins,
  losses,
  queueCount,
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
  const configuredPlatformLabel = platform ? PLATFORMS[platform]?.label ?? platform.toUpperCase() : null;
  const fallbackPlatformLabel =
    game.platforms.length === 1 ? (PLATFORMS[game.platforms[0]]?.label ?? game.platforms[0].toUpperCase()) : null;
  const platformSummary = configuredPlatformLabel ?? fallbackPlatformLabel ?? `${game.platforms.length} platforms`;
  const queueSummary =
    queueCount && queueCount > 0
      ? `${queueCount} player${queueCount === 1 ? '' : 's'} waiting now`
      : 'Queue is open right now';
  const recordSummary =
    wins !== undefined && losses !== undefined ? `${wins}W-${losses}L` : 'Fresh start';
  const lobbyModeSummary =
    game.maxPlayers && game.maxPlayers > 1 ? `${game.maxPlayers} player room` : 'Open room';

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-[1.1rem] border border-[var(--border-color)] bg-[var(--surface-strong)]">
          <GameCover gameKey={gameKey} variant="capsule" className="h-full w-full" displayMode={mode} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
            {isLobby ? 'Lobby play' : 'Ranked play'}
          </p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-[var(--text-primary)]">{game.label}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {isLobby
              ? `${lobbyModeSummary} for ${platformSummary}.`
              : `${queueSummary}${configuredPlatformLabel ? ` on ${configuredPlatformLabel}` : ''}.`}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="subtle-card px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            {isLobby ? 'Platform' : 'Rank'}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {isLobby ? platformSummary : division?.label ?? 'Unranked'}
          </p>
        </div>

        <div className="subtle-card px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            {isLobby ? 'Squad size' : 'Record'}
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
            {isLobby ? lobbyModeSummary : recordSummary}
          </p>
        </div>
      </div>

      {isLobby ? (
        <button onClick={onViewLobby} disabled={isDisabled} className="btn-outline mt-4 min-h-11 w-full py-2 text-sm">
          <Users size={13} /> Browse lobbies
        </button>
      ) : (
        <button
          onClick={onJoinQueue}
          disabled={isDisabled || isQueuing}
          className={`mt-4 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-[1rem] border py-3 text-sm font-semibold transition-all ${
            isQueuing
              ? 'cursor-not-allowed border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-soft)]'
              : 'cursor-pointer border-[rgba(50,224,196,0.22)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-text)] hover:border-[rgba(50,224,196,0.34)] hover:bg-[rgba(50,224,196,0.2)] hover:text-[var(--text-primary)]'
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
  );
}
