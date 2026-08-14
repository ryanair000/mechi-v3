export const PASSPORT_CARD_FORMATS = ['horizontal', 'square', 'story'] as const;
export type PassportCardFormat = (typeof PASSPORT_CARD_FORMATS)[number];

export const PASSPORT_CARD_SIZES: Record<PassportCardFormat, { width: number; height: number }> = {
  horizontal: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
};

const DEFAULT_ACCENT = '#32E0C4';
const DEFAULT_BACKGROUND = '#071018';
const DEFAULT_SURFACE = '#102438';
const SAFE_COLOR = /^#[0-9A-F]{6}$/;
const SAFE_PATTERNS = new Set(['core', 'signal', 'aurora']);

export type PassportCardGameSource = {
  id: string;
  title: string;
  status: string;
  rating: number | null;
  featured: boolean;
  favorite: boolean;
};

export type PassportCardSource = {
  handle: string;
  displayName: string;
  archetypes: string[];
  accent: string;
  games: PassportCardGameSource[];
  gamesCount: number;
  completedCount: number;
  matchesCount: number;
};

export type PassportCardPresentationSource = {
  themeLabel?: string | null;
  cardStyleLabel?: string | null;
  accent?: unknown;
  background?: unknown;
  surface?: unknown;
  pattern?: unknown;
};

export type PassportCardModel = {
  format: PassportCardFormat;
  size: { width: number; height: number };
  handle: string;
  displayName: string;
  archetypes: string[];
  accent: string;
  accentSoft: string;
  background: string;
  surface: string;
  pattern: 'core' | 'signal' | 'aurora';
  styleLabel: string;
  games: PassportCardGameSource[];
  metrics: {
    games: number;
    completed: number;
    matches: number;
  };
};

export function resolvePassportCardFormat(value: string | null | undefined): PassportCardFormat {
  return value === 'square' || value === 'story' ? value : 'horizontal';
}

export function sanitizePassportCardColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toUpperCase();
  return SAFE_COLOR.test(normalized) ? normalized : fallback;
}

export function addPassportCardAlpha(color: string, alpha: string): string {
  return `${sanitizePassportCardColor(color, DEFAULT_ACCENT)}${alpha}`;
}

export function sanitizePassportCardText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return fallback;
  return [...normalized].slice(0, maxLength).join('');
}

function sanitizePassportCardHandle(value: unknown): string {
  if (typeof value !== 'string') return 'player';
  const normalized = value.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._-]/g, '').slice(0, 20);
  return normalized || 'player';
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(999_999, Math.round(value))) : 0;
}

function safeRating(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 10
    ? Math.round(value * 10) / 10
    : null;
}

export function buildPassportCardModel(
  source: PassportCardSource,
  presentation: PassportCardPresentationSource,
  format: PassportCardFormat
): PassportCardModel {
  const gameLimit = format === 'story' ? 5 : format === 'square' ? 4 : 3;
  const accent = sanitizePassportCardColor(presentation.accent, sanitizePassportCardColor(source.accent, DEFAULT_ACCENT));
  const pattern = typeof presentation.pattern === 'string' && SAFE_PATTERNS.has(presentation.pattern)
    ? presentation.pattern as PassportCardModel['pattern']
    : 'core';
  const games = [...source.games]
    .sort((left, right) => Number(right.featured) - Number(left.featured) || Number(right.favorite) - Number(left.favorite))
    .slice(0, gameLimit)
    .map((game) => ({
      id: sanitizePassportCardText(game.id, 'game', 80),
      title: sanitizePassportCardText(game.title, 'Untitled game', 70),
      status: sanitizePassportCardText(game.status, 'In library', 32),
      rating: safeRating(game.rating),
      featured: Boolean(game.featured),
      favorite: Boolean(game.favorite),
    }));

  return {
    format,
    size: PASSPORT_CARD_SIZES[format],
    handle: sanitizePassportCardHandle(source.handle),
    displayName: sanitizePassportCardText(source.displayName, 'Player', 40),
    archetypes: source.archetypes.slice(0, 3).map((archetype) =>
      sanitizePassportCardText(archetype.replaceAll('_', ' '), 'gamer', 32)
    ),
    accent,
    accentSoft: addPassportCardAlpha(accent, '35'),
    background: sanitizePassportCardColor(presentation.background, DEFAULT_BACKGROUND),
    surface: sanitizePassportCardColor(presentation.surface, DEFAULT_SURFACE),
    pattern,
    styleLabel: sanitizePassportCardText(presentation.cardStyleLabel, 'Core Card', 40),
    games,
    metrics: {
      games: safeCount(source.gamesCount),
      completed: safeCount(source.completedCount),
      matches: safeCount(source.matchesCount),
    },
  };
}
