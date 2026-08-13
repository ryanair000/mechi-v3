import 'server-only';

import { GAMES, getGameCapsuleImage } from '@/lib/config';
import { isMissingTableError } from '@/lib/db-compat';
import {
  PASSPORT_GAME_PLATFORMS,
  PASSPORT_GAME_STATUSES,
  type PassportCatalogGame,
  type PassportGameEntry,
  type PassportGameEntryInput,
  type PassportGameLibrary,
  type PassportGamePlatform,
  type PassportGameStatus,
  type PassportLibraryStats,
} from '@/lib/passport-game-types';
import { PASSPORT_VISIBILITIES, type PassportVisibility } from '@/lib/passport-types';
import { createServiceClient } from '@/lib/supabase';
import type { GameKey, PlatformKey } from '@/types';

const CATALOG_SELECT =
  'id, slug, canonical_game_id, title, edition_title, release_year, cover_url, platforms, genres, modes, game_kind, provider, provider_url, provider_attribution';
const ENTRY_SELECT = `id, user_id, catalog_game_id, platform, play_status, started_on, completed_on, rating, hours_played, short_review, contains_spoilers, is_favorite, is_featured, visibility, screenshot_url, source_type, created_at, updated_at, game:passport_game_catalog(${CATALOG_SELECT})`;
const MAX_FEATURED_GAMES = 5;

type CatalogRow = {
  id: string;
  slug: string;
  canonical_game_id: string | null;
  title: string;
  edition_title: string | null;
  release_year: number | null;
  cover_url: string | null;
  platforms: string[] | null;
  genres: string[] | null;
  modes: string[] | null;
  game_kind: string;
  provider: string;
  provider_url: string | null;
  provider_attribution: string | null;
  search_aliases?: string[] | null;
};

type EntryRow = {
  id: string;
  user_id: string;
  catalog_game_id: string;
  platform: string;
  play_status: string;
  started_on: string | null;
  completed_on: string | null;
  rating: number | null;
  hours_played: number | string | null;
  short_review: string;
  contains_spoilers: boolean;
  is_favorite: boolean;
  is_featured: boolean;
  visibility: string;
  screenshot_url: string | null;
  source_type: string;
  created_at: string;
  updated_at: string;
  game: CatalogRow | CatalogRow[] | null;
};

export type PassportCatalogSearch = {
  query?: string;
  platform?: PlatformKey | null;
  genre?: string | null;
  limit?: number;
};

export type PassportGameMutationResult =
  | { entry: PassportGameEntry; error: null }
  | { entry: null; error: string; status: number };

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function bigrams(value: string): Set<string> {
  const compact = normalizeSearchText(value).replace(/\s+/g, '');
  const result = new Set<string>();
  if (compact.length < 2) {
    if (compact) result.add(compact);
    return result;
  }
  for (let index = 0; index < compact.length - 1; index += 1) {
    result.add(compact.slice(index, index + 2));
  }
  return result;
}

function tolerantSearchScore(query: string, row: CatalogRow): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 1;

  const haystacks = [row.title, row.edition_title ?? '', ...(row.search_aliases ?? [])]
    .map(normalizeSearchText)
    .filter(Boolean);
  let best = 0;

  for (const haystack of haystacks) {
    if (haystack === normalizedQuery) best = Math.max(best, 100);
    if (haystack.startsWith(normalizedQuery)) best = Math.max(best, 85);
    if (haystack.includes(normalizedQuery)) best = Math.max(best, 72);

    const queryTokens = normalizedQuery.split(' ');
    const matchedTokens = queryTokens.filter((token) => haystack.includes(token)).length;
    best = Math.max(best, (matchedTokens / queryTokens.length) * 60);

    const queryPairs = bigrams(normalizedQuery);
    const targetPairs = bigrams(haystack);
    const overlap = [...queryPairs].filter((pair) => targetPairs.has(pair)).length;
    const denominator = queryPairs.size + targetPairs.size;
    if (denominator > 0) best = Math.max(best, (2 * overlap / denominator) * 55);
  }

  return best;
}

function normalizeCatalogRow(row: CatalogRow): PassportCatalogGame {
  const kind = ['base_game', 'edition', 'remaster', 'remake', 'dlc'].includes(row.game_kind)
    ? row.game_kind as PassportCatalogGame['game_kind']
    : 'base_game';
  return {
    id: row.id,
    slug: row.slug,
    canonical_game_id: row.canonical_game_id,
    title: row.title,
    edition_title: row.edition_title,
    release_year: row.release_year,
    cover_url: row.cover_url,
    platforms: (row.platforms ?? []).filter((value): value is PlatformKey =>
      ['ps', 'xbox', 'nintendo', 'mobile', 'pc'].includes(value)
    ),
    genres: row.genres ?? [],
    modes: row.modes ?? [],
    game_kind: kind,
    provider: row.provider,
    provider_url: row.provider_url,
    provider_attribution: row.provider_attribution,
  };
}

