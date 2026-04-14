'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { GAMES, PLATFORMS } from '@/lib/config';
import type { GameKey, Lobby } from '@/types';
import toast from 'react-hot-toast';
import { Plus, Users, Lock, Globe, X } from 'lucide-react';

function LobbiesContent() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameFilter = searchParams.get('game') as GameKey | null;

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [newLobby, setNewLobby] = useState({ game: gameFilter ?? 'codm', title: '' });

  const LOBBY_GAMES = (Object.keys(GAMES) as GameKey[]).filter((g) => GAMES[g].mode === 'lobby');

  const fetchLobbies = useCallback(async () => {
    setLoading(true);
    const url = gameFilter ? `/api/lobbies?game=${gameFilter}` : '/api/lobbies';
    const res = await authFetch(url);
    if (res.ok) { const data = await res.json(); setLobbies(data.lobbies); }
    setLoading(false);
  }, [authFetch, gameFilter]);

  useEffect(() => { fetchLobbies(); }, [fetchLobbies]);

  const handleCreate = async () => {
    if (!newLobby.title.trim()) { toast.error('Enter a lobby title'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/lobbies', { method: 'POST', body: JSON.stringify(newLobby) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to create lobby'); return; }
      toast.success('Lobby created!');
      setShowCreate(false);
      router.push(`/lobbies/${data.lobby.id}`);
    } finally { setCreating(false); }
  };

  const handleJoin = async (lobbyId: string) => {
    setJoiningId(lobbyId);
    try {
      const res = await authFetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to join'); return; }
      router.push(`/lobbies/${lobbyId}`);
    } finally { setJoiningId(null); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Lobbies</h1>
          <p className="text-sm text-white/30 mt-0.5">Join or create game rooms</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus size={14} /> Create
        </button>
      </div>

      {/* Game filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        <button onClick={() => router.push('/lobbies')}
          className={`flex-shrink-0 text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
            !gameFilter ? 'bg-emerald-500 text-white' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
          }`}>
          All
        </button>
        {LOBBY_GAMES.map((g) => (
          <button key={g} onClick={() => router.push(`/lobbies?game=${g}`)}
            className={`flex-shrink-0 text-xs font-medium px-3.5 py-2 rounded-lg transition-all ${
              gameFilter === g ? 'bg-emerald-500 text-white' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
            }`}>
            {GAMES[g].label}
          </button>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Create Lobby</h2>
              <button onClick={() => setShowCreate(false)} className="text-white/20 hover:text-white/40 p-1 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Game</label>
                <select value={newLobby.game} onChange={(e) => setNewLobby({ ...newLobby, game: e.target.value as GameKey })} className="input">
                  {LOBBY_GAMES.map((g) => <option key={g} value={g}>{GAMES[g].label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Title</label>
                <input type="text" value={newLobby.title} onChange={(e) => setNewLobby({ ...newLobby, title: e.target.value })}
                  placeholder="e.g. Fun scrims - come join!" className="input" maxLength={60} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lobbies grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 shimmer" />)}
        </div>
      ) : lobbies.length === 0 ? (
        <div className="text-center py-20 text-white/20">
          <Globe size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No open lobbies</p>
          <p className="text-xs mt-1 text-white/15">Be the first — create a lobby!</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            <Plus size={14} /> Create Lobby
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lobbies.map((lobby) => {
            const game = GAMES[lobby.game];
            const isHost = lobby.host_id === user?.id;
            const memberCount = (lobby.member_count as unknown as number) ?? 0;
            const isFull = memberCount >= lobby.max_players;
            return (
              <div key={lobby.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white truncate">{lobby.title}</span>
                      {isHost && <span className="badge-emerald text-[10px]">Host</span>}
                    </div>
                    <p className="text-xs text-white/30">{game?.label}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium">
                    {lobby.status === 'open' ? <><Globe size={11} className="text-emerald-400" /><span className="text-emerald-400">Open</span></>
                    : <><Lock size={11} className="text-red-400" /><span className="text-red-400">Full</span></>}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/20 mb-3">
                  <span className="flex items-center gap-1"><Users size={11} /> {memberCount}/{lobby.max_players}</span>
                  {game?.platforms.map((p) => <span key={p}>{PLATFORMS[p]?.icon}</span>)}
                </div>
                {lobby.host && <p className="text-xs text-white/15 mb-3">Host: {(lobby.host as { username: string }).username}</p>}
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/lobbies/${lobby.id}`)} className="btn-outline flex-1 text-xs py-2">View</button>
                  {!isHost && !isFull && (
                    <button onClick={() => handleJoin(lobby.id)} disabled={joiningId === lobby.id} className="btn-primary flex-1 text-xs py-2">
                      {joiningId === lobby.id ? '...' : 'Join'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LobbiesPage() {
  return (
    <Suspense fallback={
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-32 shimmer" />)}</div>
      </div>
    }>
      <LobbiesContent />
    </Suspense>
  );
}
