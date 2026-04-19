import {
  GAMES,
  getCanonicalGameKey,
  getConfiguredPlatformForGame,
  getGameRatingKey,
  isValidGamePlatform,
  normalizeSelectedGameKeys,
  supportsLobbyMode,
} from '@/lib/config';
import { notifyGameAudienceAboutQueue } from '@/lib/game-audience';
import { resolveProfileLocation, UNSPECIFIED_LOCATION_LABEL } from '@/lib/location';
import { canStartMatch } from '@/lib/plans';
import { runMatchmaking } from '@/lib/matchmaking';
import { expireWaitingQueueEntries } from '@/lib/queue';
import { maybeExpireProfilePlan, getTodayMatchCount } from '@/lib/subscription';
import { createServiceClient } from '@/lib/supabase';
import { CONFIRMED_PAYMENT_STATUSES } from '@/lib/tournaments';
import type {
  GameKey,
  Lobby,
  Match,
  PlatformKey,
  Profile,
  QueueEntry,
  Tournament,
} from '@/types';

type PlayerActionProfile = Record<string, unknown> & {
  id: string;
  username: string;
  region?: string | null;
  plan?: string | null;
  plan_expires_at?: string | null;
  platforms?: PlatformKey[] | null;
  game_ids?: Record<string, string> | null;
  selected_games?: string[] | null;
  xp?: number | null;
  level?: number | null;
  mp?: number | null;
  win_streak?: number | null;
};

type QueueStatusRow = Record<string, unknown> & {
  id: string;
  game: GameKey;
  platform?: PlatformKey | null;
  status: QueueEntry['status'];
  joined_at: string;
};

type MatchStatusRow = Match &
  Partial<{
    player1: Pick<Profile, 'id' | 'username'> | null;
    player2: Pick<Profile, 'id' | 'username'> | null;
  }>;

type LobbyRow = Record<string, unknown> &
  Lobby & {
    host?: Pick<Profile, 'id' | 'username'> | null;
    member_count?: unknown;
  };

type TournamentRow = Record<string, unknown> & Tournament;

export interface PlayerDashboardSnapshot {
  profile: {
    id: string;
    username: string;
    plan: 'free' | 'pro' | 'elite';
    level: number;
    mp: number;
    win_streak: number;
    selectedGames: GameKey[];
    rankedGames: GameKey[];
    lobbyGames: GameKey[];
    bestGame:
      | {
          game: GameKey;
          rating: number;
        }
      | null;
  };
  queueEntry: QueueStatusRow | null;
  activeMatch: MatchStatusRow | null;
}

export type JoinQueueResult =
  | {
      status: 'joined' | 'already_in_queue';
      game: GameKey;
      platform: PlatformKey | null;
      queueEntry: QueueStatusRow;
    }
  | {
      status: 'matched' | 'active_match';
      game: GameKey;
      match: MatchStatusRow;
    }
  | {
      status:
        | 'profile_missing'
        | 'requires_game'
        | 'invalid_game'
        | 'wrong_mode'
        | 'game_not_selected'
        | 'missing_platform'
        | 'failed';
      message: string;
      availableGames?: GameKey[];
      game?: GameKey;
    }
  | {
      status: 'limit_reached';
      message: string;
      plan: 'free' | 'pro' | 'elite';
      used: number;
    };

export type LeaveQueueResult =
  | { status: 'left'; cancelledCount: number }
  | { status: 'not_in_queue' };

export type ListLobbiesResult =
  | {
      status: 'ok';
      lobbies: Array<{
        id: string;
        title: string;
        game: GameKey;
        mode: string;
        map_name: string | null;
        scheduled_for: string | null;
        member_count: number;
        max_players: number;
        host: string | null;
      }>;
      filterGame: GameKey | null;
    }
  | {
      status: 'invalid_game' | 'wrong_mode';
      message: string;
      game?: GameKey;
    };

export type ListTournamentsResult =
  | {
      status: 'ok';
      tournaments: Array<{
        id: string;
        slug: string;
        title: string;
        game: GameKey;
        platform: PlatformKey | null;
        entry_fee: number;
        size: number;
        player_count: number;
        region: string;
      }>;
      filterGame: GameKey | null;
    }
  | {
      status: 'invalid_game' | 'wrong_mode';
      message: string;
      game?: GameKey;
    };

function getSupabase() {
  return createServiceClient();
}

function readRelationCount(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0] as { count?: unknown } | undefined;
    return typeof first?.count === 'number' ? first.count : 0;
  }

  if (value && typeof value === 'object' && 'count' in value) {
    const count = (value as { count?: unknown }).count;
    return typeof count === 'number' ? count : 0;
  }

  return 0;
}