function fallbackCatalogRows(): CatalogRow[] {
  return (Object.entries(GAMES) as Array<[GameKey, (typeof GAMES)[GameKey]]>)
    .filter(([, game]) => !game.hidden)
    .map(([key, game]) => ({
      id: `legacy:${key}`,
      slug: key.replace(/_/g, '-'),
      canonical_game_id: null,
      title: game.label,
      edition_title: null,
      release_year: null,
      cover_url: getGameCapsuleImage(key),
      platforms: game.platforms,
      genres: [],
      modes: [game.mode],
      game_kind: 'base_game',
      provider: 'mechi',
      provider_url: null,
      provider_attribution: null,
      search_aliases: [key],
    }));
}

function normalizeEntryRow(row: EntryRow): PassportGameEntry | null {
  const game = firstRelation(row.game);
  if (!game) return null;
  const platform = PASSPORT_GAME_PLATFORMS.includes(row.platform as PassportGamePlatform)
    ? row.platform as PassportGamePlatform
    : 'unspecified';
  const playStatus = PASSPORT_GAME_STATUSES.includes(row.play_status as PassportGameStatus)
    ? row.play_status as PassportGameStatus
    : 'backlog';
  const visibility = PASSPORT_VISIBILITIES.includes(row.visibility as PassportVisibility)
    ? row.visibility as PassportVisibility
    : 'private';
  const sourceType = ['manual', 'mechi_projected', 'platform_synced', 'admin'].includes(row.source_type)
    ? row.source_type as PassportGameEntry['source_type']
    : 'manual';

  return {
    id: row.id,
    user_id: row.user_id,
    catalog_game_id: row.catalog_game_id,
    platform,
    play_status: playStatus,
    started_on: row.started_on,
    completed_on: row.completed_on,
    rating: row.rating,
    hours_played: row.hours_played === null ? null : Number(row.hours_played),
    short_review: row.short_review ?? '',
    contains_spoilers: Boolean(row.contains_spoilers),
    is_favorite: Boolean(row.is_favorite),
    is_featured: Boolean(row.is_featured),
    visibility,
    screenshot_url: row.screenshot_url,
    source_type: sourceType,
    created_at: row.created_at,
    updated_at: row.updated_at,
    game: normalizeCatalogRow(game),
  };
}

export function calculatePassportLibraryStats(entries: PassportGameEntry[]): PassportLibraryStats {
  const platforms = new Set<PassportGamePlatform>();
  const genres = new Set<string>();
  const years = new Set<number>();
  let totalHours = 0;

  for (const entry of entries) {
    if (entry.platform !== 'unspecified') platforms.add(entry.platform);
    entry.game.genres.forEach((genre) => genres.add(genre));
    if (entry.game.release_year) years.add(entry.game.release_year);
    totalHours += entry.hours_played ?? 0;
  }

  return {
    total: entries.length,
    playing: entries.filter((entry) => ['playing', 'replaying'].includes(entry.play_status)).length,
    completed: entries.filter((entry) => entry.play_status === 'completed').length,
    backlog: entries.filter((entry) => entry.play_status === 'backlog').length,
    favorites: entries.filter((entry) => entry.is_favorite).length,
    featured: entries.filter((entry) => entry.is_featured).length,
    total_hours: Math.round(totalHours * 10) / 10,
    platforms: [...platforms],
    genres: [...genres].sort(),
    years: [...years].sort((a, b) => b - a),
  };
}

export async function searchPassportGameCatalog(
  options: PassportCatalogSearch = {}
): Promise<{ games: PassportCatalogGame[]; storage_ready: boolean }> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('passport_game_catalog')
    .select(`${CATALOG_SELECT}, search_aliases`)
    .eq('resolution_status', 'approved')
    .order('title', { ascending: true })
    .limit(300);

  let rows: CatalogRow[];
  let storageReady = true;
  if (result.error) {
    if (!isMissingTableError(result.error, 'passport_game_catalog')) {
      console.error('[Passport Games] Could not search catalogue:', result.error);
    }
    rows = fallbackCatalogRows();
    storageReady = false;
  } else {
    rows = (result.data ?? []) as CatalogRow[];
  }

  const platform = options.platform ?? null;
  const genre = normalizeSearchText(options.genre ?? '');
  const query = options.query?.trim() ?? '';
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 80);

  return {
    games: rows
      .filter((row) => !platform || (row.platforms ?? []).includes(platform))
      .filter((row) => !genre || (row.genres ?? []).some((value) => normalizeSearchText(value) === genre))
      .map((row) => ({ row, score: tolerantSearchScore(query, row) }))
      .filter(({ score }) => !query || score >= 18)
      .sort((left, right) => right.score - left.score || left.row.title.localeCompare(right.row.title))
      .slice(0, limit)
      .map(({ row }) => normalizeCatalogRow(row)),
    storage_ready: storageReady,
  };
}

