import { GAMES } from '@/lib/config';
import type { GameKey } from '@/types';

export const CREATOR_SECTIONS = [
  'content',
  'live',
  'coverage',
  'tournaments',
  'audience',
  'opportunities',
  'earnings',
  'profile',
] as const;

export type CreatorSection = (typeof CREATOR_SECTIONS)[number];

export function isCreatorSection(value: string): value is CreatorSection {
  return CREATOR_SECTIONS.includes(value as CreatorSection);
}

export function getGameLabel(value: string | null | undefined) {
  if (!value) return 'Game';
  return GAMES[value as GameKey]?.label ?? value.replaceAll('_', ' ');
}

export function safeCreatorSlug(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return normalized || 'creator';
}
