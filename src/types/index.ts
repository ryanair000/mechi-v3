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
  | 'rocketleague';

export type GameMode = '1v1' | 'lobby';
export type UserRole = 'user' | 'moderator' | 'admin';
export type TournamentStatus = 'open' | 'full' | 'active' | 'completed' | 'cancelled';
export type TournamentPaymentStatus = 'pending' | 'paid' | 'free' | 'failed' | 'refunded';
export type TournamentMatchStatus = 'pending' | 'ready' | 'active' | 'completed' | 'bye';

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

export interface GamificationAchievement {
  key: string;
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
  mpReward: number;
}

export interface GamificationResult {
  xpEarned: number;
  mpEarned: number;
  newLevel: number;
  leveledUp: boolean;
  newStreak: number;
  newAchievements: GamificationAchievement[];
}

export interface Profile {
  id: string;
  username: string;
  phone: string;
  email?: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean;
  role?: UserRole;
  is_banned?: boolean;
  ban_reason?: string | null;
  banned_at?: string | null;
  banned_by?: string | null;
  password_hash: string;
  region: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  selected_games: GameKey[];
  rating_efootball: number;
  rating_efootball_mobile: number;
  rating_fc26: number;
  rating_mk11: number;
  rating_nba2k26: number;
  rating_tekken8: number;
  rating_sf6: number;
  wins_efootball: number;
  wins_efootball_mobile: number;
  wins_fc26: number;
  wins_mk11: number;
  wins_nba2k26: number;
  wins_tekken8: number;
  wins_sf6: number;
  losses_efootball: number;
  losses_efootball_mobile: number;
  losses_fc26: number;
  losses_mk11: number;
  losses_nba2k26: number;
  losses_tekken8: number;
  losses_sf6: number;
  xp?: number;
  level?: number;
  mp?: number;
  win_streak?: number;
  max_win_streak?: number;
  last_match_date?: string | null;
  created_at: string;
}

export interface QueueEntry {
  id: string;
  user_id: string;
  game: GameKey;
  platform?: PlatformKey | null;
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
  platform?: PlatformKey | null;
  tournament_id?: string | null;
  region: string;
  status: MatchStatus;
  winner_id: string | null;
  player1_reported_winner: string | null;
  player2_reported_winner: string | null;
  rating_change_p1: number | null;
  rating_change_p2: number | null;
  dispute_screenshot_url: string | null;
  dispute_requested_by: string | null;
  gamification_summary_p1?: GamificationResult | null;
  gamification_summary_p2?: GamificationResult | null;
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

export interface Tournament {
  id: string;
  slug: string;
  title: string;
  game: GameKey;
  platform?: PlatformKey | null;
  region: string;
  size: 4 | 8 | 16;
  entry_fee: number;
  prize_pool: number;
  platform_fee: number;
  platform_fee_rate: number;
  status: TournamentStatus;
  bracket: unknown | null;
  winner_id: string | null;
  organizer_id: string;
  rules: string | null;
  payout_status?: 'none' | 'pending' | 'paid' | 'failed';
  payout_ref?: string | null;
  payout_error?: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  organizer?: Pick<Profile, 'id' | 'username' | 'email'>;
  winner?: Pick<Profile, 'id' | 'username'> | null;
  player_count?: number;
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  user_id: string;
  seed: number | null;
  payment_status: TournamentPaymentStatus;
  payment_ref: string | null;
  payment_access_code: string | null;
  joined_at: string;
  user?: Pick<Profile, 'id' | 'username' | 'email' | 'phone'>;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  match_id: string | null;
  round: number;
  slot: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: TournamentMatchStatus;
  created_at: string;
  player1?: Pick<Profile, 'id' | 'username'> | null;
  player2?: Pick<Profile, 'id' | 'username'> | null;
  winner?: Pick<Profile, 'id' | 'username'> | null;
}

export interface AuthUser {
  id: string;
  username: string;
  phone: string;
  email?: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  whatsapp_number?: string | null;
  whatsapp_notifications?: boolean;
  region: string;
  platforms: PlatformKey[];
  game_ids: Record<string, string>;
  selected_games: GameKey[];
  role?: UserRole;
  is_banned?: boolean;
  xp?: number;
  level?: number;
  mp?: number;
  win_streak?: number;
  max_win_streak?: number;
}

export interface JWTPayload {
  sub: string;
  username: string;
  role?: UserRole;
  is_banned?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: 'user' | 'match' | 'tournament' | 'system';
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin?: { id: string; username: string } | null;
}

export interface AdminUser {
  id: string;
  username: string;
  phone: string;
  email: string | null;
  region: string;
  role: UserRole;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  selected_games: string[];
  created_at: string;
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
