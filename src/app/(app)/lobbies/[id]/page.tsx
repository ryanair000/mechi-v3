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
      if (res.ok) { toast.success('Left lobby'); router.push('/lobbies'); }
      else { const data = await res.json(); toast.error(data.error ?? 'Failed to leave'); }
    } finally { setLeaving(false); }
  };

  const handleClose = async () => {
    if (!confirm('Close this lobby?')) return;
    const res = await authFetch(`/api/lobbies/${lobbyId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Lobby closed'); router.push('/lobbies'); }
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
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-white/40 hover:text-white/70 mb-5 text-sm font-medium transition-colors">
        <ArrowLeft size={15} /> Back to Lobbies
      </button>

      {/* Lobby header */}
      <div className="bg-blue-500/15 border border-blue-500/25 rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-wide mb-1">{game?.label}</p>
            <h1 className="font-black text-2xl text-white">{lobby.title}</h1>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            lobby.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
            lobby.status === 'full' ? 'bg-red-500/20 text-red-400' :
            'bg-white/8 text-white/40'
          }`}>
            {lobby.status}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-white/60">
          <div className="flex items-center gap-1.5">
            <Users size={13} />
            <span>{members.length}/{lobby.max_players} players</span>
          </div>
          <div className="flex gap-1">
            {game?.platforms.map((p) => <span key={p}>{PLATFORMS[p]?.icon}</span>)}
          </div>
        </div>

        <button onClick={copyRoomCode}
          className="mt-4 flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white transition-all active:scale-95 w-full justify-center">
          <span>Room Code: {lobby.room_code}</span>
          <Copy size={13} className="text-white/40" />
        </button>
      </div>

      {/* Members list */}
      <div className="card p-4 mb-4">
        <h2 className="font-bold text-white text-sm mb-3">
          Players ({members.length}/{lobby.max_players})
        </h2>
        <div className="space-y-2">
          {members.map((member) => {
            const isHostMember = member.user_id === lobby.host_id;
            const isMe = member.user_id === user?.id;
            return (
              <div key={member.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${
                isMe ? 'bg-emerald-500/8' : 'bg-white/3'
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                  isHostMember ? 'bg-blue-500/20 text-blue-400' : 'bg-white/8 text-white/50'
                }`}>
                  {member.user?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="font-medium text-sm text-white flex-1">
                  {member.user?.username ?? 'Unknown'}
                  {isMe && <span className="text-emerald-400 text-xs"> (You)</span>}
                </span>
                {isHostMember && <Crown size={13} className="text-yellow-400" />}
              </div>
            );
          })}

          {/* Empty slots */}
          {Array.from({ length: lobby.max_players - members.length }).map((_, i) => (
            <div key={`empty-${i}`}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-white/8">
              <div className="w-8 h-8 rounded-xl bg-white/4" />
              <span className="text-sm text-white/20">Waiting for player...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {isHost ? (
          <button onClick={handleClose} className="w-full btn-danger">
            <Trash2 size={15} /> Close Lobby
          </button>
        ) : isMember ? (
          <button onClick={handleLeave} disabled={leaving} className="w-full btn-danger">
            <LogOut size={15} /> {leaving ? 'Leaving...' : 'Leave Lobby'}
          </button>
        ) : lobby.status === 'open' ? (
          <button onClick={async () => {
            const res = await authFetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST' });
            if (res.ok) { toast.success('Joined lobby!'); fetchLobby(); }
            else { const d = await res.json(); toast.error(d.error ?? 'Failed to join'); }
          }} className="w-full btn-primary">
            Join Lobby
          </button>
        ) : (
          <p className="text-center text-white/30 text-sm">This lobby is {lobby.status}</p>
        )}
      </div>
    </div>
  );
}