function normalizeQueueEntryPlatform(
  queueEntry: QueueStatusRow | null,
  profile: PlayerActionProfile
) {
  if (!queueEntry) {
    return null;
  }

  if (queueEntry.platform) {
    return queueEntry;
  }

  const derivedPlatform = getConfiguredPlatformForGame(
    queueEntry.game,
    (profile.game_ids as Record<string, string>) ?? {},
    ((profile.platforms as PlatformKey[]) ?? []) as PlatformKey[]
  );

  return {
    ...queueEntry,
    platform: derivedPlatform,
  };
}

async function getProfileByUserId(userId: string, supabase = getSupabase()) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error || !data) {
    return null;
  }

  const profile = data as PlayerActionProfile;
  const resolvedPlan = await maybeExpireProfilePlan(
    {
      id: profile.id,
      plan: profile.plan ?? 'free',
      plan_expires_at: profile.plan_expires_at ?? null,
    },
    supabase
  );

  return {
    ...profile,
    plan: resolvedPlan,
  } satisfies PlayerActionProfile;
}

async function getActiveMatchForUser(userId: string, supabase = getSupabase()) {
  const { data: matchRaw } = await supabase
    .from('matches')
    .select('*')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const match = (matchRaw as Match | null) ?? null;
  if (!match) {
    return null;
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', [match.player1_id, match.player2_id]);

  const profileRows = ((profiles ?? []) as Array<Pick<Profile, 'id' | 'username'>>) ?? [];

  return {
    ...match,
    player1: profileRows.find((profile) => profile.id === match.player1_id) ?? null,
    player2: profileRows.find((profile) => profile.id === match.player2_id) ?? null,
  } satisfies MatchStatusRow;
}

async function getQueueEntryForUser(userId: string, profile?: PlayerActionProfile | null, supabase = getSupabase()) {
  await expireWaitingQueueEntries(supabase, userId);

  const { data } = await supabase
    .from('queue')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['waiting', 'matched'])
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const queueEntry = (data as QueueStatusRow | null) ?? null;
  if (!queueEntry || !profile) {
    return queueEntry;
  }

  return normalizeQueueEntryPlatform(queueEntry, profile);
}

function resolveRequestedGame(
  requestedGame: GameKey | null | undefined,
  selectedGames: GameKey[]
) {
  if (requestedGame) {
    return GAMES[requestedGame] ? getCanonicalGameKey(requestedGame) : null;
  }

  const rankedGames = selectedGames.filter((game) => GAMES[game]?.mode === '1v1');
  if (rankedGames.length === 1) {
    return rankedGames[0];
  }

  return null;
}

function getAvailableRankedGames(profile: PlayerActionProfile) {
  return normalizeSelectedGameKeys((profile.selected_games as string[]) ?? []).filter(
    (game) => GAMES[game]?.mode === '1v1'
  );
}

export async function getPlayerDashboardSnapshot(userId: string): Promise<PlayerDashboardSnapshot | null> {
  const supabase = getSupabase();
  const profile = await getProfileByUserId(userId, supabase);
  if (!profile) {
    return null;
  }

  const [queueEntry, activeMatch] = await Promise.all([
    getQueueEntryForUser(userId, profile, supabase),
    getActiveMatchForUser(userId, supabase),
  ]);

  const selectedGames = normalizeSelectedGameKeys((profile.selected_games as string[]) ?? []);
  const rankedGames = selectedGames.filter((game) => GAMES[game]?.mode === '1v1');
  const lobbyGames = selectedGames.filter((game) => supportsLobbyMode(game));
  const profileValues = profile as Record<string, unknown>;
  const bestGame = rankedGames.reduce<{ game: GameKey; rating: number } | null>((best, game) => {
    const rating = Number(profileValues[getGameRatingKey(game)] ?? 1000);
    if (!best || rating > best.rating) {
      return { game, rating };
    }
    return best;
  }, null);

  return {
    profile: {
      id: profile.id,
      username: profile.username,
      plan: (profile.plan as 'free' | 'pro' | 'elite') ?? 'free',
      level: Number(profile.level ?? 1),
      mp: Number(profile.mp ?? 0),
      win_streak: Number(profile.win_streak ?? 0),
      selectedGames,
      rankedGames,
      lobbyGames,
      bestGame,
    },
    queueEntry,
    activeMatch,
  };
}

