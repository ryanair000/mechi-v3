'use client';

import { Loader2, Swords, Users } from 'lucide-react';
import { GAMES, PLATFORMS } from '@/lib/config';
import { getRankDivision, withAlpha } from '@/lib/gamification';
import { GameCover } from '@/components/GameCover';
import { PlatformLogo } from '@/components/PlatformLogo';
import type { GameKey, GameMode } from '@/types';

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
  displayMode?: GameMode;
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
  displayMode,
}: GameCardProps) {
  const game = GAMES[gameKey];
  if (!game) return null;

  const mode = displayMode ?? game.mode;
  const isLobby = mode === 'lobby';
  const winRate =
    wins !== undefined && losses !== undefined && wins + losses > 0
      ? Math.round((wins / (wins + losses)) * 100)
      : null;
  const played = (wins ?? 0) + (losses ?? 0) > 0;
  const division = rating !== undefined && played ? getRankDivision(rating) : null;

  return (
    <div className="group overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(50,224,196,0.28)] hover:shadow-[var(--shadow-strong)]">
      {/* Cover image */}
      <div className="relative h-40 overflow-hidden bg-[var(--surface-elevated)]">
        <GameCover
          gameKey={gameKey}
          variant="header"
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          overlay
          displayMode={mode}
        />

        {/* Top badges */}
        <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-2">
          {queueCount !== undefined && queueCount > 0 ? (
            <span className="flex items-center gap-1 rounded border border-white/40 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-teal)]" />
              {queueCount} in queue
            </span>
          ) : (
            <span />
          )}
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
              isLobby ? 'bg-blue-500/80' : 'bg-emerald-600/80'
            }`}
          >
            {isLobby ? 'Lobby' : '1v1'}
          </span>
        </div>

        {/* Game title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pb-3 pt-8">
          <p className="text-[1.45rem] font-black leading-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
            {game.label}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="space-y-3 p-3.5">
        {/* Platform chips */}
        <div className="flex flex-wrap items-center gap-1">
          {game.platforms.map((platform) => (
            <span
              key={platform}
              title={PLATFORMS[platform]?.label}
              className="inline-flex items-center rounded border border-[var(--border-color)] bg-[var(--surface)] px-1.5 py-0.5"
            >
              <PlatformLogo platform={platform} size={11} />
            </span>
          ))}
        </div>

        {/* Stats row */}
        {rating !== undefined ? (
          <div className="grid grid-cols-4 gap-1.5">
            {/* Rank */}
            <div
              className="rounded-lg border px-2 py-1.5 text-center"
              style={{
                borderColor: division ? withAlpha(division.color, '30') : 'var(--border-color)',
                backgroundColor: division ? withAlpha(division.color, '10') : 'var(--surface)',
              }}
            >
              <div
                className="text-[0.8rem] font-black leading-tight"
                style={{ color: division?.color ?? 'var(--text-soft)' }}
              >
                {played ? (division?.label ?? '—') : '—'}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
                Rank
              </div>
            </div>
            {/* Wins */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1.5 text-center">
              <div className="text-[0.8rem] font-black leading-tight text-emerald-400">
                {wins ?? 0}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
                W
              </div>
            </div>
            {/* Losses */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1.5 text-center">
              <div className="text-[0.8rem] font-black leading-tight text-red-400">
                {losses ?? 0}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
                L
              </div>
            </div>
            {/* Win rate */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-2 py-1.5 text-center">
              <div className="text-[0.8rem] font-black leading-tight text-blue-400">
                {winRate !== null ? `${winRate}%` : '—'}
              </div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-[var(--text-soft)]">
                WR
              </div>
            </div>
          </div>
        ) : null}

        {/* CTA button */}
        {isLobby ? (
          <button
            onClick={onViewLobby}
            disabled={isDisabled}
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all hover:border-[rgba(50,224,196,0.3)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Users size={13} />
            View Lobbies
          </button>
        ) : (
          <button
            onClick={onJoinQueue}
            disabled={isDisabled || isQueuing}
            className={`flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-coral)] focus-visible:ring-offset-2 ${
              isQueuing
                ? 'cursor-not-allowed border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-soft)]'
                : isDisabled
                  ? 'cursor-not-allowed border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-soft)] opacity-40'
                  : 'border border-[rgba(255,107,107,0.3)] bg-[var(--brand-coral)] text-white shadow-[0_6px_18px_rgba(255,107,107,0.32)] hover:-translate-y-0.5 hover:opacity-90'
            }`}
          >
            {isQueuing ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <Swords size={12} />
                Find Match
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
