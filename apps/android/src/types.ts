export type CountryKey = 'kenya' | 'tanzania' | 'uganda' | 'rwanda' | 'ethiopia';

export type PlatformKey = 'ps' | 'xbox' | 'nintendo' | 'mobile' | 'pc';

export type GameKey =
  | 'efootball'
  | 'efootball_mobile'
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
  | 'freefire'
  | 'ludo'
  | 'fortnite'
  | 'rocketleague';

export type GameMode = '1v1' | 'lobby';

export type Plan = 'free' | 'pro' | 'elite';

export type UserRole = 'user' | 'moderator' | 'admin';

export type GameDefinition = {
  key: GameKey;
  label: string;
  platforms: PlatformKey[];
  mode: GameMode;
  maxPlayers?: number;
  supportsLobby?: boolean;
  hasLobbyScore?: boolean;
  hidden?: boolean;
  canonicalGame?: GameKey;
};

export type PlatformDefinition = {
  label: string;
  idLabel: string;
  placeholder: string;
};

export type AuthUser = {
  id: string;
  username: string;
  phone: string;
  email?: string | null;
  invite_code?: string | null;
  invited_by?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  country?: CountryKey | null;
  region?: string | null;
  platforms?: PlatformKey[];
  game_ids?: Record<string, string>;
  selected_games?: GameKey[];
  role?: UserRole;
  is_banned?: boolean;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean | null;
  xp?: number;
  level?: number;
  mp?: number;
  win_streak?: number;
  max_win_streak?: number;
  reward_points_available?: number;
  reward_points_pending?: number;
  reward_points_lifetime?: number;
  plan?: Plan;
  plan_since?: string | null;
  plan_expires_at?: string | null;
};

export type Profile = AuthUser & {
  reward_points_available?: number;
  reward_points_pending?: number;
  reward_points_lifetime?: number;
};

export type QueuePlayer = {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  region: string | null;
  game: GameKey;
  platform: PlatformKey | null;
  joined_at: string;
  wait_minutes: number;
};

export type Lobby = {
  id: string;
  title: string;
  game: GameKey;
  visibility: 'public' | 'private';
  mode?: string | null;
  map_name?: string | null;
  scheduled_for?: string | null;
  max_players: number;
  room_code?: string | null;
  status: string;
  host_id: string;
  host?: {
    id: string;
    username: string;
  } | null;
  member_count?: number;
  is_member?: boolean;
};

export type LobbyMember = {
  id: string;
  lobby_id: string;
  user_id: string;
  joined_at?: string;
  user?: {
    id: string;
    username: string;
  } | null;
};

export type MatchPlayer = {
  id: string;
  username: string;
  game_ids?: Record<string, string>;
  platforms?: PlatformKey[];
};

export type Match = {
  id: string;
  game: GameKey;
  platform?: PlatformKey | null;
  status: 'pending' | 'completed' | 'disputed' | 'cancelled' | string;
  player1_id: string;
  player2_id: string;
  winner_id?: string | null;
  player1_score?: number | null;
  player2_score?: number | null;
  player1_reported_winner?: string | null;
  player2_reported_winner?: string | null;
  created_at?: string;
  completed_at?: string | null;
  dispute_screenshot_url?: string | null;
  player1?: MatchPlayer | null;
  player2?: MatchPlayer | null;
};

export type LeaderboardEntry = {
  rank: number;
  id: string;
  username: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  rating: number;
  division: string;
  level: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  tournamentsWon: number;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  [key: string]: unknown;
};
