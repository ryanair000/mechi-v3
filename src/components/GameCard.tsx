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
  const division = rating !== undefined ? getRankDivision(rating) : null;

  return (
    <div className="card group overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-strong)]">
      <div className="relative h-40 overflow-hidden border-b border-[var(--border-color)] bg-[var(--surface-strong)]">
        <GameCover
          gameKey={gameKey}
          variant="header"
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          overlay
          displayMode={mode}
        />

        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
          {queueCount !== undefined && queueCount > 0 ? (
            <span className="flex items-center gap-1 rounded-full border border-white/45 bg-white/88 px-2.5 py-1 text-[10px] font-semibold text-[var(--accent-secondary-text)] shadow-[0_12px_28px_rgba(11,17,33,0.16)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-teal)]" />
              {queueCount} in queue
            </span>
          ) : (
            <span />
          )}

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_10px_24px_rgba(11,17,33,0.18)] ${
              isLobby ? 'bg-blue-500/85' : 'bg-emerald-500/85'
            }`}
          >
            {isLobby ? 'LOBBY' : '1V1'}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/82 via-black/28 to-transparent px-4 pb-4 pt-8">
          <p className="text-lg font-black leading-tight text-white [text-shadow:0_10px_28px_rgba(0,0,0,0.42)]">
            {game.label}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {game.platforms.map((platform) => (
              <span
                key={platform}
                title={PLATFORMS[platform]?.label}
                className="inline-flex items-center rounded-full bg-white/14 px-1.5 py-1 backdrop-blur-sm"
              >
                <PlatformLogo platform={platform} size={12} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {rating !== undefined ? (
          <div className="grid grid-cols-4 gap-2">
            <div
              className="rounded-xl border px-2 py-2 text-center"
              style={{
                borderColor: division ? withAlpha(division.color, '28') : 'var(--border-color)',
                backgroundColor: division ? withAlpha(division.color, '12') : 'var(--surface-strong)',
              }}
            >
              <div className="text-sm font-bold" style={{ color: division?.color ?? 'var(--text-primary)' }}>
                {division?.label ?? '-'}
              </div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Rank
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-2 text-center">
              <div className="text-sm font-bold text-emerald-400">{wins ?? 0}</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">W</div>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-2 text-center">
              <div className="text-sm font-bold text-red-400">{losses ?? 0}</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">L</div>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-2 text-center">
              <div className="text-sm font-bold text-blue-400">{winRate !== null ? `${winRate}%` : '-'}</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">WR</div>
            </div>
          </div>
        ) : null}

        {isLobby ? (
          <button onClick={onViewLobby} disabled={isDisabled} className="btn-outline min-h-11 w-full py-2 text-sm">
            <Users size={13} /> View Lobbies
          </button>
        ) : (
          <button
            onClick={onJoinQueue}
            disabled={isDisabled || isQueuing}
            className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[1rem] border py-3 text-sm font-semibold transition-all ${
              isQueuing
                ? 'cursor-not-allowed border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-soft)]'
                : 'cursor-pointer border-[rgba(50,224,196,0.22)] bg-[var(--accent-secondary)] text-[var(--brand-night)] shadow-[0_16px_28px_rgba(50,224,196,0.22)] hover:-translate-y-0.5 hover:bg-[var(--accent-secondary-hover)]'
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
