'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { CalendarClock, Compass, Globe, Lock, MessageCircle, Plus, Swords, Users } from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import { PlatformLogo } from '@/components/PlatformLogo';
import {
  GAMES,
  PLATFORMS,
  getSelectableGameKeys,
  supportsLobbyMode,
} from '@/lib/config';
import type { GameKey, Lobby, LobbyVisibility } from '@/types';

const WHATSAPP_GROUP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ??
  'https://chat.whatsapp.com/GRquLpTxzQ35er85N33Ec7';

function formatLobbySchedule(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function readLobbyMemberCount(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0] as { count?: unknown } | undefined;
    return typeof first?.count === 'number' ? first.count : 0;
  }

  if (value && typeof value === 'object' && 'count' in value) {
    const count = (value as { count?: unknown }).count;
    return typeof count === 'number' ? count : 0;
  }

  return 0;
}

function getLobbyVisibility(value?: LobbyVisibility | null): LobbyVisibility {
  return value === 'private' ? 'private' : 'public';
}

function LobbiesContent() {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameFilter = searchParams.get('game') as GameKey | null;

  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const lobbyGames = getSelectableGameKeys().filter((game) => supportsLobbyMode(game));

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
            <p className="app-page-eyebrow">Community rooms</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-[var(--text-primary)]">Lobbies</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
              Browse open rooms, filter by game, and join squads without mixing the creation form into discovery.
            </p>
          </div>
          <Link href={gameFilter ? `/lobbies/create?game=${gameFilter}` : '/lobbies/create'} className="btn-primary text-sm">
            <Plus size={14} /> Create Lobby
          </Link>
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

      {WHATSAPP_GROUP_URL ? (
        <div className="subtle-card mb-6 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Want faster lobby pings?
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                Join the WhatsApp group for open-room drops, squad calls, and lobby updates outside the app.
              </p>
            </div>
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              <MessageCircle size={14} />
              Join WhatsApp group
            </a>
          </div>
        </div>
      ) : null}

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
          <Link href={gameFilter ? `/lobbies/create?game=${gameFilter}` : '/lobbies/create'} className="btn-primary mt-4 inline-flex">
            <Plus size={14} /> Create Lobby
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lobbies.map((lobby) => {
            const game = GAMES[lobby.game];
            const isHost = lobby.host_id === user?.id;
            const isMember = Boolean(lobby.is_member) || isHost;
            const memberCount = readLobbyMemberCount(lobby.member_count);
            const isFull = memberCount >= lobby.max_players;
            const visibility = getLobbyVisibility(lobby.visibility);
            const displayMode = lobby.mode && lobby.mode !== 'lobby' ? lobby.mode : null;
            const displayMap = typeof lobby.map_name === 'string' && lobby.map_name.length > 0 ? lobby.map_name : null;
            const displaySchedule = formatLobbySchedule(lobby.scheduled_for);

            return (
              <div key={lobby.id} className="card p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {lobby.title}
                      </span>
                      {isHost && <span className="badge-emerald text-[10px]">Host</span>}
                      {!isHost && isMember ? (
                        <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                          Joined
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{game?.label}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      lobby.status === 'open'
                        ? 'bg-[rgba(50,224,196,0.14)] text-[var(--brand-teal)]'
                        : lobby.status === 'in_progress'
                          ? 'bg-blue-500/14 text-blue-400'
                          : 'bg-red-500/14 text-red-400'
                    }`}
                  >
                    {lobby.status === 'in_progress' ? 'Live' : lobby.status}
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

                <div className="mb-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      visibility === 'public'
                        ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)] text-[var(--brand-teal)]'
                        : 'border-[rgba(255,255,255,0.12)] bg-white/[0.04] text-white/70'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                      {visibility === 'public' ? 'Public room' : 'Private room'}
                    </span>
                  </span>
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
                  {displaySchedule ? (
                    <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock size={11} />
                        {displaySchedule}
                      </span>
                    </span>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => router.push(`/lobbies/${lobby.id}`)} className="btn-outline flex-1 py-2 text-xs">
                    View
                  </button>
                  {!isMember && !isFull && (
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
