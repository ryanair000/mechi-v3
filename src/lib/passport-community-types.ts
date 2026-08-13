import type { PassportSocialProfile } from '@/lib/passport-social-types';

export type PassportActivityType = 'game_completed' | 'achievement_unlocked' | 'match_completed' | 'event_credential' | 'team_joined' | 'team_achievement' | 'personal_highlight';
export type PassportActivityReaction = 'gg' | 'fire' | 'clap' | 'trophy';

export type PassportActivityItem = {
  id: string;
  actor: PassportSocialProfile;
  activity_type: PassportActivityType;
  source_type: string;
  source_id: string;
  audience: 'public' | 'friends' | 'private';
  title: string;
  summary: string;
  game: string | null;
  team_id: string | null;
  verification_token: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  reaction_counts: Record<PassportActivityReaction, number>;
  viewer_reaction: PassportActivityReaction | null;
  can_hide: boolean;
};

export type PassportActivityPreferences = {
  share_game_completions: boolean;
  share_achievements: boolean;
  share_matches: boolean;
  share_events: boolean;
  share_teams: boolean;
  notify_reactions: boolean;
  notify_circle_updates: boolean;
};

export type PassportHighlight = {
  id: string;
  source_type: string;
  source_id: string;
  title: string;
  caption: string;
  media_url: string | null;
  visibility: 'public' | 'friends' | 'private';
  display_order: number;
  created_at: string;
};

export type PassportHighlightSource = {
  source_type: 'game_entry' | 'achievement' | 'match' | 'event_credential' | 'team';
  source_id: string;
  label: string;
  occurred_at: string;
};

export type PassportGamingCircle = {
  id: string;
  owner_id: string;
  can_manage: boolean;
  name: string;
  description: string;
  members: PassportSocialProfile[];
  comparison: Array<{ game: string; players: number; total_matches: number; total_wins: number }>;
  created_at: string;
};

export type PassportPlayedTogether = {
  player: PassportSocialProfile;
  matches: number;
  latest_match_at: string;
  games: string[];
};

export type TeamPassport = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  region: string;
  avatar_url: string | null;
  recruiting: boolean;
  recruitment_status: 'open' | 'selective' | 'closed';
  recruitment_headline: string;
  contact_url: string | null;
  card_accent: string;
  supported_games: string[];
  members: Array<{ user_id: string; username: string; avatar_url: string | null; role: string; status: string; joined_at: string; left_at: string | null }>;
  tournaments: Array<{ id: string; slug: string; title: string; game: string; status: string; joined_at: string; check_in_status: string }>;
  achievements: Array<{ id: string; verification_token: string; title: string; description: string; game: string | null; source_type: string; occurred_at: string }>;
  match_summary: { completed: number; wins: number };
  can_manage: boolean;
  generated_at: string;
};

export type TeamPassportAchievementVerification = {
  id: string;
  verification_token: string;
  team_id: string;
  team_name: string;
  team_slug: string;
  title: string;
  description: string;
  game: string | null;
  source_type: string;
  source_key: string;
  occurred_at: string;
  state: 'active' | 'revoked';
  revoked_at: string | null;
  revocation_reason: string | null;
  issued_at: string;
};
