'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { GameKey, Lobby, LobbyMember } from '@/types';
import toast from 'react-hot-toast';
import { Users, Copy, ArrowLeft, LogOut, Crown, Trash2 } from 'lucide-react';

interface LobbyDetail extends Lobby {
  host: { id: string; username: string };
}

interface MemberWithUser extends LobbyMember {
  user: { id: string; username: string };
}

export default function LobbyDetailPage() {
  const params = useParams();
  const lobbyId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const [lobby, setLobby] = useState<LobbyDetail | null>(null);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  const fetchLobby = useCallback(async () => {
    const res = await authFetch(`/api/lobbies/${lobbyId}`);
    if (res.ok) {
      const data = await res.json();
      setLobby(data.lobby);
      setMembers(data.members ?? []);
    } else {
      router.push('/lobbies');
    }
    setLoading(false);
  }, [authFetch, lobbyId, router]);

  useEffect(() => {
    fetchLobby();
    const interval = setInterval(fetchLobby, 10000);
    return () => clearInterval(interval);
  }, [fetchLobby]);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      const res = await authFetch(`/api/lobbies/${lobbyId}/leave`, { method: 'POST' });
      if (res.ok) {
        toast.success('Left lobby');
        router.push('/lobbies');
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Failed to leave');
      }
    } finally {
      setLeaving(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Close this lobby?')) return;
    const res = await authFetch(`/api/lobbies/${lobbyId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Lobby closed');
      router.push('/lobbies');
    }
  };

  const copyRoomCode = () => {
    if (lobby?.room_code) {
      navigator.clipboard.writeText(lobby.room_code);
      toast.success('Room code copied!');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-4">
          <div className="h-32 shimmer rounded-2xl" />
          <div className="h-48 shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lobby) return null;

  const game = GAMES[lobby.game as GameKey];
  const isHost = lobby.host_id === user?.id;
  const isMember = members.some((m) => m.user_id === user?.id);

  return (
    <div className="page-container">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 text-sm font-medium"
      >
        <ArrowLeft size={16} /> Back to Lobbies
      </button>

      {/* Lobby card */}
      <div className="bg-blue-600 rounded-2xl p-5 mb-5 text-white">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">
              {game?.label}
            </p>
            <h1 className="font-black text-2xl">{lobby.title}</h1>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            lobby.status === 'open' ? 'bg-emerald-500' :
            lobby.status === 'full' ? 'bg-red-500' :
            'bg-gray-500'
          }`}>
            {lobby.status}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            <span>{members.length}/{lobby.max_players} players</span>
          </div>
          <div className="flex gap-1">
            {game?.platforms.map((p) => (
              <span key={p}>{PLATFORMS[p]?.icon}</span>
            ))}
          </div>
        </div>

        {/* Room code */}
        <button
          onClick={copyRoomCode}
          className="mt-4 flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-sm font-mono font-bold transition-colors"
        >
          <span>Room Code: {lobby.room_code}</span>
          <Copy size={14} />
        </button>
      </div>

      {/* Members list */}
      <div className="card p-4 mb-4">
        <h2 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">
          Players ({members.length}/{lobby.max_players})
        </h2>
        <div className="space-y-2">
          {members.map((member) => {
            const isHostMember = member.user_id === lobby.host_id;
            const isMe = member.user_id === user?.id;
            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl ${
                  isMe ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  isHostMember ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {member.user?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="font-medium text-sm text-gray-900 dark:text-white flex-1">
                  {member.user?.username ?? 'Unknown'}
                  {isMe && <span className="text-emerald-600 dark:text-emerald-400"> (You)</span>}
                </span>
                {isHostMember && (
                  <Crown size={14} className="text-yellow-500" />
                )}
              </div>
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: lobby.max_players - members.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 p-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800" />
              <span className="text-sm text-gray-400">Waiting for player...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {isHost ? (
          <button onClick={handleClose} className="w-full btn-danger">
            <Trash2 size={16} /> Close Lobby
          </button>
        ) : isMember ? (
          <button onClick={handleLeave} disabled={leaving} className="w-full btn-danger">
            <LogOut size={16} /> {leaving ? 'Leaving...' : 'Leave Lobby'}
          </button>
        ) : lobby.status === 'open' ? (
          <button
            onClick={async () => {
              const res = await authFetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST' });
              if (res.ok) {
                toast.success('Joined lobby!');
                fetchLobby();
              } else {
                const d = await res.json();
                toast.error(d.error ?? 'Failed to join');
              }
            }}
            className="w-full btn-primary"
          >
            Join Lobby
          </button>
        ) : (
          <p className="text-center text-gray-400 text-sm">This lobby is {lobby.status}</p>
        )}
      </div>
    </div>
  );
}
