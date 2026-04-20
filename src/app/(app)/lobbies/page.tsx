'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  Globe,
  Lock,
  MessageCircle,
  Plus,
  Users,
} from 'lucide-react';
import { useAuth, useAuthFetch } from '@/components/AuthProvider';
import {
  GAMES,
  getSelectableGameKeys,
  supportsLobbyMode,
} from '@/lib/config';
import type { GameKey, Lobby, LobbyVisibility } from '@/types';

const WHATSAPP_GROUP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL ??
  'https://chat.whatsapp.com/GRquLpTxzQ35er85N33Ec7';

function formatLobbySchedule(value?: string | null) {
  if (!value) {
    return 'Any time';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Any time';
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

function getStatusLabel(status: Lobby['status']) {
  return status === 'in_progress' ? 'Live' : status === 'open' ? 'Open' : 'Closed';
}

function getStatusClasses(status: Lobby['status']) {
  if (status === 'in_progress') {
    return 'bg-[rgba(96,165,250,0.14)] text-[#93c5fd] border-[rgba(96,165,250,0.2)]';
  }

  if (status === 'open') {
    return 'bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)] border-[rgba(50,224,196,0.2)]';
  }

  return 'bg-red-500/12 text-red-300 border-red-400/20';
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
        const data = (await res.json()) as { lobbies?: Lobby[] };
        setLobbies(data.lobbies ?? []);
        return;
      }

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = (await res.json().catch(() => ({ error: 'Could not load lobbies' }))) as {
        error?: string;
      };
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
      const data = (await res.json()) as { error?: string };
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
    <div className="page-container space-y-5">
      <section className="card circuit-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <p className="section-title">Community Rooms</p>
            <h1 className="mt-3 text-[1.55rem] font-black leading-[1.05] text-[var(--text-primary)] sm:text-[2rem]">
              Lobbies
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Create organized rooms for team titles, join open scrims, or keep private squad plans off the public feed.
            </p>
          </div>

          <Link
            href={gameFilter ? `/lobbies/create?game=${gameFilter}` : '/lobbies/create'}
            className="btn-primary text-sm"
          >
            <Plus size={14} />
            Create lobby
          </Link>
        </div>
      </section>

      {WHATSAPP_GROUP_URL ? (
        <section className="subtle-card p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Want faster lobby pings?
              </p>
              <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)]">
                Join the WhatsApp group for open-room drops and squad calls outside the app.
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
        </section>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => router.push('/lobbies')}
          className={`flex-shrink-0 rounded-md border px-3 py-2 text-xs font-semibold transition-all ${
            !gameFilter
              ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
              : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
          }`}
        >
          All Games
        </button>
        {lobbyGames.map((game) => (
          <button
            key={game}
            onClick={() => router.push(`/lobbies?game=${game}`)}
            className={`flex-shrink-0 rounded-md border px-3 py-2 text-xs font-semibold transition-all ${
              gameFilter === game
                ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.12)] text-[var(--accent-secondary-text)]'
                : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-soft)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
            }`}
          >
            {GAMES[game].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card overflow-hidden">
          <div className="space-y-0">
            {[1, 2, 3, 4].map((item, index) => (
              <div
                key={item}
                className={`px-4 py-4 ${index < 3 ? 'border-b border-[var(--border-color)]' : ''}`}
              >
                <div className="h-16 shimmer rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : lobbies.length === 0 ? (
        <div className="card py-20 text-center text-[var(--text-soft)]">
          <Globe size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-[var(--text-primary)]">No open lobbies</p>
          <p className="mt-1 text-xs">Be the first to open a room for your community.</p>
          <Link
            href={gameFilter ? `/lobbies/create?game=${gameFilter}` : '/lobbies/create'}
            className="btn-primary mt-4 inline-flex"
          >
            <Plus size={14} />
            Create lobby
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-color)] bg-[var(--surface)] lg:block">
            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_100px_130px_110px_90px] gap-4 border-b border-[var(--border-color)] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-soft)]">
              <span>Room</span>
              <span>Mode / Map</span>
              <span>Players</span>
              <span>Scheduled</span>
              <span className="text-center">Visibility</span>
              <span className="text-right">Action</span>
            </div>

            {lobbies.map((lobby, index) => {
              const game = GAMES[lobby.game];
              const isHost = lobby.host_id === user?.id;
              const isMember = Boolean(lobby.is_member) || isHost;
              const memberCount = readLobbyMemberCount(lobby.member_count);
              const isFull = memberCount >= lobby.max_players;
              const visibility = getLobbyVisibility(lobby.visibility);
              const progress = Math.min(100, (memberCount / Math.max(1, lobby.max_players)) * 100);
              const actionLabel = !isMember && !isFull && lobby.status === 'open' ? 'Join' : 'View';

              return (
                <div
                  key={lobby.id}
                  className={`grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_100px_130px_110px_90px] items-center gap-4 px-5 py-4 ${
                    index < lobbies.length - 1 ? 'border-b border-[var(--border-color)]' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-[var(--text-primary)]">
                        {lobby.title}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${getStatusClasses(lobby.status)}`}
                      >
                        {getStatusLabel(lobby.status)}
                      </span>
                      {isHost ? <span className="brand-chip px-2 py-0.5">Host</span> : null}
                      {!isHost && isMember ? (
                        <span className="brand-chip-coral px-2 py-0.5">Joined</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      {game?.label ?? lobby.game}
                      {lobby.host ? ` / Host: ${(lobby.host as { username: string }).username}` : ''}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {lobby.mode || 'Open room'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-soft)]">
                      {lobby.map_name || 'Map not set'}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 h-1.5 w-16 overflow-hidden rounded-full bg-[var(--border-color)]">
                      <div
                        className={isFull ? 'h-full bg-[var(--brand-coral)]' : 'h-full bg-[var(--brand-teal)]'}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-soft)]">
                      {memberCount}/{lobby.max_players}
                    </span>
                  </div>

                  <div className="text-sm text-[var(--text-secondary)]">
                    {formatLobbySchedule(lobby.scheduled_for)}
                  </div>

                  <div className="text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        visibility === 'public'
                          ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] text-[var(--accent-secondary-text)]'
                          : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                      {visibility}
                    </span>
                  </div>

                  <div className="text-right">
                    {!isMember && !isFull && lobby.status === 'open' ? (
                      <button
                        onClick={() => void handleJoin(lobby.id)}
                        disabled={joiningId === lobby.id}
                        className="btn-primary min-h-8 px-3 py-2 text-xs"
                      >
                        {joiningId === lobby.id ? 'Joining...' : actionLabel}
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/lobbies/${lobby.id}`)}
                        className="btn-outline min-h-8 px-3 py-2 text-xs"
                      >
                        {actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 lg:hidden">
            {lobbies.map((lobby) => {
              const game = GAMES[lobby.game];
              const isHost = lobby.host_id === user?.id;
              const isMember = Boolean(lobby.is_member) || isHost;
              const memberCount = readLobbyMemberCount(lobby.member_count);
              const isFull = memberCount >= lobby.max_players;
              const visibility = getLobbyVisibility(lobby.visibility);

              return (
                <div key={lobby.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          {lobby.title}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${getStatusClasses(lobby.status)}`}
                        >
                          {getStatusLabel(lobby.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        {game?.label ?? lobby.game}
                      </p>
                    </div>
                    {isHost ? <span className="brand-chip px-2 py-0.5">Host</span> : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        Mode / map
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                        {lobby.mode || 'Open room'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        {lobby.map_name || 'Map not set'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                        Players
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                        <Users size={13} className="text-[var(--accent-secondary-text)]" />
                        {memberCount}/{lobby.max_players}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border-color)]">
                        <div
                          className={isFull ? 'h-full bg-[var(--brand-coral)]' : 'h-full bg-[var(--brand-teal)]'}
                          style={{
                            width: `${Math.min(100, (memberCount / Math.max(1, lobby.max_players)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        visibility === 'public'
                          ? 'border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.08)] text-[var(--accent-secondary-text)]'
                          : 'border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                      {visibility}
                    </span>
                    {!isHost && isMember ? (
                      <span className="brand-chip-coral px-2 py-0.5">Joined</span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                      <CalendarClock size={11} />
                      {formatLobbySchedule(lobby.scheduled_for)}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => router.push(`/lobbies/${lobby.id}`)}
                      className="btn-outline flex-1 py-2 text-xs"
                    >
                      View
                    </button>
                    {!isMember && !isFull && lobby.status === 'open' ? (
                      <button
                        onClick={() => void handleJoin(lobby.id)}
                        disabled={joiningId === lobby.id}
                        className="btn-primary flex-1 py-2 text-xs"
                      >
                        {joiningId === lobby.id ? 'Joining...' : 'Join'}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function LobbiesPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container">
          <div className="card overflow-hidden">
            <div className="space-y-0">
              {[1, 2, 3].map((item, index) => (
                <div
                  key={item}
                  className={`px-4 py-4 ${index < 2 ? 'border-b border-[var(--border-color)]' : ''}`}
                >
                  <div className="h-16 shimmer rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <LobbiesContent />
    </Suspense>
  );
}
