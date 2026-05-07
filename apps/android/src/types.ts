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

export type OnlineTournamentGameKey = Extract<GameKey, 'pubgm' | 'codm' | 'efootball'>;

export type UserRole = 'user' | 'moderator' | 'admin';

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
};

export type Profile = AuthUser;

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  [key: string]: unknown;
};

export type OnlineTournamentGameRegistrationCount = {
  registered: number;
  slots: number;
  spotsLeft: number;
  full: boolean;
};

export type OnlineTournamentRegistration = {
  id: string;
  game: OnlineTournamentGameKey;
  in_game_username: string;
  instagram_username: string | null;
  youtube_name: string | null;
  followed_instagram: boolean;
  subscribed_youtube: boolean;
  reward_eligible: boolean;
  eligibility_status: string;
  check_in_status: string;
  created_at: string;
  updated_at: string;
};

export type OnlineTournamentRegistrationSummary = {
  games: Record<OnlineTournamentGameKey, OnlineTournamentGameRegistrationCount>;
  registrations: OnlineTournamentRegistration[];
};

export type OnlineTournamentSafeRegistration = OnlineTournamentRegistration & {
  user_id: string;
  username: string;
};

export type OnlineTournamentRoom = {
  id: string;
  game: Extract<OnlineTournamentGameKey, 'pubgm' | 'codm'>;
  match_number: number;
  title: string | null;
  map_name: string | null;
  room_id: string | null;
  room_password: string | null;
  instructions: string | null;
  starts_at: string | null;
  release_at: string | null;
  status: string;
  credentials_released?: boolean;
};

export type OnlineTournamentFixture = {
  id: string;
  game: 'efootball';
  round: string;
  round_label: string;
  slot: number;
  player1_registration_id: string | null;
  player2_registration_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  winner_registration_id: string | null;
  status: string;
  admin_note: string | null;
  player1: OnlineTournamentSafeRegistration | null;
  player2: OnlineTournamentSafeRegistration | null;
  winner: OnlineTournamentSafeRegistration | null;
};

export type OnlineTournamentStanding = {
  rank: number;
  registration: OnlineTournamentSafeRegistration;
  totalKills: number;
  matchKills: Record<1 | 2 | 3, number>;
  bestSingleMatchKills: number;
  finalMatchPlacement: number | null;
  verifiedSubmissionCount: number;
};

export type OnlineTournamentResultSubmission = {
  id: string;
  game: OnlineTournamentGameKey;
  registration_id: string | null;
  user_id: string | null;
  room_id: string | null;
  fixture_id: string | null;
  match_number: number | null;
  kills: number | null;
  placement: number | null;
  player1_score: number | null;
  player2_score: number | null;
  screenshot_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type OnlineTournamentPayout = {
  id: string;
  game: OnlineTournamentGameKey;
  placement: number;
  registration_id: string | null;
  prize_label: string;
  prize_value_kes: number | null;
  reward_type: 'cash' | 'uc' | 'cp' | 'coins';
  eligibility_status: string;
  payout_status: string;
  payout_ref: string | null;
  admin_note: string | null;
};

export type OnlineTournamentPlayerState = {
  roster: OnlineTournamentSafeRegistration[];
  myRegistrations: OnlineTournamentRegistration[];
  rooms: OnlineTournamentRoom[];
  fixtures: OnlineTournamentFixture[];
  standings: Partial<Record<Extract<OnlineTournamentGameKey, 'pubgm' | 'codm'>, OnlineTournamentStanding[]>>;
  mySubmissions: OnlineTournamentResultSubmission[];
  payouts: OnlineTournamentPayout[];
};
