'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CalendarClock, Compass, Globe, Lock, Plus } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import {
  GAMES,
  getDefaultLobbyMap,
  getDefaultLobbyMode,
  getLobbyModeOptions,
  getLobbyPopularMaps,
  getSelectableGameKeys,
  supportsLobbyMode,
} from '@/lib/config';
import type { GameKey, LobbyVisibility } from '@/types';

const LOBBY_VISIBILITY_OPTIONS: LobbyVisibility[] = ['public', 'private'];

function toDateTimeLocalValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function getDefaultLobbyScheduleValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return toDateTimeLocalValue(date);
}

function createLobbyDraft(game: GameKey) {
  return {
    game,
    title: '',
    visibility: 'public' as LobbyVisibility,
    mode: getDefaultLobbyMode(game),
    map_name: getDefaultLobbyMap(game),
    scheduled_for: getDefaultLobbyScheduleValue(),
  };
}

export function CreateLobbyPageClient() {
  const authFetch = useAuthFetch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedGame = searchParams.get('game');
  const lobbyGames = useMemo(
    () => getSelectableGameKeys().filter((game) => supportsLobbyMode(game)),
    []
  );
  const initialGame = lobbyGames.includes(requestedGame as GameKey) ? (requestedGame as GameKey) : lobbyGames[0] ?? 'codm';

  const [creating, setCreating] = useState(false);
  const [newLobby, setNewLobby] = useState(() => createLobbyDraft(initialGame));

  useEffect(() => {
    if (!requestedGame || !lobbyGames.includes(requestedGame as GameKey)) {
      return;
    }

    setNewLobby((current) => {
      if (current.game === requestedGame) {
        return current;
      }

      return {
        ...createLobbyDraft(requestedGame as GameKey),
        title: current.title,
        visibility: current.visibility,
        scheduled_for: current.scheduled_for,
      };
    });
  }, [lobbyGames, requestedGame]);

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

    if (!newLobby.scheduled_for.trim()) {
      toast.error('Pick the expected date and time');
      return;
    }

    const scheduledAt = new Date(newLobby.scheduled_for);

    if (Number.isNaN(scheduledAt.getTime())) {
      toast.error('Pick a valid date and time');
      return;
    }

    if (scheduledAt.getTime() <= Date.now()) {
      toast.error('Pick a future date and time');
      return;
    }

    setCreating(true);
    try {
      const res = await authFetch('/api/lobbies', {
        method: 'POST',
        body: JSON.stringify({
          ...newLobby,
          scheduled_for: scheduledAt.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create lobby');
        return;
      }
      toast.success('Lobby created');
      router.push(`/lobbies/${data.lobby.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="app-page-eyebrow">Create lobby</p>
            <h1 className="text-2xl font-bold leading-tight text-[var(--text-primary)] sm:text-[2.2rem]">
              Start a room without the modal squeeze
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Fill in the basics first, then set the match details. Public rooms show in discovery and private rooms stay
              off the feed.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={newLobby.game ? `/lobbies?game=${newLobby.game}` : '/lobbies'} className="btn-outline text-sm">
              Back to lobbies
            </Link>
            <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm">
              <Plus size={14} />
              {creating ? 'Creating...' : 'Create lobby'}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:items-start">
        <div className="space-y-5">
          <section className="card p-5">
            <div className="mb-4">
              <p className="section-title">Basics</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Start with the game, room title, and whether this should show up in discovery.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="label">Game</label>
                <select
                  value={newLobby.game}
                  onChange={(event) => {
                    const nextGame = event.target.value as GameKey;
                    setNewLobby((current) => ({
                      ...createLobbyDraft(nextGame),
                      title: current.title,
                      visibility: current.visibility,
                      scheduled_for: current.scheduled_for,
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
                <label className="label">Lobby title</label>
                <input
                  type="text"
                  value={newLobby.title}
                  onChange={(event) => setNewLobby({ ...newLobby, title: event.target.value })}
                  placeholder="e.g. Ranked warmup room"
                  className="input"
                  maxLength={60}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Visibility</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {LOBBY_VISIBILITY_OPTIONS.map((visibility) => {
                  const isActive = newLobby.visibility === visibility;
                  const Icon = visibility === 'public' ? Globe : Lock;

                  return (
                    <button
                      key={visibility}
                      type="button"
                      onClick={() => setNewLobby({ ...newLobby, visibility })}
                      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? 'border-[rgba(50,224,196,0.32)] bg-[rgba(50,224,196,0.16)] text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon size={14} />
                      {visibility === 'public' ? 'Public room' : 'Private room'}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
                {newLobby.visibility === 'public'
                  ? 'Public rooms show in discovery and can reach more available players.'
                  : 'Private rooms stay off discovery. Share the room link directly with your squad.'}
              </p>
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-4">
              <p className="section-title">Match setup</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Add the timing and session details players need before they commit.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="label">Expected match date and time</label>
                <input
                  type="datetime-local"
                  value={newLobby.scheduled_for}
                  onChange={(event) => setNewLobby({ ...newLobby, scheduled_for: event.target.value })}
                  className="input"
                  min={toDateTimeLocalValue(new Date())}
                />
              </div>

              {modeOptions.length > 0 ? (
                <div>
                  <label className="label">Game mode</label>
                  <select
                    value={newLobby.mode}
                    onChange={(event) => setNewLobby({ ...newLobby, mode: event.target.value })}
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
            </div>

            {mapOptions.length > 0 ? (
              <div className="mt-4">
                <label className="label">Map</label>
                <input
                  type="text"
                  list={`lobby-map-options-${newLobby.game}`}
                  value={newLobby.map_name}
                  onChange={(event) => setNewLobby({ ...newLobby, map_name: event.target.value })}
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
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4">
          <section className="card p-5">
            <p className="section-title">Review</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              This is the quick read players will get before they open the room.
            </p>

            <div className="mt-4 space-y-3">
              <div className="subtle-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Game
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{GAMES[newLobby.game].label}</p>
              </div>

              <div className="subtle-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Room title
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {newLobby.title.trim() || 'Add a clear title'}
                </p>
              </div>

              <div className="subtle-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Visibility
                </p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  {newLobby.visibility === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                  {newLobby.visibility === 'public' ? 'Public room' : 'Private room'}
                </p>
              </div>

              <div className="subtle-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  Match setup
                </p>
                <div className="mt-2 space-y-2 text-sm text-[var(--text-primary)]">
                  <p className="inline-flex items-center gap-2">
                    <CalendarClock size={14} />
                    {newLobby.scheduled_for ? newLobby.scheduled_for.replace('T', ' ') : 'Choose a time'}
                  </p>
                  {newLobby.mode ? (
                    <p className="inline-flex items-center gap-2">
                      <Compass size={14} />
                      {newLobby.mode}
                    </p>
                  ) : null}
                  {newLobby.map_name ? (
                    <p className="text-[var(--text-secondary)]">{newLobby.map_name}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <button onClick={handleCreate} disabled={creating} className="btn-primary mt-4 w-full">
              <Plus size={14} />
              {creating ? 'Creating...' : 'Create lobby'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