async function loadGameEntries(userId: string): Promise<{ entries: PassportGameEntry[]; storageReady: boolean }> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('passport_game_entries')
    .select(ENTRY_SELECT)
    .eq('user_id', userId)
    .order('is_featured', { ascending: false })
    .order('is_favorite', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(500);

  if (result.error) {
    if (!isMissingTableError(result.error, 'passport_game_entries')) {
      console.error('[Passport Games] Could not load library:', result.error);
    }
    return { entries: [], storageReady: false };
  }

  return {
    entries: ((result.data ?? []) as EntryRow[]).flatMap((row) => {
      const entry = normalizeEntryRow(row);
      return entry ? [entry] : [];
    }),
    storageReady: true,
  };
}

export async function getPassportGameLibraryByUserId(
  userId: string,
  access: 'owner' | 'friend' | 'public',
  gamesVisible = true
): Promise<PassportGameLibrary> {
  if (access === 'public' && !gamesVisible) {
    return {
      access: 'restricted',
      storage_ready: true,
      entries: [],
      stats: calculatePassportLibraryStats([]),
    };
  }

  const loaded = await loadGameEntries(userId);
  const entries = access === 'owner'
    ? loaded.entries
    : access === 'friend'
      ? loaded.entries.filter((entry) => entry.visibility !== 'private')
      : loaded.entries.filter((entry) => entry.visibility === 'public');
  return {
    access,
    storage_ready: loaded.storageReady,
    entries,
    stats: calculatePassportLibraryStats(entries),
  };
}