export async function joinQueueForUser(params: {
  userId: string;
  game?: GameKey | null;
  platform?: PlatformKey | null;
}): Promise<JoinQueueResult> {
  const supabase = getSupabase();
  const profile = await getProfileByUserId(params.userId, supabase);
  if (!profile) {
    return {
      status: 'profile_missing',
      message: 'Your Mechi profile was not found for this number.',
    };
  }

  const selectedGames = normalizeSelectedGameKeys((profile.selected_games as string[]) ?? []);
  const availableRankedGames = getAvailableRankedGames(profile);
  const game = resolveRequestedGame(params.game ?? null, selectedGames);

  if (!game) {
    return {
      status: 'requires_game',
      message: 'Pick which 1v1 title you want for queue.',
      availableGames: availableRankedGames,
    };
  }

  if (!GAMES[game]) {
    return {
      status: 'invalid_game',
      message: 'That game is not supported on Mechi right now.',
    };
  }

  if (GAMES[game].mode !== '1v1') {
    return {
      status: 'wrong_mode',
      message: 'That title uses lobbies, not ranked matchmaking.',
      game,
    };
  }

  const plan = (profile.plan as 'free' | 'pro' | 'elite') ?? 'free';
  const usedToday = await getTodayMatchCount(params.userId, supabase);

  if (!canStartMatch(plan, usedToday)) {
    return {
      status: 'limit_reached',
      message: 'Daily match limit reached.',
      plan,
      used: usedToday,
    };
  }

  if (!selectedGames.includes(game)) {
    return {
      status: 'game_not_selected',
      message: `Add ${GAMES[game].label} to your profile before joining queue.`,
      game,
    };
  }

  const requestedPlatform = params.platform ?? null;
  const profilePlatforms = ((profile.platforms as PlatformKey[]) ?? []) as PlatformKey[];
  const profileGameIds = ((profile.game_ids as Record<string, string>) ?? {}) as Record<string, string>;

  const queuePlatform =
    requestedPlatform && isValidGamePlatform(game, requestedPlatform)
      ? requestedPlatform
      : getConfiguredPlatformForGame(game, profileGameIds, profilePlatforms);

  if (!queuePlatform || !profilePlatforms.includes(queuePlatform)) {
    return {
      status: 'missing_platform',
      message: `Set a valid platform for ${GAMES[game].label} first.`,
      game,
    };
  }

  const existingQueue = await getQueueEntryForUser(params.userId, profile, supabase);
  if (existingQueue?.status === 'waiting') {
    return {
      status: 'already_in_queue',
      game: existingQueue.game,
      platform: (existingQueue.platform as PlatformKey | null | undefined) ?? queuePlatform,
      queueEntry: existingQueue,
    };
  }

  const activeMatch = await getActiveMatchForUser(params.userId, supabase);
  if (activeMatch) {
    return {
      status: 'active_match',
      game: activeMatch.game,
      match: activeMatch,
    };
  }

  const rating = Number((profile as Record<string, unknown>)[getGameRatingKey(game)] ?? 1000);
  const profileLocation = resolveProfileLocation(profile);
  const queuePayload = {
    user_id: params.userId,
    game,
    platform: queuePlatform,
    region: profileLocation.label || UNSPECIFIED_LOCATION_LABEL,
    rating,
    status: 'waiting' as const,
  };

  const { data: entry, error } = await supabase.from('queue').insert(queuePayload).select('*').single();

  if (error || !entry) {
    console.error('[Player Actions] Queue insert error:', error);
    return {
      status: 'failed',
      message: 'Could not join queue right now.',
      game,
    };
  }

  try {
    await runMatchmaking(supabase);
  } catch (matchmakingError) {
    console.error('[Player Actions] Matchmaking error:', matchmakingError);
  }

  const [matchedQueueEntry, matchedMatch] = await Promise.all([
    getQueueEntryForUser(params.userId, profile, supabase),
    getActiveMatchForUser(params.userId, supabase),
  ]);

  if (matchedMatch) {
    return {
      status: 'matched',
      game: matchedMatch.game,
      match: matchedMatch,
    };
  }

  if (matchedQueueEntry?.status === 'waiting') {
    try {
      await notifyGameAudienceAboutQueue({
        supabase,
        actorUserId: params.userId,
        game,
        username: profile.username,
        platform: queuePlatform,
        excludeUserIds: [params.userId],
      });
    } catch (broadcastError) {
      console.error('[Player Actions] Queue broadcast error:', broadcastError);
    }
  }

  return {
    status: 'joined',
    game,
    platform: queuePlatform,
    queueEntry:
      matchedQueueEntry ??
      ({
        ...(entry as QueueStatusRow),
        platform: queuePlatform,
      } satisfies QueueStatusRow),
  };
}

export async function leaveQueueForUser(userId: string): Promise<LeaveQueueResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('queue')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('status', 'waiting')
    .select('id');

  if (error) {
    console.error('[Player Actions] Queue leave error:', error);
    return { status: 'not_in_queue' };
  }

  const cancelledCount = Array.isArray(data) ? data.length : 0;
  if (cancelledCount === 0) {
    return { status: 'not_in_queue' };
  }

  return {
    status: 'left',
    cancelledCount,
  };
}

