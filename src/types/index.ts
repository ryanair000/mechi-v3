export type PlatformKey = 'ps' | 'xbox' | 'nintendo' | 'mobile' | 'pc';

export type GameKey =
  | 'efootball'
  | 'fc26'
  | 'mk11'
  | 'nba2k26'
  | 'tekken8'
  | 'sf6'
  | 'codm'
  | 'pubgm'
  | 'cs2'
  | 'valorant'
  | 'mariokart'
  | 'smashbros'
  | 'freefirm'
  | 'rocketleague';

export type GameMode = '1v1' | 'lobby';

export interface Platform {
  label: string;
  idLabel: string;
  placeholder: string;
  icon: string;
}

export interface Game {
  label: string;
  platforms: PlatformKey[];
  mode: GameMode;
  maxPlayers?: number;
  steamAppId?: number;
}

export interface Tier {
  name: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
}

export interface Profile {
  id: string;
  username: string;
  phone: string;
  email?: string;
  password_hash: string;
  region: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  selected_games: GameKey[];
  rating_efootball: number;
  rating_fc26: number;
  rating_mk11: number;
  rating_nba2k26: number;
  rating_tekken8: number;
  rating_sf6: number;
  wins_efootball: number;
  wins_fc26: number;
  wins_mk11: number;
  wins_nba2k26: number;
  wins_tekken8: number;
  wins_sf6: number;
  losses_efootball: number;
  losses_fc26: number;
  losses_mk11: number;
  losses_nba2k26: number;
  losses_tekken8: number;
  losses_sf6: number;
  created_at: string;
}

export interface QueueEntry {
  id: string;
  user_id: string;
  game: GameKey;
  region: string;
  rating: number;
  status: 'waiting' | 'matched' | 'cancelled';
  joined_at: string;
}

export type MatchStatus = 'pending' | 'completed' | 'disputed' | 'cancelled';

export interface Match {
  id: string;
  player1_id: string;
  player2_id: string;
  game: GameKey;
  region: string;
  status: MatchStatus;
  winner_id: string | null;
  player1_reported_winner: string | null;
  player2_reported_winner: string | null;
  rating_change_p1: number | null;
  rating_change_p2: number | null;
  dispute_screenshot_url: string | null;
  dispute_requested_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface MatchWithProfiles extends Match {
  player1: Pick<Profile, 'id' | 'username' | 'game_ids' | 'platforms'>;
  player2: Pick<Profile, 'id' | 'username' | 'game_ids' | 'platforms'>;
}

export interface Suggestion {
  id: string;
  user_id: string;
  game_name: string;
  description: string;
  votes: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_voted?: boolean;
}

export interface Lobby {
  id: string;
  host_id: string;
  game: GameKey;
  mode: string;
  title: string;
  max_players: number;
  room_code: string;
  status: 'open' | 'full' | 'in_progress' | 'closed';
  created_at: string;
  member_count?: number;
  host?: Pick<Profile, 'id' | 'username'>;
}

export interface LobbyMember {
  id: string;
  lobby_id: string;
  user_id: string;
  joined_at: string;
  user?: Pick<Profile, 'id' | 'username'>;
}

export interface AuthUser {
  id: string;
  username: string;
  phone: string;
  email?: string;
  region: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  selected_games: GameKey[];
}

export interface JWTPayload {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface EloResult {
  newRatingWinner: number;
  newRatingLoser: number;
  changeWinner: number;
  changeLoser: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}
