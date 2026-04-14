'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, getTier } from '@/lib/config';
import type { GameKey } from '@/types';
import { Trophy, Crown } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
}

const ONE_V_ONE_GAMES = (Object.keys(GAMES) as GameKey[]).filter((g) => GAMES[g].mode === '1v1');

export default function LeaderboardPage() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const [selectedGame, setSelectedGame] = useState<GameKey>(ONE_V_ONE_GAMES[0]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async (game: GameKey) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/users/leaderboard/${game}`);
      if (res.ok) { const d = await res.json(); setEntries(d.leaderboard ?? []); }
    } finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchLeaderboard(selectedGame); }, [selectedGame, fetchLeaderboard]);

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Trophy size={16} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Leaderboard</h1>
            <p className="text-xs text-white/25">Top players by ELO rating</p>
          </div>
        </div>
      </div>

      {/* Game selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {ONE_V_ONE_GAMES.map((g) => (
          <button key={g} onClick={() => setSelectedGame(g)}
            className={`flex-shrink-0 text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
              selectedGame === g
                ? 'bg-emerald-500 text-white'
                : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white'
            }`}>
            {GAMES[g].label}
          </button>
        ))}
      </div>

      {/* Table header - desktop */}
      <div className="hidden sm:grid sm:grid-cols-[3rem_1fr_6rem_6rem_6rem_5rem] gap-3 px-4 py-2 text-[11px] font-medium text-white/20 uppercase tracking-wide mb-2">
        <div>Rank</div>
        <div>Player</div>
        <div className="text-right">Rating</div>
        <div className="text-right">Wins</div>
        <div className="text-right">Losses</div>
        <div className="text-right">WR%</div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <div key={i} className="h-14 shimmer" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <Trophy size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No players yet</p>
          <p className="text-xs mt-1">Be the first to play {GAMES[selectedGame].label}!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, idx) => {
            const tier = getTier(entry.rating);
            const wr = entry.wins + entry.losses > 0
              ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100) : 0;
            const isMe = entry.id === user?.id;
            const isTop3 = idx < 3;

            return (
              <div key={entry.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isMe ? 'bg-emerald-500/8 border border-emerald-500/15'
                  : isTop3 ? 'bg-white/[0.03] border border-white/[0.06]'
                  : 'border border-transparent hover:bg-white/[0.02]'
                }`}>
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {isTop3 ? <span className="text-base">{MEDAL[idx]}</span>
                  : <span className="text-sm font-medium text-white/20">#{idx + 1}</span>}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ background: tier.color + '15', color: tier.color }}>
                  {entry.username[0].toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-medium text-sm truncate ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                      {entry.username}
                    </p>
                    {isMe && <span className="text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">YOU</span>}
                    {idx === 0 && <Crown size={11} className="text-yellow-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-white/20 mt-0.5 sm:hidden">{entry.wins}W · {entry.losses}L · {wr}% WR</p>
                </div>

                {/* Desktop stats */}
                <div className="hidden sm:block w-24 text-right">
                  <span className="text-sm font-bold" style={{ color: tier.color }}>{entry.rating}</span>
                  <span className="text-[10px] text-white/15 ml-1">{tier.name}</span>
                </div>
                <div className="hidden sm:block w-24 text-right text-sm text-white/40">{entry.wins}</div>
                <div className="hidden sm:block w-24 text-right text-sm text-white/40">{entry.losses}</div>
                <div className="hidden sm:block w-20 text-right text-sm text-white/40">{wr}%</div>

                {/* Mobile rating */}
                <div className="sm:hidden text-right flex-shrink-0">
                  <div className="text-sm font-bold" style={{ color: tier.color }}>{entry.rating}</div>
                  <div className="text-[9px] text-white/15">{tier.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