export async function listOpenLobbies(params: {
  userId?: string | null;
  game?: GameKey | null;
  limit?: number;
}): Promise<ListLobbiesResult> {
  const supabase = getSupabase();
  const limit = Math.min(Math.max(params.limit ?? 4, 1), 8);
  const requestedGame = params.game ? getCanonicalGameKey(params.game) : null;

  if (requestedGame && !GAMES[requestedGame]) {
    return {
      status: 'invalid_game',
      message: 'That game is not supported on Mechi right now.',
    };
  }

  if (requestedGame && !supportsLobbyMode(requestedGame)) {
    return {
      status: 'wrong_mode',
      message: `${GAMES[requestedGame].label} does not use the lobby lane.`,
      game: requestedGame,
    };
  }

  let filterGames: GameKey[] = [];

  if (requestedGame) {
    filterGames = [requestedGame];
  } else if (params.userId) {
    const profile = await getProfileByUserId(params.userId, supabase);
    filterGames = profile
      ? normalizeSelectedGameKeys((profile.selected_games as string[]) ?? []).filter((game) => supportsLobbyMode(game))
      : [];
  }

  let query = supabase
    .from('lobbies')
    .select('*, host:host_id(id, username), member_count:lobby_members(count)')
    .eq('visibility', 'public')
    .eq('status', 'open')
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (filterGames.length > 0) {
    query = query.in('game', filterGames);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Player Actions] Lobbies list error:', error);
    return {
      status: 'ok',
      lobbies: [],
      filterGame: requestedGame,
    };
  }

  return {
    status: 'ok',
    lobbies: ((data ?? []) as LobbyRow[]).map((lobby) => ({
      id: lobby.id,
      title: lobby.title,
      game: lobby.game,
      mode: lobby.mode,
      map_name: lobby.map_name ?? null,
      scheduled_for: lobby.scheduled_for ?? null,
      member_count: readRelationCount(lobby.member_count),
      max_players: lobby.max_players,
      host: lobby.host?.username ?? null,
    })),
    filterGame: requestedGame,
  };
}

export async function listOpenTournaments(params: {
  userId?: string | null;
  game?: GameKey | null;
  limit?: number;
}): Promise<ListTournamentsResult> {
  const supabase = getSupabase();
  const limit = Math.min(Math.max(params.limit ?? 4, 1), 8);
  const requestedGame = params.game ? getCanonicalGameKey(params.game) : null;

  if (requestedGame && !GAMES[requestedGame]) {
    return {
      status: 'invalid_game',
      message: 'That game is not supported on Mechi right now.',
    };
  }

  if (requestedGame && GAMES[requestedGame].mode !== '1v1') {
    return {
      status: 'wrong_mode',
      message: `${GAMES[requestedGame].label} is not in the tournament lane right now.`,
      game: requestedGame,
    };
  }

  let filterGames: GameKey[] = [];

  if (requestedGame) {
    filterGames = [requestedGame];
  } else if (params.userId) {
    const profile = await getProfileByUserId(params.userId, supabase);
    filterGames = profile
      ? normalizeSelectedGameKeys((profile.selected_games as string[]) ?? []).filter(
          (game) => GAMES[game]?.mode === '1v1'
        )
      : [];
  }

  let query = supabase
    .from('tournaments')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filterGames.length > 0) {
    query = query.in('game', filterGames);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Player Actions] Tournament list error:', error);
    return {
      status: 'ok',
      tournaments: [],
      filterGame: requestedGame,
    };
  }

  const tournaments = ((data ?? []) as TournamentRow[]).slice(0, limit);
  const tournamentIds = tournaments.map((tournament) => tournament.id);

  if (tournamentIds.length === 0) {
    return {
      status: 'ok',
      tournaments: [],
      filterGame: requestedGame,
    };
  }

  const { data: players } = await supabase
    .from('tournament_players')
    .select('tournament_id')
    .in('tournament_id', tournamentIds)
    .in('payment_status', [...CONFIRMED_PAYMENT_STATUSES]);

  const playerCounts = ((players ?? []) as Array<{ tournament_id?: string | null }>).reduce<
    Record<string, number>
  >((counts, player) => {
    if (player.tournament_id) {
      counts[player.tournament_id] = (counts[player.tournament_id] ?? 0) + 1;
    }
    return counts;
  }, {});

  return {
    status: 'ok',
    tournaments: tournaments.map((tournament) => ({
      id: tournament.id,
      slug: tournament.slug,
      title: tournament.title,
      game: tournament.game,
      platform: tournament.platform ?? null,
      entry_fee: tournament.entry_fee,
      size: tournament.size,
      player_count: playerCounts[tournament.id] ?? 0,
      region: tournament.region,
    })),
    filterGame: requestedGame,
  };
}
