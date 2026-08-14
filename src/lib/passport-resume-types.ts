import type { PassportIdentity } from '@/lib/passport-types';

export type PassportEventStampType =
  | 'registered' | 'checked_in' | 'attended' | 'competed'
  | 'placement' | 'staff' | 'organizer' | 'streamer';

export type PassportCompetitiveGame = {
  game: string;
  label: string;
  current_rating: number;
  peak_rating: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  tournament_entries: number;
  tournament_wins: number;
  podiums: number;
  latest_match_at: string | null;
};

export type PassportVerifiedMatch = {
  id: string;
  game: string;
  platform: string | null;
  opponent_id: string;
  opponent_username: string;
  result: 'win' | 'loss' | 'draw';
  score: string | null;
  completed_at: string;
  tournament_id: string | null;
};

export type PassportCompetitiveSeasonEntry = {
  id: string;
  season_key: string;
  title: string;
  game: string;
  current_rating: number;
  peak_rating: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  tournament_entries: number;
  tournament_wins: number;
  podiums: number;
  starts_at: string;
  ends_at: string | null;
};

export type PassportTournamentResumeEntry = {
  id: string;
  slug: string;
  title: string;
  game: string;
  status: string;
  registration_state: 'registered' | 'checked_in' | 'no_show';
  joined_at: string;
  checked_in_at: string | null;
  highest_round: number | null;
  champion: boolean;
  ended_at: string | null;
};

export type PassportTeamHistoryEntry = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  role: string;
  membership_status: string;
  joined_at: string;
  left_at: string | null;
};

export type PassportEventCredential = {
  id: string;
  verification_token: string;
  user_id: string;
  username: string;
  display_name: string;
  event_key: string;
  event_title: string;
  stamp_type: PassportEventStampType;
  credential_state: 'active' | 'revoked';
  game: string | null;
  role_label: string | null;
  placement: number | null;
  source_type: string;
  source_key: string;
  issued_by: string | null;
  issuer_username: string | null;
  issued_at: string;
  occurred_at: string;
  public_details: Record<string, unknown>;
  media_url: string | null;
  media_consent: boolean;
  revoked_at: string | null;
};

export type PassportCvSettings = {
  selected_games: string[];
  include_events: boolean;
  include_teams: boolean;
  include_achievements: boolean;
  inquiry_enabled: boolean;
  inquiry_url: string | null;
  headline: string;
};

export type PassportPublicResumeIdentity = Pick<
  PassportIdentity,
  'username' | 'display_name'
>;

export type PassportPublicCompetitiveGame = Pick<
  PassportCompetitiveGame,
  | 'game'
  | 'label'
  | 'current_rating'
  | 'peak_rating'
  | 'matches'
  | 'wins'
  | 'win_rate'
  | 'tournament_entries'
  | 'tournament_wins'
>;

export type PassportPublicVerifiedMatch = Pick<
  PassportVerifiedMatch,
  'id' | 'game' | 'opponent_username' | 'result' | 'score' | 'completed_at'
>;

export type PassportPublicCompetitiveSeasonEntry = Pick<
  PassportCompetitiveSeasonEntry,
  'id' | 'title' | 'game' | 'matches' | 'peak_rating' | 'tournament_wins'
>;

export type PassportPublicTournamentResumeEntry = Pick<
  PassportTournamentResumeEntry,
  'title' | 'game' | 'registration_state' | 'highest_round' | 'champion'
>;

export type PassportPublicTeamHistoryEntry = Pick<
  PassportTeamHistoryEntry,
  'name' | 'role' | 'membership_status' | 'joined_at'
>;

export type PassportPublicEventCredential = Pick<
  PassportEventCredential,
  'verification_token' | 'event_title' | 'stamp_type' | 'game' | 'placement' | 'occurred_at'
>;

export type PassportPublicCvPresentation = {
  headline: string;
  inquiry_url?: string;
};

export type PassportOwnerCompetitiveResume = {
  access: 'owner';
  storage_ready: boolean;
  identity: PassportIdentity;
  games: PassportCompetitiveGame[];
  seasons: PassportCompetitiveSeasonEntry[];
  matches: PassportVerifiedMatch[];
  tournaments: PassportTournamentResumeEntry[];
  teams: PassportTeamHistoryEntry[];
  events: PassportEventCredential[];
  cv_settings: PassportCvSettings;
  generated_at: string;
};

export type PassportPublicCompetitiveResume = {
  access: 'public';
  identity: PassportPublicResumeIdentity;
  games: PassportPublicCompetitiveGame[];
  seasons: PassportPublicCompetitiveSeasonEntry[];
  matches: PassportPublicVerifiedMatch[];
  tournaments: PassportPublicTournamentResumeEntry[];
  teams: PassportPublicTeamHistoryEntry[];
  events: PassportPublicEventCredential[];
  presentation: PassportPublicCvPresentation;
  generated_at: string;
};

export type PassportCompetitiveResume =
  | PassportOwnerCompetitiveResume
  | PassportPublicCompetitiveResume;

export type PassportCheckinPass = {
  id: string;
  token: string;
  check_in_url: string;
  expires_at: string;
  user_id: string;
  event_key: string;
};
