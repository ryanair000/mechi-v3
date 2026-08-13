import {
  PASSPORT_GAME_PLATFORMS,
  PASSPORT_GAME_STATUSES,
  type PassportGameEntryInput,
  type PassportGamePlatform,
  type PassportGameStatus,
} from '@/lib/passport-game-types';
import { PASSPORT_VISIBILITIES, type PassportVisibility } from '@/lib/passport-types';

type ParseResult<T> = { data: T; error: null } | { data: null; error: string };

function optionalDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(timestamp) ? undefined : value;
}
function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parsePassportGameEntryInput(
  value: unknown,
  options: { partial?: boolean } = {}
): ParseResult<PassportGameEntryInput | Partial<PassportGameEntryInput>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { data: null, error: 'A game entry object is required' };
  }
  const body = value as Record<string, unknown>;
  const partial = Boolean(options.partial);
  const result: Partial<PassportGameEntryInput> = {};

  if (!partial || 'catalog_game_id' in body) {
    if (typeof body.catalog_game_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.catalog_game_id)) {
      return { data: null, error: 'Choose a valid catalogue game' };
    }
    result.catalog_game_id = body.catalog_game_id;
  }

  if ('platform' in body) {
    if (!PASSPORT_GAME_PLATFORMS.includes(body.platform as PassportGamePlatform)) {
      return { data: null, error: 'Choose a valid platform' };
    }
    result.platform = body.platform as PassportGamePlatform;
  }
  if ('play_status' in body) {
    if (!PASSPORT_GAME_STATUSES.includes(body.play_status as PassportGameStatus)) {
      return { data: null, error: 'Choose a valid play status' };
    }
    result.play_status = body.play_status as PassportGameStatus;
  }
  if ('visibility' in body) {
    if (!PASSPORT_VISIBILITIES.includes(body.visibility as PassportVisibility)) {
      return { data: null, error: 'Choose a valid visibility' };
    }
    result.visibility = body.visibility as PassportVisibility;
  }

  for (const field of ['started_on', 'completed_on'] as const) {
    if (field in body) {
      const parsed = optionalDate(body[field]);
      if (parsed === undefined) return { data: null, error: `${field === 'started_on' ? 'Start' : 'Completion'} date is invalid` };
      result[field] = parsed;
    }
  }
  if (result.started_on && result.completed_on && result.completed_on < result.started_on) {
    return { data: null, error: 'Completion date cannot be before the start date' };
  }

  if ('rating' in body) {
    const rating = optionalNumber(body.rating);
    if (rating === undefined || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 10))) {
      return { data: null, error: 'Rating must be a whole number from 1 to 10' };
    }
    result.rating = rating;
  }
  if ('hours_played' in body) {
    const hours = optionalNumber(body.hours_played);
    if (hours === undefined || (hours !== null && (hours < 0 || hours > 100000))) {
      return { data: null, error: 'Hours played must be between 0 and 100,000' };
    }
    result.hours_played = hours === null ? null : Math.round(hours * 10) / 10;
  }
  if ('short_review' in body) {
    if (typeof body.short_review !== 'string' || body.short_review.trim().length > 500) {
      return { data: null, error: 'Review must be 500 characters or fewer' };
    }
    result.short_review = body.short_review.trim();
  }

  for (const field of ['contains_spoilers', 'is_favorite', 'is_featured'] as const) {
    if (field in body) {
      if (typeof body[field] !== 'boolean') return { data: null, error: `${field} must be true or false` };
      result[field] = body[field];
    }
  }

  if (partial && Object.keys(result).length === 0) {
    return { data: null, error: 'No supported game fields were provided' };
  }
  return { data: result, error: null };
}
