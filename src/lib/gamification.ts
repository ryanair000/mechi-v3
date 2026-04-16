import type { GameKey, GamificationAchievement } from '@/types';

export const TRACKED_RANKED_GAMES: GameKey[] = [
  'efootball',
  'efootball_mobile',
  'fc26',
  'mk11',
  'nba2k26',
  'tekken8',
  'sf6',
  'ludo',
];

export const XP_RULES = {
  win: 120,
  loss: 40,
  firstMatchOfDayBonus: 60,
  winStreakBonus: 30,
  achievementUnlock: 200,
  inviteFriend: 300,
  shareMatchResult: 50,
} as const;

export const MP_RULES = {
  win: 50,
  loss: 15,
  achievementUnlock: 150,
  dailyLoginBonus: 25,
} as const;

export interface RankDivision {
  tier: string;
  division: string;
  label: string;
  color: string;
}

export interface XpProgress {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressInLevel: number;
  progressNeeded: number;
  progressPercent: number;
}

export interface PlayerStats {
  totalWins: number;
  winStreak: number;
  gameWins: Record<string, number>;
  totalMatches: number;
  achievementsUnlocked: string[];
  eloAfterWin?: number;
}

export interface AchievementDef extends GamificationAchievement {
  check: (stats: PlayerStats) => boolean;
}

const RANK_DIVISIONS: Array<{
  min: number;
  max: number;
  tier: string;
  division: string;
  color: string;
}> = [
  { min: 0, max: 999, tier: 'Bronze', division: 'III', color: '#CD7F32' },
  { min: 1000, max: 1049, tier: 'Bronze', division: 'II', color: '#CD7F32' },
  { min: 1050, max: 1099, tier: 'Bronze', division: 'I', color: '#CD7F32' },
  { min: 1100, max: 1149, tier: 'Silver', division: 'III', color: '#C0C0C0' },
  { min: 1150, max: 1199, tier: 'Silver', division: 'II', color: '#C0C0C0' },
  { min: 1200, max: 1299, tier: 'Silver', division: 'I', color: '#C0C0C0' },
  { min: 1300, max: 1349, tier: 'Gold', division: 'III', color: '#FFD700' },
  { min: 1350, max: 1399, tier: 'Gold', division: 'II', color: '#FFD700' },
  { min: 1400, max: 1499, tier: 'Gold', division: 'I', color: '#FFD700' },
  { min: 1500, max: 1549, tier: 'Platinum', division: 'III', color: '#00CED1' },
  { min: 1550, max: 1599, tier: 'Platinum', division: 'II', color: '#00CED1' },
  { min: 1600, max: 1699, tier: 'Platinum', division: 'I', color: '#00CED1' },
  { min: 1700, max: 1749, tier: 'Diamond', division: 'III', color: '#60A5FA' },
  { min: 1750, max: 1799, tier: 'Diamond', division: 'II', color: '#60A5FA' },
  { min: 1800, max: 1899, tier: 'Diamond', division: 'I', color: '#60A5FA' },
  { min: 1900, max: Number.POSITIVE_INFINITY, tier: 'Legend', division: '', color: '#A855F7' },
];

