'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Compass, Globe, Lock, Plus, Swords, Users, X } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { PlatformLogo } from '@/components/PlatformLogo';
import {
  GAMES,
  PLATFORMS,
  getDefaultLobbyMap,
  getDefaultLobbyMode,
  getLobbyModeOptions,
  getLobbyPopularMaps,
} from '@/lib/config';
import type { GameKey, Lobby } from '@/types';

function createLobbyDraft(game: GameKey) {
  return {
    game,
    title: '',
    mode: getDefaultLobbyMode(game),
    map_name: getDefaultLobbyMap(game),
  };
}

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
  const [newLobby, setNewLobby] = useState(() => createLobbyDraft(gameFilter ?? 'codm'));

  const lobbyGames = (Object.keys(GAMES) as GameKey[]).filter(
    (game) => GAMES[game].mode === 'lobby'
  );

  const fetchLobbies = useCallback(async () => {
    setLoading(true);
    try {
      const url = gameFilter ? `/api/lobbies?game=${gameFilter}` : '/api/lobbies';
      const res = await authFetch(url);

      if (res.ok) {
        const data = await res.json();
        setLobbies(data.lobbies);
        return;
      }

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json().catch(() => ({ error: 'Could not load lobbies' }));
      toast.error(data.error ?? 'Could not load lobbies');
      setLobbies([]);
    } catch {
      toast.error('Could not load lobbies');
      setLobbies([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, gameFilter, router]);

  useEffect(() => {
    void fetchLobbies();
  }, [fetchLobbies]);

  useEffect(() => {
    if (!gameFilter || GAMES[gameFilter]?.mode !== 'lobby') {
      return;
    }

    setNewLobby((current) => {
      if (current.game === gameFilter) {
        return current;
      }

      return { ...createLobbyDraft(gameFilter), title: current.title };
    });
  }, [gameFilter]);

  const modeOptions = getLobbyModeOptions(newLobby.game);
  const mapOptions = getLobbyPopularMaps(newLobby.game);

  const handleCreate = async () => {
    if (!newLobby.title.trim()) {
      toast.error('Enter a lobby title');
      return;
    }

    if (modeOptions.length > 0 && !newLobby.mode.trim()) {
      toast.error('Select a game mode');
      return;
    }

    if (mapOptions.length > 0 && !newLobby.map_name.trim()) {
      toast.error('Pick a map or type your own');
      return;
    }

    setCreating(true);
    try {
      const res = await authFetch('/api/lobbies', {
        method: 'POST',
        body: JSON.stringify(newLobby),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create lobby');
        return;
      }
      toast.success('Lobby created!');
      setShowCreate(false);
      router.push(`/lobbies/${data.lobby.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (lobbyId: string) => {
    setJoiningId(lobbyId);
    try {
      const res = await authFetch(`/api/lobbies/${lobbyId}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to join');
        return;
      }
      router.push(`/lobbies/${lobbyId}`);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="card circuit-panel mb-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="brand-kicker">Community Rooms</p>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-[var(--text-primary)]">
              Lobbies
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Create organized rooms for team titles, drop into open scrims, and keep your squad play moving.
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <Plus size={14} /> Create Lobby
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => router.push('/lobbies')}
          className={`flex-shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
            !gameFilter
              ? 'bg-[var(--brand-coral)] text-[var(--brand-night)]'
              : 'border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
          }`}
        >
          All
        </button>
        {lobbyGames.map((game) => (
          <button
            key={game}
            onClick={() => router.push(`/lobbies?game=${game}`)}
            className={`flex-shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium transition-all ${
              gameFilter === game
                ? 'bg-[var(--brand-coral)] text-[var(--brand-night)]'
                : 'border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
            }`}
          >
            {GAMES[game].label}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4" onClick={() => setShowCreate(false)}>
          <div className="card w-full max-w-md p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="brand-kicker">New Room</p>
                <h2 className="mt-2 font-semibold text-[var(--text-primary)]">Create Lobby</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="icon-button">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Game</label>
                <select
                  value={newLobby.game}
                  onChange={(e) => {
                    const nextGame = e.target.value as GameKey;
                    setNewLobby((current) => ({
                      ...createLobbyDraft(nextGame),
                      title: current.title,
                    }));
                  }}
                  className="input"
                >
                  {lobbyGames.map((game) => (
                    <option key={game} value={game}>
                      {GAMES[game].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={newLobby.title}
                  onChange={(e) => setNewLobby({ ...newLobby, title: e.target.value })}
                  placeholder="e.g. Ranked warmup room"
                  className="input"
                  maxLength={60}
                />
              </div>
              {modeOptions.length > 0 ? (
                <div>
                  <label className="label">Game mode</label>
                  <select
                    value={newLobby.mode}
                    onChange={(e) => setNewLobby({ ...newLobby, mode: e.target.value })}
                    className="input"
                  >
                    {modeOptions.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {mapOptions.length > 0 ? (
                <div>
                  <label className="label">Map</label>
                  <input
                    type="text"
                    list={`lobby-map-options-${newLobby.game}`}
                    value={newLobby.map_name}
                    onChange={(e) => setNewLobby({ ...newLobby, map_name: e.target.value })}
                    placeholder="Pick a popular map or type your own"
                    className="input"
                    maxLength={40}
                  />
                  <datalist id={`lobby-map-options-${newLobby.game}`}>
                    {mapOptions.map((mapName) => (
                      <option key={mapName} value={mapName}>
                        {mapName}
                      </option>
                    ))}
                  </datalist>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mapOptions.map((mapName) => (
                      <button
                        key={mapName}
                        type="button"
                        onClick={() => setNewLobby({ ...newLobby, map_name: mapName })}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                          newLobby.map_name === mapName
                            ? 'border-[rgba(50,224,196,0.32)] bg-[rgba(50,224,196,0.16)] text-[var(--text-primary)]'
                            : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {mapName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
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

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 shimmer" />
          ))}
        </div>
      ) : lobbies.length === 0 ? (
        <div className="card py-20 text-center text-[var(--text-soft)]">
          <Globe size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-[var(--text-primary)]">No open lobbies</p>
          <p className="mt-1 text-xs">Be the first to open a room for your community.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            <Plus size={14} /> Create Lobby
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lobbies.map((lobby) => {
            const game = GAMES[lobby.game];
            const isHost = lobby.host_id === user?.id;
            const memberCount = (lobby.member_count as unknown as number) ?? 0;
            const isFull = memberCount >= lobby.max_players;
            const displayMode = lobby.mode && lobby.mode !== 'lobby' ? lobby.mode : null;
            const displayMap = typeof lobby.map_name === 'string' && lobby.map_name.length > 0 ? lobby.map_name : null;

            return (
              <div key={lobby.id} className="card p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {lobby.title}
                      </span>
                      {isHost && <span className="badge-emerald text-[10px]">Host</span>}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{game?.label}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium">
                    {lobby.status === 'open' ? (
                      <>
                        <Globe size={11} className="text-[var(--brand-teal)]" />
                        <span className="text-[var(--brand-teal)]">Open</span>
                      </>
                    ) : (
                      <>
                        <Lock size={11} className="text-red-500" />
                        <span className="text-red-500">Full</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-3 text-xs text-[var(--text-soft)]">
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {memberCount}/{lobby.max_players}
                  </span>
                  {game?.platforms.map((platform) => (
                    <span key={platform} title={PLATFORMS[platform]?.label}>
                      <PlatformLogo platform={platform} size={14} />
                    </span>
                  ))}
                </div>

                {lobby.host && (
                  <p className="mb-3 text-xs text-[var(--text-soft)]">
                    Host: {(lobby.host as { username: string }).username}
                  </p>
                )}

                {displayMode || displayMap ? (
                  <div className="mb-3 flex flex-wrap gap-2">
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

                <div className="flex gap-2">
                  <button onClick={() => router.push(`/lobbies/${lobby.id}`)} className="btn-outline flex-1 py-2 text-xs">
                    View
                  </button>
                  {!isHost && !isFull && (
                    <button
                      onClick={() => handleJoin(lobby.id)}
                      disabled={joiningId === lobby.id}
                      className="btn-primary flex-1 py-2 text-xs"
                    >
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
    <Suspense
      fallback={
        <div className="page-container">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-32 shimmer" />
            ))}
          </div>
        </div>
      }
    >
      <LobbiesContent />
    </Suspense>
  );
}
