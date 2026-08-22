import type { CountryKey, GameKey, PlatformKey } from '@/types';
import type { PassportGameLibrary } from '@/lib/passport-game-types';
import type { PassportPublicationStatus } from '@/lib/passport-handle';

export const PASSPORT_ARCHETYPES = [
  'competitive',
  'story_explorer',
  'completionist',
  'casual',
  'trophy_hunter',
  'speedrunner',
  'mobile_gamer',
  'console_gamer',
  'pc_gamer',
  'sports_specialist',
  'fighting_specialist',
  'battle_royale_player',
  'retro_gamer',
  'tournament_organizer',
  'content_creator',
  'community_builder',
] as const;

export const PASSPORT_STATUSES = [
  'offline',
  'online',
  'looking_to_play',
  'competing',
  'story_mode',
] as const;

export const PASSPORT_VISIBILITIES = ['public', 'friends', 'private'] as const;

export const AGE_POLICY_STATUSES = ['unknown', 'minor', 'adult'] as const;
export const AGE_POLICY_SOURCES = ['self_declared', 'admin'] as const;

export const PASSPORT_FIELDS = [
  'bio',
  'gamer_since',
  'archetypes',
  'current_status',
  'location',
  'platforms',
  'games',
  'game_ids',
  'competitive',
  'events',
  'achievements',
  'teams',
  'social',
] as const;

export type PassportArchetype = (typeof PASSPORT_ARCHETYPES)[number];
export type PassportStatus = (typeof PASSPORT_STATUSES)[number];
export type PassportVisibility = (typeof PASSPORT_VISIBILITIES)[number];
export type PassportField = (typeof PASSPORT_FIELDS)[number];
export type AgePolicyStatus = (typeof AGE_POLICY_STATUSES)[number];
export type AgePolicySource = (typeof AGE_POLICY_SOURCES)[number];

export type PrivateAgePolicy = {
  status: AgePolicyStatus;
  source: AgePolicySource | null;
  updated_at: string | null;
  storage_ready: boolean;
};

export type PassportFieldVisibility = Record<PassportField, PassportVisibility>;

export const DEFAULT_PASSPORT_FIELD_VISIBILITY: PassportFieldVisibility = {
  bio: 'private',
  gamer_since: 'private',
  archetypes: 'private',
  current_status: 'private',
  location: 'private',
  platforms: 'private',
  games: 'private',
  game_ids: 'private',
  competitive: 'private',
  events: 'private',
  achievements: 'private',
  teams: 'private',
  social: 'private',
};

export const PASSPORT_ARCHETYPE_LABELS: Record<PassportArchetype, string> = {
  competitive: 'Competitive',
  story_explorer: 'Story Explorer',
  completionist: 'Completionist',
  casual: 'Casual',
  trophy_hunter: 'Trophy Hunter',
  speedrunner: 'Speedrunner',
  mobile_gamer: 'Mobile Gamer',
  console_gamer: 'Console Gamer',
  pc_gamer: 'PC Gamer',
  sports_specialist: 'Sports Specialist',
  fighting_specialist: 'Fighting Specialist',
  battle_royale_player: 'Battle Royale Player',
  retro_gamer: 'Retro Gamer',
  tournament_organizer: 'Tournament Organizer',
  content_creator: 'Content Creator',
  community_builder: 'Community Builder',
};

export const PASSPORT_STATUS_LABELS: Record<PassportStatus, string> = {
  offline: 'Offline',
  online: 'Online',
  looking_to_play: 'Looking to play',
  competing: 'Competing',
  story_mode: 'Story mode',
};

export type PassportIdentity = {
  user_id: string;
  username: string;
  public_handle: string | null;
  publication_status: PassportPublicationStatus;
  published_at: string | null;
  publication_consent_version: string | null;
  publication_consent_at: string | null;
  display_name: string;
  bio: string;
  gamer_since: number | null;
  archetypes: PassportArchetype[];
  current_status: PassportStatus;
  default_visibility: PassportVisibility;
  field_visibility: PassportFieldVisibility;
  is_discoverable: boolean;
  card_accent: string;
  avatar_url: string | null;
  cover_url: string | null;
  country: CountryKey | null;
  region: string | null;
  location_label: string;
  platforms: PlatformKey[];
  games: GameKey[];
  game_ids: Record<string, string>;
  created_at?: string | null;
  updated_at?: string | null;
  storage_ready: boolean;
};

export type PassportSummary = {
  games_count: number;
  playing_games_count: number;
  completed_games_count: number;
  favorite_games_count: number;
  total_library_hours: number;
  friends_count: number;
  followers_count: number;
  following_count: number;
  total_matches: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  best_rating: number;
  tournaments_registered: number;
  events_attended: number;
  completed_events: number;
  achievements_count: number;
  badges_count: number;
  teams_count: number;
  verified_records_count: number;
  last_activity_at: string | null;
  computed_at: string;
};

export type PublicPassportSummary = Omit<
  PassportSummary,
  'verified_records_count' | 'last_activity_at' | 'computed_at'
> & {
  verified_records_count?: number;
  last_activity_at?: string | null;
};

export type PassportEventPreview = {
  id: string;
  slug: string;
  title: string;
  game: GameKey | null;
  status: string;
  participation_status: 'registered' | 'checked_in' | 'no_show';
  joined_at: string;
  checked_in_at: string | null;
  scheduled_for: string | null;
};

export type PassportTeamPreview = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
};

export const PASSPORT_VERIFICATION_SUBJECT_TYPES = [
  'profile',
  'game_account',
  'match',
  'tournament',
  'event',
  'team',
  'achievement',
] as const;

export type PassportVerificationSubjectType =
  (typeof PASSPORT_VERIFICATION_SUBJECT_TYPES)[number];

export type PassportVerificationRecordPreview = {
  id: string;
  subject_type: string;
  verification_state: string;
  label: string;
  source_type: string;
  public_details: Record<string, unknown>;
  issued_at: string;
};

export type PassportVerificationPreview = Omit<
  PassportVerificationRecordPreview,
  'subject_type'
> & {
  subject_type: PassportVerificationSubjectType;
};

export type PublicPassportData = {
  access: 'public' | 'restricted';
  identity: PassportIdentity;
  summary: PublicPassportSummary | null;
  events: PassportEventPreview[];
  teams: PassportTeamPreview[];
  verifications: PassportVerificationPreview[];
  library: PassportGameLibrary;
};

export type PassportOwnerData = Omit<PublicPassportData, 'summary' | 'verifications'> & {
  access: 'public';
  identity: PassportIdentity;
  age_policy: PrivateAgePolicy;
  summary: PassportSummary | null;
  verifications: PassportVerificationRecordPreview[];
};