function achievementReward(
  key: string,
  title: string,
  description: string,
  emoji: string,
  xpReward: number,
  mpReward: number,
  check: (stats: PlayerStats) => boolean
): AchievementDef {
  return {
    key,
    title,
    description,
    emoji,
    xpReward,
    mpReward,
    check,
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  achievementReward(
    'first_blood',
    'First Blood',
    'Win your first match',
    '\u{1F947}',
    200,
    150,
    (stats) => stats.totalWins >= 1
  ),
  achievementReward(
    'dime',
    'Dime',
    'Win 10 matches',
    '\u{1F51F}',
    200,
    150,
    (stats) => stats.totalWins >= 10
  ),
  achievementReward(
    'century',
    'Century',
    'Win 100 matches',
    '\u{1F4AF}',
    300,
    200,
    (stats) => stats.totalWins >= 100
  ),
  achievementReward(
    'unstoppable',
    'Unstoppable',
    'Win 500 matches',
    '\u{26A1}',
    500,
    300,
    (stats) => stats.totalWins >= 500
  ),
  achievementReward(
    'hat_trick',
    'Hat Trick',
    'Win 3 in a row',
    '\u{1F525}',
    200,
    150,
    (stats) => stats.winStreak >= 3
  ),
  achievementReward(
    'inferno',
    'Inferno',
    'Win 5 in a row',
    '\u{1F525}\u{1F525}',
    300,
    200,
    (stats) => stats.winStreak >= 5
  ),
  achievementReward(
    'goated',
    'GOATed',
    'Win 10 in a row',
    '\u{1F410}',
    500,
    300,
    (stats) => stats.winStreak >= 10
  ),
  achievementReward(
    'efootball_god',
    'eFootball God',
    'Win 50 eFootball matches',
    '\u{26BD}',
    300,
    200,
    (stats) => (stats.gameWins.efootball ?? 0) >= 50
  ),
  achievementReward(
    'efootball_mobile_god',
    'eFootball Mobile God',
    'Win 50 eFootball Mobile matches',
    '\u{26BD}',
    300,
    200,
    (stats) => (stats.gameWins.efootball_mobile ?? 0) >= 50
  ),
  achievementReward(
    'tekken_master',
    'Tekken Master',
    'Win 50 Tekken 8 matches',
    '\u{1F44A}',
    300,
    200,
    (stats) => (stats.gameWins.tekken8 ?? 0) >= 50
  ),
  achievementReward(
    'buckets',
    'Buckets',
    'Win 50 NBA 2K26 matches',
    '\u{1F3C0}',
    300,
    200,
    (stats) => (stats.gameWins.nba2k26 ?? 0) >= 50
  ),
  achievementReward(
    'street_legend',
    'Street Legend',
    'Win 50 Street Fighter 6 matches',
    '\u{1F94A}',
    300,
    200,
    (stats) => (stats.gameWins.sf6 ?? 0) >= 50
  ),
  achievementReward(
    'pitch_king',
    'Pitch King',
    'Win 50 EA FC 26 matches',
    '\u{1F3C6}',
    300,
    200,
    (stats) => (stats.gameWins.fc26 ?? 0) >= 50
  ),
  achievementReward(
    'krypt_keeper',
    'Krypt Keeper',
    'Win 50 MK11 matches',
    '\u{1F94A}',
    300,
    200,
    (stats) => (stats.gameWins.mk11 ?? 0) >= 50
  ),
  achievementReward(
    'silver_certified',
    'Silver Certified',
    'Reach Silver rank',
    '\u{1F948}',
    200,
    150,
    (stats) => (stats.eloAfterWin ?? 0) >= 1100
  ),
  achievementReward(
    'gold_certified',
    'Gold Certified',
    'Reach Gold rank',
    '\u{1F947}',
    300,
    200,
    (stats) => (stats.eloAfterWin ?? 0) >= 1300
  ),
  achievementReward(
    'diamond_certified',
    'Diamond Certified',
    'Reach Diamond rank',
    '\u{1F48E}',
    400,
    250,
    (stats) => (stats.eloAfterWin ?? 0) >= 1700
  ),
  achievementReward(
    'legend',
    'Legend',
    'Reach Legend rank',
    '\u{1F7E3}',
    500,
    300,
    (stats) => (stats.eloAfterWin ?? 0) >= 1900
  ),
];

export function getXpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return (500 * (safeLevel - 1) * safeLevel) / 2;
}

export function getLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;

  while (safeXp >= getXpForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export function getXpForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return getXpForLevel(safeLevel + 1) - getXpForLevel(safeLevel);
}

export function getXpProgress(xp: number, level = getLevelFromXp(xp)): XpProgress {
  const safeLevel = Math.max(1, Math.floor(level));
  const safeXp = Math.max(0, Math.floor(xp));
  const currentLevelXp = getXpForLevel(safeLevel);
  const nextLevelXp = getXpForLevel(safeLevel + 1);
  const progressInLevel = Math.max(0, safeXp - currentLevelXp);
  const progressNeeded = Math.max(1, nextLevelXp - currentLevelXp);

  return {
    level: safeLevel,
    currentLevelXp,
    nextLevelXp,
    progressInLevel,
    progressNeeded,
    progressPercent: Math.min(100, Math.max(0, Math.round((progressInLevel / progressNeeded) * 100))),
  };
}

export function getRankDivision(elo: number): RankDivision {
  const safeElo = Math.max(0, Math.floor(elo));
  const division =
    RANK_DIVISIONS.find((entry) => safeElo >= entry.min && safeElo <= entry.max) ??
    RANK_DIVISIONS[0];

  return {
    tier: division.tier,
    division: division.division,
    label: division.division ? `${division.tier} ${division.division}` : division.tier,
    color: division.color,
  };
}

export function evaluateAchievements(stats: PlayerStats): AchievementDef[] {
  const unlocked = new Set(stats.achievementsUnlocked);

  return ACHIEVEMENTS.filter((achievement) => {
    if (unlocked.has(achievement.key)) {
      return false;
    }

    return achievement.check(stats);
  });
}

export function toAchievementUnlock(achievement: AchievementDef): GamificationAchievement {
  return {
    key: achievement.key,
    title: achievement.title,
    description: achievement.description,
    emoji: achievement.emoji,
    xpReward: achievement.xpReward,
    mpReward: achievement.mpReward,
  };
}

export function getNairobiDateStamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

export function getGameWins(stats: Record<string, number>, game: GameKey): number {
  return stats[game] ?? 0;
}

export function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}
