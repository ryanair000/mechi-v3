import type { GameKey } from '@/types';

export const SNAPSHOT_GAMES = ['efootball', 'codm', 'pubgm'] as const;

export type SnapshotGameKey = (typeof SNAPSHOT_GAMES)[number];
export type SnapshotUrlKey =
  | 'snapshot_efootball_url'
  | 'snapshot_codm_url'
  | 'snapshot_pubgm_url';
export type SnapshotMediaKind =
  | 'snapshot_efootball'
  | 'snapshot_codm'
  | 'snapshot_pubgm';

const SNAPSHOT_CONFIG: Record<
  SnapshotGameKey,
  {
    accent: string;
    description: string;
    field: SnapshotUrlKey;
    kind: SnapshotMediaKind;
    label: string;
    previewClassName: 'aspect-video' | 'aspect-[4/3]';
  }
> = {
  efootball: {
    accent: '#FF6B6B',
    description: 'Upload a screenshot of your eFootball squad or Ultimate Team lineup',
    field: 'snapshot_efootball_url',
    kind: 'snapshot_efootball',
    label: 'Team Snapshot',
    previewClassName: 'aspect-video',
  },
  codm: {
    accent: '#32E0C4',
    description: 'Upload a screenshot of your CODM in-game profile or stats screen',
    field: 'snapshot_codm_url',
    kind: 'snapshot_codm',
    label: 'Profile Snapshot',
    previewClassName: 'aspect-[4/3]',
  },
  pubgm: {
    accent: '#60A5FA',
    description: 'Upload a screenshot of your PUBGM in-game profile or stats screen',
    field: 'snapshot_pubgm_url',
    kind: 'snapshot_pubgm',
    label: 'Profile Snapshot',
    previewClassName: 'aspect-[4/3]',
  },
};

export function isSnapshotGame(game: GameKey): game is SnapshotGameKey {
  return SNAPSHOT_GAMES.includes(game as SnapshotGameKey);
}

export function isSnapshotMediaKind(value: string): value is SnapshotMediaKind {
  return value === 'snapshot_efootball' || value === 'snapshot_codm' || value === 'snapshot_pubgm';
}

export function getSnapshotUrlKey(game: GameKey): SnapshotUrlKey | null {
  if (!isSnapshotGame(game)) {
    return null;
  }

  return SNAPSHOT_CONFIG[game].field;
}

export function getSnapshotLabel(game: GameKey): string {
  if (!isSnapshotGame(game)) {
    return 'Profile Snapshot';
  }

  return SNAPSHOT_CONFIG[game].label;
}

export function getSnapshotDescription(game: GameKey): string {
  if (!isSnapshotGame(game)) {
    return '';
  }

  return SNAPSHOT_CONFIG[game].description;
}

export function getSnapshotMediaKind(game: GameKey): SnapshotMediaKind | null {
  if (!isSnapshotGame(game)) {
    return null;
  }

  return SNAPSHOT_CONFIG[game].kind;
}

export function getSnapshotPreviewClassName(game: GameKey): 'aspect-video' | 'aspect-[4/3]' {
  if (!isSnapshotGame(game)) {
    return 'aspect-[4/3]';
  }

  return SNAPSHOT_CONFIG[game].previewClassName;
}

export function getSnapshotAccent(game: GameKey): string {
  if (!isSnapshotGame(game)) {
    return 'var(--accent-secondary)';
  }

  return SNAPSHOT_CONFIG[game].accent;
}
