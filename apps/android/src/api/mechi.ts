import { apiRequest } from './client';
import type {
  AuthResponse,
  AuthUser,
  GameKey,
  LeaderboardEntry,
  Lobby,
  LobbyMember,
  Match,
  PlatformKey,
  Profile,
  QueuePlayer,
} from '../types';

export type LoginPayload = {
  identifier: string;
  password: string;
  login_method?: 'auto' | 'phone' | 'email' | 'username';
};

export type RegisterPayload = {
  username: string;
  phone: string;
  email: string;
  password: string;
  country: string;
  region: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  selected_games: GameKey[];
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean;
  invite_code?: string | null;
};

export type ProfilePatchPayload = Partial<{
  country: string;
  region: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  selected_games: GameKey[];
  avatar_url: string | null;
  cover_url: string | null;
  whatsapp_number: string | null;
  whatsapp_notifications: boolean;
}>;

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: {
      ...payload,
      login_method: payload.login_method ?? 'auto',
    },
  });
}

export function register(payload: RegisterPayload) {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: payload,
  });
}

export function getMe() {
  return apiRequest<{ user: AuthUser }>('/api/auth/me');
}

export function getProfile() {
  return apiRequest<{ profile: Profile }>('/api/users/profile');
}

export function patchProfile(payload: ProfilePatchPayload) {
  return apiRequest<{ profile: Profile }>('/api/users/profile', {
    method: 'PATCH',
    body: payload,
  });
}

export function joinQueue(payload: { game: GameKey; platform?: PlatformKey | null }) {
  return apiRequest<{ entry: unknown }>('/api/queue/join', {
    method: 'POST',
    body: payload,
  });
}

export function leaveQueue() {
  return apiRequest<{ success?: boolean }>('/api/queue/leave', {
    method: 'POST',
  });
}

export function getActiveQueue(limit = 80) {
  return apiRequest<{ players: QueuePlayer[]; updated_at: string }>(`/api/queue/active?limit=${limit}`);
}

export function getCurrentMatch() {
  return apiRequest<{ match: Match | null }>('/api/matches/current');
}

export function getMatch(id: string) {
  return apiRequest<{ match: Match }>(`/api/matches/${encodeURIComponent(id)}`);
}

export function submitMatchResult(
  id: string,
  payload:
    | { winner_id: string }
    | {
        player1_score: number;
        player2_score: number;
      }
) {
  return apiRequest<{
    status: string;
    winner_id?: string | null;
    player1_score?: number | null;
    player2_score?: number | null;
    gamification?: unknown;
  }>(`/api/matches/${encodeURIComponent(id)}/report`, {
    method: 'POST',
    body: payload,
  });
}

export function uploadDisputeScreenshot(params: {
  matchId: string;
  uri: string;
  name?: string;
  mimeType?: string;
}) {
  const form = new FormData();
  form.append('screenshot', {
    uri: params.uri,
    name: params.name ?? `match-${params.matchId}.jpg`,
    type: params.mimeType ?? 'image/jpeg',
  } as unknown as Blob);

  return apiRequest<{ screenshot_url: string }>(
    `/api/matches/${encodeURIComponent(params.matchId)}/dispute`,
    {
      method: 'POST',
      body: form,
    }
  );
}

export function getLobbies(game?: GameKey) {
  const query = game ? `?game=${encodeURIComponent(game)}` : '';
  return apiRequest<{ lobbies: Lobby[] }>(`/api/lobbies${query}`);
}

export function getLobby(id: string) {
  return apiRequest<{ lobby: Lobby; members: LobbyMember[] }>(`/api/lobbies/${encodeURIComponent(id)}`);
}

export function createLobby(payload: {
  game: GameKey;
  title: string;
  visibility: 'public' | 'private';
  mode: string;
  map_name?: string | null;
  scheduled_for: string;
}) {
  return apiRequest<{ lobby: Lobby }>('/api/lobbies', {
    method: 'POST',
    body: payload,
  });
}

export function joinLobby(id: string) {
  return apiRequest<{ member: LobbyMember }>(`/api/lobbies/${encodeURIComponent(id)}/join`, {
    method: 'POST',
  });
}

export function submitLobbyResult(
  id: string,
  payload: { placement: number; kills: number; total_players?: number }
) {
  return apiRequest<{
    ok: boolean;
    score_gained: number;
    new_total: number;
    placement: number;
    kills: number;
    game: GameKey;
    game_label: string;
  }>(`/api/lobbies/${encodeURIComponent(id)}/result`, {
    method: 'POST',
    body: payload,
  });
}

export function getLeaderboard(game: GameKey) {
  return apiRequest<{ leaderboard: LeaderboardEntry[]; game: GameKey }>(
    `/api/users/leaderboard/${encodeURIComponent(game)}`
  );
}
