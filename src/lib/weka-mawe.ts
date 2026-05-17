import type { SupabaseClient } from '@supabase/supabase-js';

export const WEKA_MAWE_ENTRY_FEE_KES = 99;
export const WEKA_MAWE_GAME = 'efootball_mobile';
export const WEKA_MAWE_PLATFORM = 'mobile';
export const WEKA_MAWE_MAX_PAIR_MATCHES_PER_SEASON = 2;
export const WEKA_MAWE_QUEUE_EXPIRY_MINUTES = 15;

type Db = SupabaseClient<any, 'public', any>;

export type WekaMaweSeason = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  entry_fee_kes: number;
  reward_title: string;
  winner_user_id: string | null;
};

export type WekaMaweMatch = {
  id: string;
  season_id: string;
  player_one_id: string;
  player_two_id: string;
  host_user_id: string;
  room_code: string | null;
  room_notes: string | null;
  status: string;
  final_player_one_score: number | null;
  final_player_two_score: number | null;
  winner_user_id: string | null;
  matched_at: string;
  player_one?: { id: string; username: string | null; game_ids?: Record<string, string> | null } | null;
  player_two?: { id: string; username: string | null; game_ids?: Record<string, string> | null } | null;
};

export type WekaMaweLeaderboardRow = {
  userId: string;
  username: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function nairobiLocalDate(date: Date): { year: number; month: number; day: number; dow: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = value('weekday');
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);

  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    dow: dow >= 0 ? dow : 0,
  };
}

function addDaysLocal(date: { year: number; month: number; day: number }, days: number) {
  const utcNoon = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12, 0, 0));
  return nairobiLocalDate(utcNoon);
}

function nairobiMidnightUtc(date: { year: number; month: number; day: number }): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day, -3, 0, 0));
}

export function getCurrentWekaMaweWeek(now = new Date()) {
  const today = nairobiLocalDate(now);
  const startLocal = addDaysLocal(today, -today.dow);
  const endLocal = addDaysLocal(startLocal, 7);
  const startsAt = nairobiMidnightUtc(startLocal);
  const endsAt = new Date(nairobiMidnightUtc(endLocal).getTime() - 1);
  const slug = `weka-mawe-${startLocal.year}-${pad(startLocal.month)}-${pad(startLocal.day)}`;

  return {
    slug,
    title: `Weka Mawe Weekly ${pad(startLocal.day)}/${pad(startLocal.month)}`,
    startsAt,
    endsAt,
  };
}

export async function ensureCurrentWekaMaweSeason(supabase: Db): Promise<WekaMaweSeason> {
  const week = getCurrentWekaMaweWeek();
  const payload = {
    slug: week.slug,
    title: week.title,
    game: WEKA_MAWE_GAME,
    platform: WEKA_MAWE_PLATFORM,
    starts_at: week.startsAt.toISOString(),
    ends_at: week.endsAt.toISOString(),
    status: 'active',
    entry_fee_kes: WEKA_MAWE_ENTRY_FEE_KES,
    reward_title: 'Original World Cup Jersey',
    reward_description: 'Weekly jersey reward for the most active verified eFootball Mobile grinder.',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('weka_mawe_seasons')
    .upsert(payload, { onConflict: 'slug' })
    .select('id, slug, title, starts_at, ends_at, status, entry_fee_kes, reward_title, winner_user_id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not load Weka Mawe season');
  }

  return data as WekaMaweSeason;
}

export async function getPaidWekaMaweRegistration(
  supabase: Db,
  seasonId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('weka_mawe_registrations')
    .select('*')
    .eq('season_id', seasonId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.payment_status !== 'paid' || !data.is_eligible) {
    return null;
  }

  return data;
}

