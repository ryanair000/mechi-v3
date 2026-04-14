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
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchLeaderboard(selectedGame); }, [selectedGame, fetchLeaderboard]);

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <div className="page-container">
      <div className="flex items-center gap-2 mb-6 pt-2">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center">
          <Trophy size={18} className="text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Leaderboard</h1>
          <p className="text-xs text-white/30">Top players by ELO rating</p>
        </div>
      </div>

      {/* Game selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        {ONE_V_ONE_GAMES.map((g) => (
          <button key={g} onClick={() => setSelectedGame(g)}
            className={`flex-shrink-0 text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${
              selectedGame === g
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
            }`}>
            {GAMES[g].label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <div key={i} className="h-16 shimmer" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-white/25">
          <Trophy size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No players yet</p>
          <p className="text-xs mt-1">Be the first to play {GAMES[selectedGame].label}!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const tier = getTier(entry.rating);
            const wr = entry.wins + entry.losses > 0
              ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100) : 0;
            const isMe = entry.id === user?.id;
            const isTop3 = idx < 3;

            return (
              <div key={entry.id}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : isTop3
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white/3 border-white/5'
                }`}>
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {isTop3
                    ? <span className="text-lg">{MEDAL[idx]}</span>
                    : <span className="text-sm font-bold text-white/30">#{idx + 1}</span>}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0`}
                  style={{ background: tier.color + '20', color: tier.color }}>
                  {entry.username[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-bold text-sm truncate ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                      {entry.username}
                    </p>
                    {isMe && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">YOU</span>}
                    {idx === 0 && <Crown size={12} className="text-yellow-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">{entry.wins}W · {entry.losses}L · {wr}% WR</p>
                </div>

                {/* Rating */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black" style={{ color: tier.color }}>{entry.rating}</div>
                  <div className="text-[10px] font-bold text-white/20">{tier.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
