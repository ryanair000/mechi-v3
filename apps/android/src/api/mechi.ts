import { apiRequest } from './client';
import type {
  AuthResponse,
  AuthUser,
  CommunityRoomResponse,
  GameKey,
  OnlineTournamentGameKey,
  OnlineTournamentPlayerState,
  OnlineTournamentRegistrationSummary,
  PlatformKey,
  Profile,
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

export type TournamentRegistrationPayload = {
  game: OnlineTournamentGameKey;
  in_game_username: string;
  followed_instagram: boolean;
  instagram_username: string;
  subscribed_youtube: boolean;
  youtube_name: string;
  available_at_8pm: boolean;
  accepted_rules: boolean;
};

export type TournamentCheckInPayload = {
  game: OnlineTournamentGameKey;
  in_game_username: string;
  game_uid: string;
  device_model: string;
  whatsapp_number: string;
  device_serial_last6?: string | null;
};

export type TournamentResultPayload =
  | {
      game: Extract<OnlineTournamentGameKey, 'pubgm' | 'codm'>;
      uri: string;
      name?: string | null;
      mimeType?: string | null;
      match_number: number;
      kills: number;
      placement: number;
    }
  | {
      game: 'efootball';
      uri: string;
      name?: string | null;
      mimeType?: string | null;
      fixture_id: string;
      player1_score: number;
      player2_score: number;
    };

export type PushTokenPayload = {
  token: string;
  platform: string;
  device_name?: string | null;
  app_version?: string | null;
  experience_id?: string | null;
};

export type TournamentStateResponse = OnlineTournamentPlayerState & {
  warning?: string;
};

export type CommunityMessagePayload = {
  message: string;
  message_type?: 'text' | 'announcement';
};

export type CommunityModerationPayload =
  | { action: 'lock' | 'unlock' | 'unpin' }
  | { action: 'pin' | 'delete_message'; message_id: string }
  | { action: 'mute_user'; user_id: string; duration_hours?: number }
  | { action: 'unmute_user'; user_id: string };

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

export function registerPushToken(payload: PushTokenPayload) {
  return apiRequest<{ success: true }>('/api/notifications/push-token', {
    method: 'POST',
    body: payload,
  });
}

export function deletePushToken(token: string) {
  return apiRequest<{ success: true }>('/api/notifications/push-token', {
    method: 'DELETE',
    body: { token },
  });
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

export function getTournamentRegistrationSummary() {
  return apiRequest<OnlineTournamentRegistrationSummary>(
    '/api/events/mechi-online-gaming-tournament/register'
  );
}

export function registerForTournament(payload: TournamentRegistrationPayload) {
  return apiRequest<OnlineTournamentRegistrationSummary>(
    '/api/events/mechi-online-gaming-tournament/register',
    {
      method: 'POST',
      body: payload,
    }
  );
}

export function getTournamentState() {
  return apiRequest<TournamentStateResponse>(
    '/api/events/mechi-online-gaming-tournament/state'
  );
}

export function checkInTournament(payload: TournamentCheckInPayload) {
  return apiRequest<TournamentStateResponse>(
    '/api/events/mechi-online-gaming-tournament/state',
    {
      method: 'POST',
      body: {
        action: 'check_in',
        ...payload,
      },
    }
  );
}

export function submitTournamentResult(payload: TournamentResultPayload) {
  const form = new FormData();
  form.append('game', payload.game);
  form.append('screenshot', {
    uri: payload.uri,
    name: payload.name ?? `playmechi-${payload.game}.jpg`,
    type: payload.mimeType ?? 'image/jpeg',
  } as unknown as Blob);

  if (payload.game === 'efootball') {
    form.append('fixture_id', payload.fixture_id);
    form.append('player1_score', String(payload.player1_score));
    form.append('player2_score', String(payload.player2_score));
  } else {
    form.append('match_number', String(payload.match_number));
    form.append('kills', String(payload.kills));
    form.append('placement', String(payload.placement));
  }

  return apiRequest<TournamentStateResponse>(
    '/api/events/mechi-online-gaming-tournament/results',
    {
      method: 'POST',
      body: form,
    }
  );
}

export function getCommunityRoom(limit = 80) {
  return apiRequest<CommunityRoomResponse>(
    `/api/community/room?limit=${encodeURIComponent(String(limit))}`
  );
}

export function sendCommunityMessage(payload: CommunityMessagePayload) {
  return apiRequest<{ message: CommunityRoomResponse['messages'][number] }>('/api/community/room', {
    method: 'POST',
    body: payload,
  });
}

export function moderateCommunityRoom(payload: CommunityModerationPayload) {
  return apiRequest<{ success: true }>('/api/community/room', {
    method: 'PATCH',
    body: payload,
  });
}
