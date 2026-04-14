'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { GAMES, getTier } from '@/lib/config';
import type { GameKey } from '@/types';
import { Trophy, Crown } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
}

const ONE_V_ONE_GAMES = (Object.keys(GAMES) as GameKey[]).filter(
  (g) => GAMES[g].mode === '1v1'
);

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [selectedGame, setSelectedGame] = useState<GameKey>('efootball');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async (game: GameKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/leaderboard/${game}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(selectedGame);
  }, [selectedGame, fetchLeaderboard]);

  const rankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="page-container">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={22} className="text-yellow-500" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Leaderboard</h1>
      </div>

      {/* Game selector */}
      <div className="overflow-x-auto no-scrollbar mb-5">
        <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
          {ONE_V_ONE_GAMES.map((game) => (
            <button
              key={game}
              onClick={() => setSelectedGame(game)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                selectedGame === game
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {GAMES[game].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 shimmer rounded-2xl" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Crown size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-semibold text-gray-600 dark:text-gray-400">No players yet</p>
          <p className="text-sm mt-1">Be the first to play {GAMES[selectedGame].label}!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => {
            const tier = getTier(entry.rating);
            const isMe = entry.id === user?.id;
            const total = entry.wins + entry.losses;
            const wr = total > 0 ? Math.round((entry.wins / total) * 100) : 0;

            return (
              <div
                key={entry.id}
                className={`card p-4 flex items-center gap-3 ${
                  isMe ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : ''
                }`}
              >
                {/* Rank */}
                <div className="w-10 text-center font-black text-lg">
                  {rankIcon(entry.rank)}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                  isMe ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {entry.username[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm truncate ${isMe ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                    {entry.username} {isMe && '(You)'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.wins}W · {entry.losses}L · {wr}% WR
                  </p>
                </div>

                {/* Rating */}
                <div className="text-right">
                  <p className={`font-black text-base ${tier.color}`}>{entry.rating}</p>
                  <p className={`text-xs font-bold ${tier.color}`}>{tier.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
