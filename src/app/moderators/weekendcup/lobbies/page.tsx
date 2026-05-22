'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, Plus, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import { WEEKEND_CUP_GAMES, isWeekendCupGame } from '@/lib/weekend-cup';
import type { WeekendCupLobby } from '@/lib/weekend-cup-match-day';

type LobbyWithPlayers = WeekendCupLobby & {
  playerCount?: number;
};

export default function WeekendCupLobbiesPage() {
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const gameParam = searchParams.get('game') ?? '';
  const game = isWeekendCupGame(gameParam) ? gameParam : 'pubgm';
  const gameConfig = WEEKEND_CUP_GAMES.find((g) => g.game === game);

  const [lobbies, setLobbies] = useState<LobbyWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const [newLobbyNumber, setNewLobbyNumber] = useState('1');
  const [newMatchNumber, setNewMatchNumber] = useState('1');
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');

  const loadLobbies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/moderators/weekendcup/lobbies?game=${encodeURIComponent(game)}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not load lobbies');
        return;
      }
      setLobbies((data.lobbies ?? []) as LobbyWithPlayers[]);
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, game]);

  useEffect(() => {
    void loadLobbies();
  }, [loadLobbies]);

  const createLobby = async () => {
    setCreating(true);
    try {
      const res = await authFetch('/api/moderators/weekendcup/lobbies', {
        method: 'POST',
        body: JSON.stringify({
          game,
          lobby_number: parseInt(newLobbyNumber, 10),
          match_number: parseInt(newMatchNumber, 10),
          room_id: newRoomId || null,
          room_password: newRoomPassword || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not create lobby');
        return;
      }
      toast.success('Lobby created');
      setNewLobbyNumber(String(parseInt(newLobbyNumber, 10) + 1));
      setNewRoomId('');
      setNewRoomPassword('');
      void loadLobbies();
    } catch {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  };

  const updateLobbyStatus = async (lobbyId: string, status: string) => {
    setActingId(lobbyId);
    try {
      const res = await authFetch('/api/moderators/weekendcup/lobbies', {
        method: 'PATCH',
        body: JSON.stringify({ lobby_id: lobbyId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Could not update lobby');
        return;
      }
      toast.success(`Lobby ${status}`);
      void loadLobbies();
    } catch {
      toast.error('Network error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <main className="page-base app-prototype-shell min-h-screen p-4 sm:p-6" data-theme="dark">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title">Weekend Cup</p>
              <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                {gameConfig?.label ?? game} Lobbies
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Create and manage match lobbies. Share room codes with players.
              </p>
            </div>
            <button type="button" onClick={() => void loadLobbies()} className="btn-ghost" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-black text-[var(--text-primary)]">Create lobby</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label">Lobby #</label>
              <input
                type="number"
                min="1"
                value={newLobbyNumber}
                onChange={(e) => setNewLobbyNumber(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Match #</label>
              <input
                type="number"
                min="1"
                value={newMatchNumber}
                onChange={(e) => setNewMatchNumber(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Room ID</label>
              <input
                type="text"
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                placeholder="Optional"
                className="input"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="text"
                value={newRoomPassword}
                onChange={(e) => setNewRoomPassword(e.target.value)}
                placeholder="Optional"
                className="input"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void createLobby()}
            disabled={creating}
            className="btn-primary mt-4"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create lobby
          </button>
        </section>

        <section className="card p-0">
          <div className="border-b border-[var(--border-color)] p-4">
            <h2 className="text-lg font-black text-[var(--text-primary)]">Active lobbies</h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-secondary)]">
              <Loader2 size={16} className="animate-spin" />
              Loading...
            </div>
          ) : lobbies.length === 0 ? (
            <p className="p-6 text-sm text-[var(--text-secondary)]">No lobbies created yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {lobbies.map((lobby) => (
                <div key={lobby.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">
                      Lobby {lobby.lobby_number} · Match {lobby.match_number}
                    </div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">
                      {lobby.room_id ? `Room: ${lobby.room_id}` : 'No room ID'}{' '}
                      {lobby.room_password ? `· Pass: ${lobby.room_password}` : ''}
                    </div>
                    <div className="mt-1">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                          lobby.status === 'completed'
                            ? 'bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                            : lobby.status === 'active'
                              ? 'bg-amber-500/14 text-amber-300'
                              : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {lobby.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {lobby.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => void updateLobbyStatus(lobby.id, 'active')}
                        disabled={actingId === lobby.id}
                        className="btn-ghost"
                      >
                        {actingId === lobby.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Start
                      </button>
                    )}
                    {lobby.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => void updateLobbyStatus(lobby.id, 'completed')}
                        disabled={actingId === lobby.id}
                        className="btn-primary"
                      >
                        {actingId === lobby.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
