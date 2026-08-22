import type { PassportGameEntry, PassportLibraryStats } from '@/lib/passport-game-types';
import type { PassportIdentity, PublicPassportSummary } from '@/lib/passport-types';
import type { GameKey, PlatformKey } from '@/types';

export type PassportFriendshipStatus = 'none' | 'incoming' | 'outgoing' | 'friends' | 'declined';

export type PassportSocialProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  card_accent: string;
  archetypes: string[];
  location_label: string;
};

export type PassportRelationshipState = {
  storage_ready: boolean;
  blocked: boolean;
  blocked_by_viewer: boolean;
  blocked_viewer: boolean;
  friendship_id: string | null;
  friendship_status: PassportFriendshipStatus;
  is_following: boolean;
  follows_viewer: boolean;
};

export type PassportRecommendation = {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  status: 'sent' | 'seen' | 'saved' | 'dismissed';
  source_comparison_key: string | null;
  created_at: string;
  game: {
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
    release_year: number | null;
  };
  sender: PassportSocialProfile;
};

export type PassportSocialHub = {
  storage_ready: boolean;
  friends: PassportSocialProfile[];
  incoming_requests: PassportSocialProfile[];
  outgoing_requests: PassportSocialProfile[];
  following: PassportSocialProfile[];
  followers: PassportSocialProfile[];
  recommendations: PassportRecommendation[];
  counts: {
    friends: number;
    incoming: number;
    following: number;
    followers: number;
    recommendations: number;
  };
};

export type PassportTasteFactor = {
  key: 'shared_games' | 'favorites' | 'play_style' | 'platforms' | 'genres';
  label: string;
  explanation: string;
  points: number;
  maximum: number;
};

export type PassportTasteMatch = {
  score: number | null;
  label: string;
  factors: PassportTasteFactor[];
  strongest_factors: PassportTasteFactor[];
  discovery_prompt: string | null;
};

export type PassportSharedGameComparison = {
  key: string;
  game_id: string;
  title: string;
  cover_url: string | null;
  genres: string[];
  left: PassportGameEntry;
  right: PassportGameEntry;
  same_platform: boolean;
  same_status: boolean;
  rating_difference: number | null;
};

export type PassportRivalryGame = {
  game: GameKey | string;
  matches: number;
  left_wins: number;
  right_wins: number;
  draws_or_unresolved: number;
  last_played_at: string | null;
};

export type PassportRivalry = {
  verified: true;
  total_matches: number;
  left_wins: number;
  right_wins: number;
  draws_or_unresolved: number;
  leader: 'left' | 'right' | 'tied' | 'none';
  by_game: PassportRivalryGame[];
  latest_match_at: string | null;
};

export type PassportComparisonPlayer = {
  identity: PassportIdentity;
  summary: PublicPassportSummary | null;
  library_stats: PassportLibraryStats;
};

export type PassportChallengeOption = {
  game: GameKey;
  platform: PlatformKey;
  label: string;
};

export type PassportComparisonData = {
  access: 'public' | 'friend';
  comparison_key: string;
  left: PassportComparisonPlayer;
  right: PassportComparisonPlayer;
  shared_games: PassportSharedGameComparison[];
  left_only_games: PassportGameEntry[];
  right_only_games: PassportGameEntry[];
  taste_match: PassportTasteMatch;
  rivalry: PassportRivalry;
  mutual_friends: PassportSocialProfile[];
  mutual_teams: Array<{ id: string; name: string; slug: string; avatar_url: string | null }>;
  relationship: PassportRelationshipState | null;
  challenge_options: PassportChallengeOption[];
  generated_at: string;
};

export type PassportComparisonResult =
  | { data: PassportComparisonData; error: null; status: 200 }
  | { data: null; error: string; status: 403 | 404 | 409 | 500 };