export async function syncPassportLibrarySummary(userId: string): Promise<void> {
  const loaded = await loadGameEntries(userId);
  if (!loaded.storageReady) return;
  const stats = calculatePassportLibraryStats(loaded.entries);
  const supabase = createServiceClient();
  const result = await supabase.from('passport_profile_summaries').upsert({
    user_id: userId,
    games_count: stats.total,
    playing_games_count: stats.playing,
    completed_games_count: stats.completed,
    favorite_games_count: stats.favorites,
    total_library_hours: stats.total_hours,
    computed_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (result.error && !isMissingTableError(result.error, 'passport_profile_summaries')) {
    console.error('[Passport Games] Could not sync library summary:', result.error);
  }
}

async function featuredCount(userId: string, excludingId?: string): Promise<number> {
  const supabase = createServiceClient();
  let query = supabase
    .from('passport_game_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_featured', true);
  if (excludingId) query = query.neq('id', excludingId);
  const result = await query;
  return result.count ?? 0;
}

export async function createPassportGameEntry(
  userId: string,
  input: PassportGameEntryInput
): Promise<PassportGameMutationResult> {
  if (input.is_featured && await featuredCount(userId) >= MAX_FEATURED_GAMES) {
    return { entry: null, error: `Feature up to ${MAX_FEATURED_GAMES} games`, status: 409 };
  }

  const supabase = createServiceClient();
  const result = await supabase
    .from('passport_game_entries')
    .insert({
      user_id: userId,
      catalog_game_id: input.catalog_game_id,
      platform: input.platform ?? 'unspecified',
      play_status: input.play_status ?? 'backlog',
      started_on: input.started_on ?? null,
      completed_on: input.completed_on ?? null,
      rating: input.rating ?? null,
      hours_played: input.hours_played ?? null,
      short_review: input.short_review ?? '',
      contains_spoilers: input.contains_spoilers ?? false,
      is_favorite: input.is_favorite ?? false,
      is_featured: input.is_featured ?? false,
      visibility: input.visibility ?? 'public',
      source_type: 'manual',
    })
    .select(ENTRY_SELECT)
    .single();

  if (result.error) {
    if (isMissingTableError(result.error, 'passport_game_entries')) {
      return { entry: null, error: 'Game-library storage is not ready', status: 503 };
    }
    if (result.error.code === '23505') {
      return { entry: null, error: 'This game is already in your library for that platform', status: 409 };
    }
    if (result.error.code === '23514' && input.is_featured) {
      return { entry: null, error: `Feature up to ${MAX_FEATURED_GAMES} games`, status: 409 };
    }
    console.error('[Passport Games] Could not add game:', result.error);
    return { entry: null, error: 'Could not add this game', status: 500 };
  }

  const entry = normalizeEntryRow(result.data as EntryRow);
  if (!entry) return { entry: null, error: 'Could not read the saved game', status: 500 };
  await Promise.all([syncPassportLibrarySummary(userId), writeGameAudit(userId, 'passport.game.added', entry.id, ['game'])]);
  return { entry, error: null };
}

export async function updatePassportGameEntry(
  userId: string,
  entryId: string,
  input: Partial<PassportGameEntryInput>
): Promise<PassportGameMutationResult> {
  if (input.is_featured && await featuredCount(userId, entryId) >= MAX_FEATURED_GAMES) {
    return { entry: null, error: `Feature up to ${MAX_FEATURED_GAMES} games`, status: 409 };
  }

  const allowedUpdate = Object.fromEntries(Object.entries(input).filter(([key]) => [
    'catalog_game_id', 'platform', 'play_status', 'started_on', 'completed_on', 'rating',
    'hours_played', 'short_review', 'contains_spoilers', 'is_favorite', 'is_featured', 'visibility',
  ].includes(key)));
  const supabase = createServiceClient();
  const result = await supabase
    .from('passport_game_entries')
    .update(allowedUpdate)
    .eq('id', entryId)
    .eq('user_id', userId)
    .select(ENTRY_SELECT)
    .maybeSingle();

  if (result.error) {
    if (result.error.code === '23505') {
      return { entry: null, error: 'This game is already in your library for that platform', status: 409 };
    }
    if (result.error.code === '23514' && input.is_featured) {
      return { entry: null, error: `Feature up to ${MAX_FEATURED_GAMES} games`, status: 409 };
    }
    console.error('[Passport Games] Could not update game:', result.error);
    return { entry: null, error: 'Could not update this game', status: 500 };
  }
  if (!result.data) return { entry: null, error: 'Game entry not found', status: 404 };

  const entry = normalizeEntryRow(result.data as EntryRow);
  if (!entry) return { entry: null, error: 'Could not read the updated game', status: 500 };
  await Promise.all([
    syncPassportLibrarySummary(userId),
    writeGameAudit(userId, 'passport.game.updated', entryId, Object.keys(allowedUpdate)),
  ]);
  return { entry, error: null };
}

export async function deletePassportGameEntry(userId: string, entryId: string): Promise<{ error: string | null; status: number }> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('passport_game_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (result.error) {
    console.error('[Passport Games] Could not delete game:', result.error);
    return { error: 'Could not remove this game', status: 500 };
  }
  if (!result.data) return { error: 'Game entry not found', status: 404 };
  await Promise.all([syncPassportLibrarySummary(userId), writeGameAudit(userId, 'passport.game.removed', entryId, ['game'])]);
  return { error: null, status: 200 };
}

export async function savePassportGameScreenshot(
  userId: string,
  entryId: string,
  screenshotUrl: string,
  screenshotPublicId: string
): Promise<PassportGameMutationResult> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('passport_game_entries')
    .update({ screenshot_url: screenshotUrl, screenshot_public_id: screenshotPublicId })
    .eq('id', entryId)
    .eq('user_id', userId)
    .select(ENTRY_SELECT)
    .maybeSingle();
  if (result.error) {
    console.error('[Passport Games] Could not save screenshot:', result.error);
    return { entry: null, error: 'Could not save screenshot', status: 500 };
  }
  if (!result.data) return { entry: null, error: 'Game entry not found', status: 404 };
  const entry = normalizeEntryRow(result.data as EntryRow);
  if (!entry) return { entry: null, error: 'Could not read the updated game', status: 500 };
  await writeGameAudit(userId, 'passport.game.screenshot_added', entryId, ['screenshot_url']);
  return { entry, error: null };
}

export async function requestPassportCatalogGame(
  userId: string,
  title: string,
  platform: PlatformKey | null,
  notes: string
): Promise<{ id: string | null; error: string | null; status: number }> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('passport_game_requests')
    .insert({ user_id: userId, requested_title: title, requested_platform: platform, notes })
    .select('id')
    .single();
  if (result.error) {
    if (isMissingTableError(result.error, 'passport_game_requests')) {
      return { id: null, error: 'Game request storage is not ready', status: 503 };
    }
    console.error('[Passport Games] Could not request game:', result.error);
    return { id: null, error: 'Could not submit game request', status: 500 };
  }
  return { id: result.data.id as string, error: null, status: 201 };
}

async function writeGameAudit(userId: string, action: string, entryId: string, changedFields: string[]): Promise<void> {
  const supabase = createServiceClient();
  const result = await supabase.from('passport_audit_logs').insert({
    user_id: userId,
    actor_id: userId,
    action,
    changed_fields: changedFields,
    details: { entry_id: entryId },
  });
  if (result.error && !isMissingTableError(result.error, 'passport_audit_logs')) {
    console.error('[Passport Games] Could not write audit log:', result.error);
  }
}
