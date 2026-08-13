import 'server-only';

import { GAMES } from '@/lib/config';
import { getPassportData, normalizePassportUsername } from '@/lib/passport';
import {
  arePassportFriends,
  canonicalPassportPair,
  getPassportRelationshipState,
  getPassportSocialProfiles,
  hasPassportBlockBetween,
} from '@/lib/passport-social';
import type {
  PassportChallengeOption,
  PassportComparisonResult,
  PassportRivalry,
  PassportSharedGameComparison,
  PassportTasteFactor,
  PassportTasteMatch,
} from '@/lib/passport-social-types';
import { createServiceClient } from '@/lib/supabase';
import type { PassportGameEntry } from '@/lib/passport-game-types';
import type { PassportField, PassportIdentity } from '@/lib/passport-types';
import type { GameKey, PlatformKey } from '@/types';

type MatchRow = {
  player1_id: string;
  player2_id: string;
  game: string;
  winner_id: string | null;
  completed_at: string | null;
};

function gameKey(entry: PassportGameEntry) {
  return entry.game.canonical_game_id || entry.game.id;
}

function uniqueEntries(entries: PassportGameEntry[]) {
  const map = new Map<string, PassportGameEntry>();
  for (const entry of entries) {
    const key = gameKey(entry);
    const existing = map.get(key);
    if (!existing || (entry.is_favorite && !existing.is_favorite) || entry.updated_at > existing.updated_at) map.set(key, entry);
  }
  return map;
}

function overlap<T>(left: T[], right: T[]) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => rightSet.has(value));
}

function ratioPoints(value: number, maximum: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * maximum);
}

function buildTasteMatch(leftEntries: PassportGameEntry[], rightEntries: PassportGameEntry[], shared: PassportSharedGameComparison[]): PassportTasteMatch {
  if (!shared.length) {
    return {
      score: null,
      label: 'Discovery match',
      factors: [],
      strongest_factors: [],
      discovery_prompt: 'No visible games overlap yet. Swap one recommendation each and discover your first shared game.',
    };
  }
  const unionSize = new Set([...leftEntries.map(gameKey), ...rightEntries.map(gameKey)]).size;
  const favoriteOverlap = shared.filter((game) => game.left.is_favorite && game.right.is_favorite).length;
  const favoriteUnion = new Set([
    ...leftEntries.filter((entry) => entry.is_favorite).map(gameKey),
    ...rightEntries.filter((entry) => entry.is_favorite).map(gameKey),
  ]).size;
  const statusAgreement = shared.filter((game) => game.same_status).length / shared.length;
  const platformAgreement = shared.filter((game) => game.same_platform).length / shared.length;
  const leftGenres = leftEntries.flatMap((entry) => entry.game.genres);
  const rightGenres = rightEntries.flatMap((entry) => entry.game.genres);
  const genreUnion = new Set([...leftGenres, ...rightGenres]).size;
  const genreOverlap = overlap(leftGenres, rightGenres).length;
  const factors: PassportTasteFactor[] = [
    { key: 'shared_games', label: 'Shared library', explanation: `${shared.length} of ${unionSize} visible titles overlap`, points: ratioPoints(shared.length / Math.max(unionSize, 1), 40), maximum: 40 },
    { key: 'favorites', label: 'Shared favorites', explanation: favoriteUnion ? `${favoriteOverlap} favorite title${favoriteOverlap === 1 ? '' : 's'} in common` : 'Neither player has visible favorites yet', points: ratioPoints(favoriteUnion ? favoriteOverlap / favoriteUnion : 0, 20), maximum: 20 },
    { key: 'play_style', label: 'Play style', explanation: `${Math.round(statusAgreement * 100)}% status agreement across shared games`, points: ratioPoints(statusAgreement, 15), maximum: 15 },
    { key: 'platforms', label: 'Platforms', explanation: `${Math.round(platformAgreement * 100)}% of shared games use the same platform`, points: ratioPoints(platformAgreement, 15), maximum: 15 },
    { key: 'genres', label: 'Genres', explanation: `${genreOverlap} visible genre${genreOverlap === 1 ? '' : 's'} in common`, points: ratioPoints(genreUnion ? genreOverlap / genreUnion : 0, 10), maximum: 10 },
  ];
  const score = factors.reduce((sum, factor) => sum + factor.points, 0);
  return {
    score,
    label: score >= 80 ? 'Squad soulmates' : score >= 60 ? 'Strong match' : score >= 40 ? 'Good overlap' : 'Different lanes',
    factors,
    strongest_factors: [...factors].sort((a, b) => (b.points / b.maximum) - (a.points / a.maximum)).slice(0, 2),
    discovery_prompt: null,
  };
}