export async function countPairMatches(
  supabase: Db,
  seasonId: string,
  userA: string,
  userB: string
): Promise<number> {
  const { count, error } = await supabase
    .from('weka_mawe_matches')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .neq('status', 'void')
    .or(
      `and(player_one_id.eq.${userA},player_two_id.eq.${userB}),and(player_one_id.eq.${userB},player_two_id.eq.${userA})`
    );

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function tryPairWekaMaweQueue(supabase: Db, seasonId: string) {
  const expiryIso = new Date(Date.now() - WEKA_MAWE_QUEUE_EXPIRY_MINUTES * 60 * 1000).toISOString();
  await supabase
    .from('weka_mawe_queue')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('season_id', seasonId)
    .eq('status', 'waiting')
    .lt('joined_at', expiryIso);

  const { data: queueRows, error } = await supabase
    .from('weka_mawe_queue')
    .select('id, user_id, joined_at')
    .eq('season_id', seasonId)
    .eq('status', 'waiting')
    .order('joined_at', { ascending: true })
    .limit(20);

  if (error || !queueRows || queueRows.length < 2) {
    return null;
  }

  for (let i = 0; i < queueRows.length; i += 1) {
    for (let j = i + 1; j < queueRows.length; j += 1) {
      const left = queueRows[i] as { id: string; user_id: string };
      const right = queueRows[j] as { id: string; user_id: string };
      const pairCount = await countPairMatches(supabase, seasonId, left.user_id, right.user_id);
      if (pairCount >= WEKA_MAWE_MAX_PAIR_MATCHES_PER_SEASON) {
        continue;
      }

      const { data: match, error: matchError } = await supabase
        .from('weka_mawe_matches')
        .insert({
          season_id: seasonId,
          player_one_id: left.user_id,
          player_two_id: right.user_id,
          host_user_id: left.user_id,
          status: 'waiting_for_room',
        })
        .select('*')
        .single();

      if (matchError || !match) {
        throw new Error(matchError?.message ?? 'Could not create Weka Mawe match');
      }

      await supabase
        .from('weka_mawe_queue')
        .update({ status: 'matched', matched_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in('id', [left.id, right.id]);

      return match as WekaMaweMatch;
    }
  }

  return null;
}

export async function loadActiveWekaMaweMatch(supabase: Db, seasonId: string, userId: string) {
  const { data, error } = await supabase
    .from('weka_mawe_matches')
    .select(
      '*, player_one:player_one_id(id, username, game_ids), player_two:player_two_id(id, username, game_ids)'
    )
    .eq('season_id', seasonId)
    .in('status', ['waiting_for_room', 'room_shared', 'awaiting_results', 'under_review', 'disputed'])
    .or(`player_one_id.eq.${userId},player_two_id.eq.${userId}`)
    .order('matched_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as WekaMaweMatch | null) ?? null;
}

export async function buildWekaMaweLeaderboard(
  supabase: Db,
  seasonId: string
): Promise<WekaMaweLeaderboardRow[]> {
  const { data: matches, error } = await supabase
    .from('weka_mawe_matches')
    .select('player_one_id, player_two_id, final_player_one_score, final_player_two_score, winner_user_id')
    .eq('season_id', seasonId)
    .eq('status', 'verified');

  if (error) {
    throw new Error(error.message);
  }

  const rows = new Map<string, WekaMaweLeaderboardRow>();
  const playerIds = new Set<string>();

  for (const match of (matches ?? []) as any[]) {
    playerIds.add(match.player_one_id);
    playerIds.add(match.player_two_id);
  }

  if (playerIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', Array.from(playerIds));

    for (const profile of (profiles ?? []) as Array<{ id: string; username: string | null }>) {
      rows.set(profile.id, {
        userId: profile.id,
        username: profile.username ?? 'Player',
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      });
    }
  }

  function row(userId: string) {
    if (!rows.has(userId)) {
      rows.set(userId, {
        userId,
        username: 'Player',
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      });
    }
    return rows.get(userId)!;
  }

  for (const match of (matches ?? []) as any[]) {
    const oneScore = Number(match.final_player_one_score ?? 0);
    const twoScore = Number(match.final_player_two_score ?? 0);
    const one = row(match.player_one_id);
    const two = row(match.player_two_id);

    one.played += 1;
    two.played += 1;
    one.goalsFor += oneScore;
    one.goalsAgainst += twoScore;
    two.goalsFor += twoScore;
    two.goalsAgainst += oneScore;

    if (oneScore === twoScore) {
      one.draws += 1;
      two.draws += 1;
      one.points += 1;
      two.points += 1;
    } else if (oneScore > twoScore) {
      one.wins += 1;
      two.losses += 1;
      one.points += 3;
    } else {
      two.wins += 1;
      one.losses += 1;
      two.points += 3;
    }
  }

  return Array.from(rows.values()).sort((a, b) => {
    const goalDiffA = a.goalsFor - a.goalsAgainst;
    const goalDiffB = b.goalsFor - b.goalsAgainst;
    return (
      b.points - a.points ||
      b.played - a.played ||
      goalDiffB - goalDiffA ||
      b.goalsFor - a.goalsFor ||
      a.username.localeCompare(b.username)
    );
  });
}

export function winnerFromScore(
  playerOneId: string,
  playerTwoId: string,
  playerOneScore: number,
  playerTwoScore: number
) {
  if (playerOneScore === playerTwoScore) return null;
  return playerOneScore > playerTwoScore ? playerOneId : playerTwoId;
}

export function readNonNegativeScore(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const score = Number(text);
  return Number.isSafeInteger(score) ? score : null;
}

export function cleanShortText(value: unknown, maxLength = 120): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}
