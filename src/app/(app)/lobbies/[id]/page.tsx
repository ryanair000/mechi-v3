'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { PlatformLogo } from '@/components/PlatformLogo';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { GameKey, Lobby, LobbyMember } from '@/types';
import toast from 'react-hot-toast';
import { Users, Copy, ArrowLeft, LogOut, Crown, Trash2, Compass, Swords } from 'lucide-react';

interface LobbyDetail extends Lobby { host: { id: string; username: string }; }
interface MemberWithUser extends LobbyMember { user: { id: string; username: string }; }

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
    if (res.ok) { const data = await res.json(); setLobby(data.lobby); setMembers(data.members ?? []); }
    else router.push('/lobbies');
    setLoading(false);
  }, [authFetch, lobbyId, router]);

  useEffect(() => { fetchLobby(); const i = setInterval(fetchLobby, 10000); return () => clearInterval(i); }, [fetchLobby]);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      const res = await authFetch(`/api/lobbies/${lobbyId}/leave`, { method: 'POST' });
      if (res.ok) { toast.success('Left lobby'); router.push('/lobbies'); }
      else { const d = await res.json(); toast.error(d.error ?? 'Failed to leave'); }
    } finally { setLeaving(false); }
  };

  const handleClose = async () => {
    if (!confirm('Close this lobby?')) return;
    const res = await authFetch(`/api/lobbies/${lobbyId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Lobby closed'); router.push('/lobbies'); }
  };

  const copyRoomCode = () => {
    if (lobby?.room_code) { navigator.clipboard.writeText(lobby.room_code); toast.success('Room code copied!'); }
  };

  if (loading) {
    return <div className="page-container"><div className="max-w-2xl mx-auto space-y-4"><div className="h-32 shimmer" /><div className="h-48 shimmer" /></div></div>;
  }
  if (!lobby) return null;

  const game = GAMES[lobby.game as GameKey];
  const isHost = lobby.host_id === user?.id;
  const isMember = members.some((m) => m.user_id === user?.id);
  const displayMode = lobby.mode && lobby.mode !== 'lobby' ? lobby.mode : null;
  const displayMap = typeof lobby.map_name === 'string' && lobby.map_name.length > 0 ? lobby.map_name : null;

  return (
    <div className="page-container">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-white/30 hover:text-white/60 mb-5 text-sm font-medium transition-colors">
          <ArrowLeft size={14} /> Back to Lobbies
        </button>

        {/* Lobby header */}
        <div className="bg-blue-500/8 border border-blue-500/15 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-blue-400 text-xs font-medium uppercase tracking-wide mb-1">{game?.label}</p>
              <h1 className="font-bold text-2xl text-white">{lobby.title}</h1>
              {displayMode || displayMap ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {displayMode ? (
                    <span className="brand-chip gap-1 px-2.5 py-1">
                      <Swords size={11} />
                      {displayMode}
                    </span>
                  ) : null}
                  {displayMap ? (
                    <span className="brand-chip-coral gap-1 px-2.5 py-1">
                      <Compass size={11} />
                      {displayMap}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-lg ${
              lobby.status === 'open' ? 'bg-emerald-500/15 text-emerald-400' :
              lobby.status === 'full' ? 'bg-red-500/15 text-red-400' :
              'bg-white/[0.06] text-white/30'
            }`}>{lobby.status}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/40">
            <div className="flex items-center gap-1.5"><Users size={13} /><span>{members.length}/{lobby.max_players}</span></div>
            <div className="flex gap-1.5">
              {game?.platforms.map((platform) => (
                <span key={platform} title={PLATFORMS[platform]?.label}>
                  <PlatformLogo platform={platform} size={14} />
                </span>
              ))}
            </div>
          </div>
          <button onClick={copyRoomCode}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-2.5 text-sm font-mono font-medium text-white transition-all hover:bg-white/[0.1] sm:w-auto">
            Room Code: {lobby.room_code} <Copy size={12} className="text-white/30" />
          </button>
        </div>

        {/* Members */}
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-white text-sm mb-3">Players ({members.length}/{lobby.max_players})</h2>
          <div className="space-y-2">
            {members.map((m) => {
              const isHostM = m.user_id === lobby.host_id;
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${isMe ? 'bg-emerald-500/[0.06]' : 'bg-white/[0.02]'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isHostM ? 'bg-blue-500/15 text-blue-400' : 'bg-white/[0.06] text-white/40'}`}>
                    {m.user?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="font-medium text-sm text-white flex-1">
                    {m.user?.username ?? 'Unknown'}
                    {isMe && <span className="text-emerald-400 text-xs"> (You)</span>}
                  </span>
                  {isHostM && <Crown size={12} className="text-yellow-400" />}
                </div>
              );
            })}
            {Array.from({ length: lobby.max_players - members.length }).map((_, i) => (
              <div key={`e-${i}`} className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg bg-white/[0.03]" />
                <span className="text-sm text-white/15">Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {isHost ? (
            <button onClick={handleClose} className="w-full btn-danger"><Trash2 size={14} /> Close Lobby</button>
          ) : isMember ? (
            <button onClick={handleLeave} disabled={leaving} className="w-full btn-danger">
              <LogOut size={14} /> {leaving ? 'Leaving...' : 'Leave Lobby'}
            </button>
          ) : lobby.status === 'open' ? (
            <button onClick={async () => {
              const res = await authFetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST' });
              if (res.ok) { toast.success('Joined lobby!'); fetchLobby(); }
              else { const d = await res.json(); toast.error(d.error ?? 'Failed to join'); }
            }} className="w-full btn-primary">Join Lobby</button>
          ) : <p className="text-center text-white/20 text-sm">This lobby is {lobby.status}</p>}
        </div>
      </div>
    </div>
  );
}