async function loadRivalry(leftId: string, rightId: string): Promise<PassportRivalry> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('matches')
    .select('player1_id, player2_id, game, winner_id, completed_at')
    .eq('status', 'completed')
    .or(`and(player1_id.eq.${leftId},player2_id.eq.${rightId}),and(player1_id.eq.${rightId},player2_id.eq.${leftId})`)
    .order('completed_at', { ascending: false });
  if (error) console.error('[Passport Compare] Rivalry lookup failed:', error);
  const matches = (data ?? []) as MatchRow[];
  const leftWins = matches.filter((match) => match.winner_id === leftId).length;
  const rightWins = matches.filter((match) => match.winner_id === rightId).length;
  const grouped = new Map<string, MatchRow[]>();
  for (const match of matches) grouped.set(match.game, [...(grouped.get(match.game) ?? []), match]);
  return {
    verified: true,
    total_matches: matches.length,
    left_wins: leftWins,
    right_wins: rightWins,
    draws_or_unresolved: matches.length - leftWins - rightWins,
    leader: !matches.length ? 'none' : leftWins === rightWins ? 'tied' : leftWins > rightWins ? 'left' : 'right',
    by_game: [...grouped.entries()].map(([game, rows]) => ({
      game,
      matches: rows.length,
      left_wins: rows.filter((row) => row.winner_id === leftId).length,
      right_wins: rows.filter((row) => row.winner_id === rightId).length,
      draws_or_unresolved: rows.filter((row) => !row.winner_id).length,
      last_played_at: rows[0]?.completed_at ?? null,
    })),
    latest_match_at: matches[0]?.completed_at ?? null,
  };
}

async function loadMutualFriends(leftId: string, rightId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from('passport_friendships').select('user_a_id, user_b_id').eq('status', 'accepted')
    .or(`user_a_id.eq.${leftId},user_b_id.eq.${leftId},user_a_id.eq.${rightId},user_b_id.eq.${rightId}`);
  const rows = (data ?? []) as Array<{ user_a_id: string; user_b_id: string }>;
  const neighbors = (userId: string) => new Set(rows.filter((row) => row.user_a_id === userId || row.user_b_id === userId).map((row) => row.user_a_id === userId ? row.user_b_id : row.user_a_id));
  const left = neighbors(leftId);
  const ids = [...neighbors(rightId)].filter((id) => left.has(id));
  if (!ids.length) return [];
  const { data: visible } = await supabase.from('passport_profiles').select('user_id')
    .in('user_id', ids).eq('is_discoverable', true).eq('default_visibility', 'public').eq('field_visibility->>social', 'public');
  return getPassportSocialProfiles((visible ?? []).map((row) => String(row.user_id)));
}

async function loadMutualTeams(leftId: string, rightId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from('team_members').select('user_id, team:teams(id, name, slug, avatar_url, visibility)')
    .in('user_id', [leftId, rightId]).eq('status', 'active');
  type Team = { id: string; name: string; slug: string; avatar_url: string | null; visibility: string };
  const rows = (data ?? []) as unknown as Array<{ user_id: string; team: Team | Team[] | null }>;
  const teamsFor = (userId: string) => new Map(rows.filter((row) => row.user_id === userId).flatMap((row) => {
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    return team?.visibility === 'public' ? [[team.id, team] as const] : [];
  }));
  const left = teamsFor(leftId);
  return [...teamsFor(rightId).entries()].flatMap(([id, team]) => left.has(id) ? [{ id, name: team.name, slug: team.slug, avatar_url: team.avatar_url }] : []);
}

function challengeOptions(leftGames: GameKey[], rightGames: GameKey[], leftPlatforms: PlatformKey[], rightPlatforms: PlatformKey[]): PassportChallengeOption[] {
  const sharedGames = overlap(leftGames, rightGames);
  const sharedPlatforms = overlap(leftPlatforms, rightPlatforms);
  return sharedGames.flatMap((game) => {
    const config = GAMES[game];
    if (!config || config.mode !== '1v1') return [];
    return sharedPlatforms.filter((platform) => config.platforms.includes(platform)).map((platform) => ({ game, platform, label: `${config.label} · ${platform}` }));
  });
}

function comparisonFieldVisible(identity: PassportIdentity, field: PassportField, friendView: boolean) {
  if (identity.default_visibility === 'private') return false;
  if (identity.default_visibility === 'friends' && !friendView) return false;
  return identity.field_visibility[field] === 'public' || (friendView && identity.field_visibility[field] === 'friends');
}

const EMPTY_RIVALRY: PassportRivalry = {
  verified: true, total_matches: 0, left_wins: 0, right_wins: 0,
  draws_or_unresolved: 0, leader: 'none', by_game: [], latest_match_at: null,
};

