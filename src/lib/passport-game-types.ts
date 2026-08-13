import type { PassportVisibility } from '@/lib/passport-types';
import type { PlatformKey } from '@/types';

export const PASSPORT_GAME_STATUSES = [
  'playing',
  'completed',
  'backlog',
  'paused',
  'dropped',
  'replaying',
] as const;

export const PASSPORT_GAME_PLATFORMS = [
  'unspecified',
  'ps',
  'xbox',
  'nintendo',
  'mobile',
  'pc',
] as const;

export type PassportGameStatus = (typeof PASSPORT_GAME_STATUSES)[number];
export type PassportGamePlatform = (typeof PASSPORT_GAME_PLATFORMS)[number];

export const PASSPORT_GAME_STATUS_LABELS: Record<PassportGameStatus, string> = {
  playing: 'Currently playing',
  completed: 'Completed',
  backlog: 'Backlog',
  paused: 'Paused',
  dropped: 'Dropped',
  replaying: 'Replaying',
};

export const PASSPORT_GAME_PLATFORM_LABELS: Record<PassportGamePlatform, string> = {
  unspecified: 'Platform not set',
  ps: 'PlayStation',
  xbox: 'Xbox',
  nintendo: 'Nintendo',
  mobile: 'Mobile',
  pc: 'PC',
};

export type PassportCatalogGame = {
  id: string;
  slug: string;
  canonical_game_id: string | null;
  title: string;
  edition_title: string | null;
  release_year: number | null;
  cover_url: string | null;
  platforms: PlatformKey[];
  genres: string[];
  modes: string[];
  game_kind: 'base_game' | 'edition' | 'remaster' | 'remake' | 'dlc';
  provider: string;
  provider_url: string | null;
  provider_attribution: string | null;
};

export type PassportGameEntry = {
  id: string;
  user_id: string;
  catalog_game_id: string;
  platform: PassportGamePlatform;
  play_status: PassportGameStatus;
  started_on: string | null;
  completed_on: string | null;
  rating: number | null;
  hours_played: number | null;
  short_review: string;
  contains_spoilers: boolean;
  is_favorite: boolean;
  is_featured: boolean;
  visibility: PassportVisibility;
  screenshot_url: string | null;
  source_type: 'manual' | 'mechi_projected' | 'platform_synced' | 'admin';
  created_at: string;
  updated_at: string;
  game: PassportCatalogGame;
};

export type PassportLibraryStats = {
  total: number;
  playing: number;
  completed: number;
  backlog: number;
  favorites: number;
  featured: number;
  total_hours: number;
  platforms: PassportGamePlatform[];
  genres: string[];
  years: number[];
};

export type PassportGameLibrary = {
  access: 'owner' | 'friend' | 'public' | 'restricted';
  storage_ready: boolean;
  entries: PassportGameEntry[];
  stats: PassportLibraryStats;
};

export type PassportGameEntryInput = {
  catalog_game_id: string;
  platform?: PassportGamePlatform;
  play_status?: PassportGameStatus;
  started_on?: string | null;
  completed_on?: string | null;
  rating?: number | null;
  hours_played?: number | null;
  short_review?: string;
  contains_spoilers?: boolean;
  is_favorite?: boolean;
  is_featured?: boolean;
  visibility?: PassportVisibility;
};
