'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Crown, LogOut, Trash2, Users } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { GameKey, Lobby, LobbyMember } from '@/types';

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
    void fetchLobby();
    const interval = setInterval(() => {
      void fetchLobby();
    }, 10000);

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
    if (!lobby?.room_code) return;
    navigator.clipboard.writeText(lobby.room_code);
    toast.success('Room code copied!');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-32 shimmer" />
          <div className="h-48 shimmer" />
        </div>
      </div>
    );
  }

  if (!lobby) return null;

  const game = GAMES[lobby.game as GameKey];
  const isHost = lobby.host_id === user?.id;
  const isMember = members.some((member) => member.user_id === user?.id);

  return (
    <div className="page-container">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => router.back()} className="brand-link mb-5 inline-flex items-center gap-2 text-sm font-medium">
          <ArrowLeft size={14} /> Back to Lobbies
        </button>

        <div className="card circuit-panel mb-6 p-6">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="brand-kicker">{game?.label}</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--text-primary)]">
                {lobby.title}
              </h1>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                lobby.status === 'open'
                  ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)] text-[var(--brand-teal)]'
                  : lobby.status === 'full'
                    ? 'border-red-500/20 bg-red-500/10 text-red-500'
                    : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)]'
              }`}
            >
              {lobby.status}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <Users size={13} />
              <span>
                {members.length}/{lobby.max_players}
              </span>
            </div>
            <div className="flex gap-1">
              {game?.platforms.map((platform) => (
                <span key={platform}>{PLATFORMS[platform]?.icon}</span>
              ))}
            </div>
          </div>
          <button onClick={copyRoomCode} className="btn-outline mt-4 w-full sm:w-auto">
            Room Code: {lobby.room_code} <Copy size={12} className="text-[var(--text-soft)]" />
          </button>
        </div>

        <div className="card mb-4 p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Players ({members.length}/{lobby.max_players})
          </h2>
          <div className="space-y-2">
            {members.map((member) => {
              const memberIsHost = member.user_id === lobby.host_id;
              const isMe = member.user_id === user?.id;

              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 rounded-xl p-2.5 ${
                    isMe ? 'surface-live' : 'bg-[var(--surface-strong)]'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                      memberIsHost
                        ? 'bg-[rgba(255,107,107,0.14)] text-[var(--brand-coral)]'
                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {member.user?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
                    {member.user?.username ?? 'Unknown'}
                    {isMe && <span className="text-xs text-[var(--brand-teal)]"> (You)</span>}
                  </span>
                  {memberIsHost && <Crown size={12} className="text-[var(--brand-coral)]" />}
                </div>
              );
            })}
            {Array.from({ length: lobby.max_players - members.length }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border-color)] p-2.5"
              >
                <div className="h-8 w-8 rounded-lg bg-[var(--surface-strong)]" />
                <span className="text-sm text-[var(--text-soft)]">Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {isHost ? (
            <button onClick={handleClose} className="btn-danger w-full">
              <Trash2 size={14} /> Close Lobby
            </button>
          ) : isMember ? (
            <button onClick={handleLeave} disabled={leaving} className="btn-danger w-full">
              <LogOut size={14} /> {leaving ? 'Leaving...' : 'Leave Lobby'}
            </button>
          ) : lobby.status === 'open' ? (
            <button
              onClick={async () => {
                const res = await authFetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST' });
                if (res.ok) {
                  toast.success('Joined lobby!');
                  void fetchLobby();
                } else {
                  const data = await res.json();
                  toast.error(data.error ?? 'Failed to join');
                }
              }}
              className="btn-primary w-full"
            >
              Join Lobby
            </button>
          ) : (
            <p className="text-center text-sm text-[var(--text-soft)]">
              This lobby is {lobby.status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