export async function getPassportComparison(
  leftUsername: string,
  rightUsername: string,
  options: { viewerId?: string } = {}
): Promise<PassportComparisonResult> {
  const leftName = normalizePassportUsername(leftUsername);
  const rightName = normalizePassportUsername(rightUsername);
  if (!leftName || !rightName) return { data: null, error: 'Choose two valid players', status: 404 };
  const supabase = createServiceClient();
  const [leftResult, rightResult] = await Promise.all([
    supabase.from('profiles').select('id, username').ilike('username', leftName).maybeSingle(),
    supabase.from('profiles').select('id, username').ilike('username', rightName).maybeSingle(),
  ]);
  const leftProfile = leftResult.data;
  const rightProfile = rightResult.data;
  if (!leftProfile || !rightProfile) return { data: null, error: 'Player not found', status: 404 };
  if (leftProfile.id === rightProfile.id) return { data: null, error: 'Choose two different players', status: 409 };
  if (await hasPassportBlockBetween(leftProfile.id, rightProfile.id)) return { data: null, error: 'This comparison is unavailable', status: 403 };
  if (options.viewerId && (await hasPassportBlockBetween(options.viewerId, leftProfile.id) || await hasPassportBlockBetween(options.viewerId, rightProfile.id))) {
    return { data: null, error: 'This comparison is unavailable', status: 403 };
  }
  const friendView = Boolean(options.viewerId && [leftProfile.id, rightProfile.id].includes(options.viewerId) && await arePassportFriends(leftProfile.id, rightProfile.id));
  const [left, right] = await Promise.all([
    getPassportData(String(leftProfile.username), { friendView }),
    getPassportData(String(rightProfile.username), { friendView }),
  ]);
  if (!left || !right) return { data: null, error: 'Player not found', status: 404 };
  if (left.access === 'restricted' || right.access === 'restricted' || (!friendView && (!left.identity.is_discoverable || !right.identity.is_discoverable))) {
    return { data: null, error: 'This comparison is private', status: 403 };
  }
  const leftMap = uniqueEntries(left.library.entries);
  const rightMap = uniqueEntries(right.library.entries);
  const shared: PassportSharedGameComparison[] = [...leftMap.entries()].flatMap(([key, leftEntry]) => {
    const rightEntry = rightMap.get(key);
    if (!rightEntry) return [];
    return [{
      key,
      game_id: leftEntry.game.id,
      title: leftEntry.game.title,
      cover_url: leftEntry.game.cover_url || rightEntry.game.cover_url,
      genres: [...new Set([...leftEntry.game.genres, ...rightEntry.game.genres])],
      left: leftEntry,
      right: rightEntry,
      same_platform: leftEntry.platform !== 'unspecified' && leftEntry.platform === rightEntry.platform,
      same_status: leftEntry.play_status === rightEntry.play_status,
      rating_difference: leftEntry.rating === null || rightEntry.rating === null ? null : Math.abs(leftEntry.rating - rightEntry.rating),
    }];
  });
  const { comparisonKey } = canonicalPassportPair(leftProfile.id, rightProfile.id);
  const showRivalry = comparisonFieldVisible(left.identity, 'competitive', friendView) && comparisonFieldVisible(right.identity, 'competitive', friendView);
  const showMutualFriends = comparisonFieldVisible(left.identity, 'social', friendView) && comparisonFieldVisible(right.identity, 'social', friendView);
  const showMutualTeams = comparisonFieldVisible(left.identity, 'teams', friendView) && comparisonFieldVisible(right.identity, 'teams', friendView);
  const [rivalry, mutualFriends, mutualTeams, relationship] = await Promise.all([
    showRivalry ? loadRivalry(leftProfile.id, rightProfile.id) : Promise.resolve(EMPTY_RIVALRY),
    showMutualFriends ? loadMutualFriends(leftProfile.id, rightProfile.id) : Promise.resolve([]),
    showMutualTeams ? loadMutualTeams(leftProfile.id, rightProfile.id) : Promise.resolve([]),
    options.viewerId && [leftProfile.id, rightProfile.id].includes(options.viewerId)
      ? getPassportRelationshipState(options.viewerId, options.viewerId === leftProfile.id ? rightProfile.id : leftProfile.id)
      : Promise.resolve(null),
  ]);
  return {
    data: {
      access: friendView ? 'friend' : 'public',
      comparison_key: comparisonKey,
      left: { identity: left.identity, summary: left.summary, library_stats: left.library.stats },
      right: { identity: right.identity, summary: right.summary, library_stats: right.library.stats },
      shared_games: shared,
      left_only_games: [...leftMap.entries()].filter(([key]) => !rightMap.has(key)).map(([, entry]) => entry),
      right_only_games: [...rightMap.entries()].filter(([key]) => !leftMap.has(key)).map(([, entry]) => entry),
      taste_match: buildTasteMatch(left.library.entries, right.library.entries, shared),
      rivalry,
      mutual_friends: mutualFriends,
      mutual_teams: mutualTeams,
      relationship,
      challenge_options: challengeOptions(left.identity.games, right.identity.games, left.identity.platforms, right.identity.platforms),
      generated_at: new Date().toISOString(),
    },
    error: null,
    status: 200,
  };
}
