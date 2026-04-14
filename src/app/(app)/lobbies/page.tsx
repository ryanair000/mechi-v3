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
    if (res.ok) {
      const data = await res.json();
      setLobbies(data.lobbies);
    }
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">Lobbies</h1>
          <p className="text-sm text-white/40 mt-0.5">Join or create game rooms</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus size={15} /> Create
        </button>
      </div>

      {/* Game filter */}
      <div className="overflow-x-auto no-scrollbar mb-5">
        <div className="flex gap-2 pb-1" style={{ width: 'max-content' }}>
          <button
            onClick={() => router.push('/lobbies')}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
              !gameFilter ? 'bg-emerald-500 text-white' : 'bg-white/6 text-white/50 hover:bg-white/10'
            }`}
          >
            All
          </button>
          {LOBBY_GAMES.map((g) => (
            <button key={g} onClick={() => router.push(`/lobbies?game=${g}`)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                gameFilter === g ? 'bg-emerald-500 text-white' : 'bg-white/6 text-white/50 hover:bg-white/10'
              }`}>
              {GAMES[g].label}
            </button>
          ))}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-6">
          <div className="card w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">Create Lobby</h2>
              <button onClick={() => setShowCreate(false)} className="text-white/30 hover:text-white/60 p-1 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Game</label>
                <select value={newLobby.game}
                  onChange={(e) => setNewLobby({ ...newLobby, game: e.target.value as GameKey })}
                  className="input">
                  {LOBBY_GAMES.map((g) => <option key={g} value={g}>{GAMES[g].label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Title</label>
                <input type="text" value={newLobby.title}
                  onChange={(e) => setNewLobby({ ...newLobby, title: e.target.value })}
                  placeholder="e.g. Fun scrims - come join!" className="input" maxLength={60} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lobbies list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
        </div>
      ) : lobbies.length === 0 ? (
        <div className="card p-12 text-center">
          <Globe size={36} className="mx-auto mb-3 text-white/15" />
          <p className="font-semibold text-white/50">No open lobbies</p>
          <p className="text-sm text-white/25 mt-1">Be the first — create a lobby!</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            <Plus size={15} /> Create Lobby
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {lobbies.map((lobby) => {
            const game = GAMES[lobby.game];
            const isHost = lobby.host_id === user?.id;
            const memberCount = (lobby.member_count as unknown as number) ?? 0;
            const isFull = memberCount >= lobby.max_players;
            return (
              <div key={lobby.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white truncate">{lobby.title}</span>
                      {isHost && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 flex-shrink-0">Host</span>}
                    </div>
                    <p className="text-xs text-white/40 mb-2">{game?.label}</p>
                    <div className="flex items-center gap-3 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {memberCount}/{lobby.max_players}
                      </span>
                      <span className="flex items-center gap-1">
                        {lobby.status === 'open' ? (
                          <><Globe size={11} className="text-emerald-400" /><span className="text-emerald-400">Open</span></>
                        ) : (
                          <><Lock size={11} className="text-red-400" /><span className="text-red-400">Full</span></>
                        )}
                      </span>
                      {game?.platforms.map((p) => <span key={p}>{PLATFORMS[p]?.icon}</span>)}
                    </div>
                    {lobby.host && (
                      <p className="text-xs text-white/20 mt-1">
                        Host: <span className="text-white/40">{(lobby.host as { username: string }).username}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => router.push(`/lobbies/${lobby.id}`)}
                      className="text-xs px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-white/60 font-semibold transition-all active:scale-95">
                      View
                    </button>
                    {!isHost && !isFull && (
                      <button onClick={() => handleJoin(lobby.id)} disabled={joiningId === lobby.id}
                        className="btn-primary text-xs px-3 py-1.5">
                        {joiningId === lobby.id ? '...' : 'Join'}
                      </button>
                    )}
                  </div>
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
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 shimmer rounded-2xl" />)}</div>
      </div>
    }>
      <LobbiesContent />
    </Suspense>
  );
}
