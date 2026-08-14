import 'server-only';

import { isMissingTableError } from '@/lib/db-compat';
import {
  getPublicProfileData,
  getPublicProfileDataByUserId,
} from '@/lib/public-profile';
import { getPassportGameLibraryByUserId } from '@/lib/passport-games';
import {
  getPassportPathFromHandle,
  isSafePassportDisplayName,
  normalizePassportHandle,
  PASSPORT_PUBLICATION_CONSENT_VERSION,
  validatePassportHandle,
  type PassportPublicationStatus,
} from '@/lib/passport-handle';
import { createServiceClient } from '@/lib/supabase';
import {
  getProfileAgePolicy,
  isMinorAccount,
  MINOR_PASSPORT_PRIVACY_ERROR,
} from '@/lib/passport-age-policy';
import {
  DEFAULT_PASSPORT_FIELD_VISIBILITY,
  PASSPORT_ARCHETYPES,
  PASSPORT_FIELDS,
  PASSPORT_STATUSES,
  PASSPORT_VISIBILITIES,
  type PassportArchetype,
  type PassportEventPreview,
  type PassportFieldVisibility,
  type PassportIdentity,
  type PassportOwnerData,
  type PassportStatus,
  type PassportSummary,
  type PassportTeamPreview,
  type PassportVerificationRecordPreview,
  type PassportVisibility,
  type PublicPassportData,
} from '@/lib/passport-types';
import {
  buildPublicPassportSummary,
  isPassportFieldVisible,
} from '@/lib/passport-public-summary';
import { filterPublicPassportVerifications } from '@/lib/passport-verification-privacy';
import type { GameKey, PlatformKey } from '@/types';

const PASSPORT_PROFILE_SELECT =
  'user_id, public_handle, publication_status, published_at, publication_consent_version, publication_consent_at, display_name, bio, gamer_since, archetypes, current_status, default_visibility, field_visibility, is_discoverable, card_accent, created_at, updated_at';

type PassportProfileRow = {
  user_id: string;
  public_handle: string | null;
  publication_status: PassportPublicationStatus;
  published_at: string | null;
  publication_consent_version: string | null;
  publication_consent_at: string | null;
  display_name: string | null;
  bio: string;
  gamer_since: number | null;
  archetypes: string[];
  current_status: string;
  default_visibility: string;
  field_visibility: Record<string, unknown> | null;
  is_discoverable: boolean;
  card_accent: string;
  created_at: string;
  updated_at: string;
};

type TournamentRelation = {
  id?: string;
  slug?: string;
  title?: string;
  game?: string | null;
  status?: string;
  scheduled_for?: string | null;
} | Array<{
  id?: string;
  slug?: string;
  title?: string;
  game?: string | null;
  status?: string;
  scheduled_for?: string | null;
}> | null;

type TournamentPlayerRow = {
  id: string;
  payment_status: string;
  check_in_status?: string | null;
  checked_in_at?: string | null;
  joined_at: string;
  tournament?: TournamentRelation;
};

type OnlineTournamentRegistrationRow = {
  id: string;
  event_slug: string;
  game: string;
  check_in_status?: string | null;
  created_at: string;
};

type TeamMemberRow = {
  role: string;
  joined_at: string;
  team?: {
    id?: string;
    name?: string;
    slug?: string;
    avatar_url?: string | null;
    visibility?: string;
  } | Array<{
    id?: string;
    name?: string;
    slug?: string;
    avatar_url?: string | null;
    visibility?: string;
  }> | null;
};

type VerificationRow = PassportVerificationRecordPreview & {
  revoked_at?: string | null;
};

type PassportEventCounts = {
  registered: number;
  attended: number;
  completed: number;
};

export type PassportUpdateInput = {
  public_handle?: string | null;
  display_name?: string | null;
  bio?: string;
  gamer_since?: number | null;
  archetypes?: PassportArchetype[];
  current_status?: PassportStatus;
  default_visibility?: PassportVisibility;
  field_visibility?: Partial<PassportFieldVisibility>;
  is_discoverable?: boolean;
  card_accent?: string;
};

export function normalizePassportUsername(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Invalid percent encoding is rejected by returning an empty username.
    return '';
  }

  const trimmed = decoded.trim();
  return (trimmed.startsWith('@') ? trimmed.slice(1) : trimmed).trim();
}

export function getPassportPath(username: string): string {
  return getPassportPathFromHandle(username);
}

export async function resolvePublicPassportHandleForAccountUsername(
  accountUsername: string
): Promise<string | null> {
  const profile = await getPublicProfileData(normalizePassportUsername(accountUsername));
  if (!profile) return null;
  if (await isMinorAccount(profile.id)) return null;
  const result = await createServiceClient()
    .from('passport_profiles')
    .select('public_handle')
    .eq('user_id', profile.id)
    .eq('publication_status', 'published')
    .maybeSingle();
  const handle = typeof result.data?.public_handle === 'string' ? result.data.public_handle : '';
  return !result.error && validatePassportHandle(handle).valid ? normalizePassportHandle(handle) : null;
}

export function normalizePassportVisibility(
  value: unknown,
  fallback: PassportVisibility = 'private'
): PassportVisibility {
  return typeof value === 'string' && PASSPORT_VISIBILITIES.includes(value as PassportVisibility)
    ? (value as PassportVisibility)
    : fallback;
}

export function normalizePassportFieldVisibility(
  value: unknown
): PassportFieldVisibility {
  const candidate = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  return Object.fromEntries(
    PASSPORT_FIELDS.map((field) => [
      field,
      normalizePassportVisibility(candidate[field], DEFAULT_PASSPORT_FIELD_VISIBILITY[field]),
    ])
  ) as PassportFieldVisibility;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function defaultPassportIdentity(
  profile: NonNullable<Awaited<ReturnType<typeof getPublicProfileData>>>,
  row: PassportProfileRow | null,
  storageReady: boolean
): PassportIdentity {
  const archetypes = (row?.archetypes ?? []).filter(
    (value): value is PassportArchetype =>
      PASSPORT_ARCHETYPES.includes(value as PassportArchetype)
  );
  const currentStatus = PASSPORT_STATUSES.includes(row?.current_status as PassportStatus)
    ? (row?.current_status as PassportStatus)
    : 'offline';

  return {
    user_id: profile.id,
    username: row?.public_handle ?? '',
    public_handle: row?.public_handle ?? null,
    publication_status: row?.publication_status === 'published' ? 'published' : 'draft',
    published_at: row?.published_at ?? null,
    publication_consent_version: row?.publication_consent_version ?? null,
    publication_consent_at: row?.publication_consent_at ?? null,
    display_name: isSafePassportDisplayName(row?.display_name ?? '')
      ? (row?.display_name?.trim() as string)
      : row?.public_handle ?? 'Player',
    bio: row?.bio ?? '',
    gamer_since: row?.gamer_since ?? null,
    archetypes,
    current_status: currentStatus,
    default_visibility: normalizePassportVisibility(row?.default_visibility),
    field_visibility: normalizePassportFieldVisibility(row?.field_visibility),
    is_discoverable: row?.is_discoverable ?? false,
    card_accent: /^#[0-9a-f]{6}$/i.test(row?.card_accent ?? '')
      ? (row?.card_accent as string)
      : '#32E0C4',
    avatar_url: typeof profile.avatar_url === 'string' ? profile.avatar_url : null,
    cover_url: typeof profile.cover_url === 'string' ? profile.cover_url : null,
    country: profile.country,
    region: profile.region,
    location_label: profile.location_label,
    platforms: (profile.platforms ?? []) as PlatformKey[],
    games: profile.games,
    game_ids: profile.game_ids ?? {},
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
    storage_ready: storageReady,
  };
}

function restrictedIdentity(identity: PassportIdentity, friendView = false): PassportIdentity {
  return {
    ...identity,
    bio: isPassportFieldVisible(identity, 'bio', friendView) ? identity.bio : '',
    gamer_since: isPassportFieldVisible(identity, 'gamer_since', friendView) ? identity.gamer_since : null,
    archetypes: isPassportFieldVisible(identity, 'archetypes', friendView) ? identity.archetypes : [],
    current_status: isPassportFieldVisible(identity, 'current_status', friendView) ? identity.current_status : 'offline',
    country: isPassportFieldVisible(identity, 'location', friendView) ? identity.country : null,
    region: isPassportFieldVisible(identity, 'location', friendView) ? identity.region : null,
    location_label: isPassportFieldVisible(identity, 'location', friendView) ? identity.location_label : '',
    platforms: isPassportFieldVisible(identity, 'platforms', friendView) ? identity.platforms : [],
    games: isPassportFieldVisible(identity, 'games', friendView) ? identity.games : [],
    game_ids: isPassportFieldVisible(identity, 'game_ids', friendView) ? identity.game_ids : {},
  };
}

async function loadPassportProfile(
  userId: string
): Promise<{ row: PassportProfileRow | null; storageReady: boolean }> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('passport_profiles')
    .select(PASSPORT_PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (result.error) {
    if (isMissingTableError(result.error, 'passport_profiles')) {
      return { row: null, storageReady: false };
    }
    console.error('[Passport] Could not load identity:', result.error);
    return { row: null, storageReady: true };
  }

  return {
    row: (result.data as PassportProfileRow | null) ?? null,
    storageReady: true,
  };
}

async function countRows(table: string, userId: string): Promise<number> {
  const supabase = createServiceClient();
  const result = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (result.error) {
    if (!isMissingTableError(result.error, table)) {
      console.error(`[Passport] Could not count ${table}:`, result.error);
    }
    return 0;
  }

  return result.count ?? 0;
}

async function loadTournamentHistory(userId: string): Promise<TournamentPlayerRow[]> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('tournament_players')
    .select(
      'id, payment_status, check_in_status, checked_in_at, joined_at, tournament:tournaments(id, slug, title, game, status, scheduled_for)'
    )
    .eq('user_id', userId)
    .in('payment_status', ['paid', 'free'])
    .order('joined_at', { ascending: false })
    .limit(24);

  if (result.error) {
    console.error('[Passport] Could not load tournament history:', result.error);
    return [];
  }

  return (result.data ?? []) as TournamentPlayerRow[];
}

async function loadOnlineTournamentHistory(
  userId: string
): Promise<OnlineTournamentRegistrationRow[]> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('online_tournament_registrations')
    .select('id, event_slug, game, check_in_status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (result.error) {
    if (!isMissingTableError(result.error, 'online_tournament_registrations')) {
      console.error('[Passport] Could not load PlayMechi event history:', result.error);
    }
    return [];
  }

  return (result.data ?? []) as OnlineTournamentRegistrationRow[];
}

async function loadEventCounts(userId: string): Promise<PassportEventCounts> {
  const supabase = createServiceClient();
  const [genericRegistered, genericAttended, genericCompleted, onlineRegistered, onlineAttended] =
    await Promise.all([
      supabase
        .from('tournament_players')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('payment_status', ['paid', 'free']),
      supabase
        .from('tournament_players')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('check_in_status', 'checked_in'),
      supabase
        .from('tournament_players')
        .select('id, tournament:tournaments!inner(status)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('check_in_status', 'checked_in')
        .eq('tournaments.status', 'completed'),
      supabase
        .from('online_tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('online_tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('check_in_status', 'checked_in'),
    ]);

  for (const [label, result, table] of [
    ['generic registrations', genericRegistered, 'tournament_players'],
    ['generic check-ins', genericAttended, 'tournament_players'],
    ['completed events', genericCompleted, 'tournament_players'],
    ['PlayMechi registrations', onlineRegistered, 'online_tournament_registrations'],
    ['PlayMechi check-ins', onlineAttended, 'online_tournament_registrations'],
  ] as const) {
    if (result.error && !isMissingTableError(result.error, table)) {
      console.error(`[Passport] Could not count ${label}:`, result.error);
    }
  }

  return {
    registered: (genericRegistered.count ?? 0) + (onlineRegistered.count ?? 0),
    attended: (genericAttended.count ?? 0) + (onlineAttended.count ?? 0),
    completed: genericCompleted.count ?? 0,
  };
}

async function loadTeams(userId: string): Promise<PassportTeamPreview[]> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('team_members')
    .select('role, joined_at, team:teams(id, name, slug, avatar_url, visibility)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(12);

  if (result.error) {
    if (!isMissingTableError(result.error, 'team_members')) {
      console.error('[Passport] Could not load teams:', result.error);
    }
    return [];
  }

  return ((result.data ?? []) as TeamMemberRow[]).flatMap((membership) => {
    const team = firstRelation(membership.team);
    if (!team?.id || !team.name || !team.slug || team.visibility !== 'public') {
      return [];
    }
    return [{
      id: team.id,
      name: team.name,
      slug: team.slug,
      avatar_url: team.avatar_url ?? null,
      role: membership.role,
      joined_at: membership.joined_at,
    }];
  });
}

async function loadVerifications(userId: string): Promise<PassportVerificationRecordPreview[]> {
  const supabase = createServiceClient();
  const result = await supabase
    .from('passport_verification_records')
    .select(
      'id, subject_type, verification_state, label, source_type, public_details, issued_at, revoked_at'
    )
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('issued_at', { ascending: false })
    .limit(12);

  if (result.error) {
    if (!isMissingTableError(result.error, 'passport_verification_records')) {
      console.error('[Passport] Could not load verification records:', result.error);
    }
    return [];
  }

  return ((result.data ?? []) as VerificationRow[]).map((row) => ({
    id: row.id,
    subject_type: row.subject_type,
    verification_state: row.verification_state,
    label: row.label,
    source_type: row.source_type,
    public_details: row.public_details,
    issued_at: row.issued_at,
  }));
}

function mapGenericEvents(rows: TournamentPlayerRow[]): PassportEventPreview[] {
  return rows.flatMap((row) => {
    const tournament = firstRelation(row.tournament);
    if (!tournament?.id || !tournament.slug || !tournament.title) {
      return [];
    }
    const participationStatus = row.check_in_status === 'checked_in'
      ? 'checked_in'
      : row.check_in_status === 'no_show'
        ? 'no_show'
        : 'registered';

    return [{
      id: row.id,
      slug: tournament.slug,
      title: tournament.title,
      game: (tournament.game as GameKey | null | undefined) ?? null,
      status: tournament.status ?? 'open',
      participation_status: participationStatus,
      joined_at: row.joined_at,
      checked_in_at: row.checked_in_at ?? null,
      scheduled_for: tournament.scheduled_for ?? null,
    }];
  });
}

function mapOnlineEvents(rows: OnlineTournamentRegistrationRow[]): PassportEventPreview[] {
  return rows.map((row) => ({
    id: row.id,
    slug: row.event_slug,
    title: 'PlayMechi Online Gaming Tournament',
    game: row.game as GameKey,
    status: 'scheduled',
    participation_status:
      row.check_in_status === 'checked_in'
        ? 'checked_in'
        : row.check_in_status === 'no_show'
          ? 'no_show'
          : 'registered',
    joined_at: row.created_at,
    checked_in_at: null,
    scheduled_for: null,
  }));
}

async function persistSummary(userId: string, summary: PassportSummary): Promise<void> {
  const supabase = createServiceClient();
  const result = await supabase.from('passport_profile_summaries').upsert(
    {
      user_id: userId,
      games_count: summary.games_count,
      playing_games_count: summary.playing_games_count,
      completed_games_count: summary.completed_games_count,
      favorite_games_count: summary.favorite_games_count,
      total_library_hours: summary.total_library_hours,
      total_matches: summary.total_matches,
      total_wins: summary.total_wins,
      total_losses: summary.total_losses,
      best_rating: summary.best_rating,
      tournaments_registered: summary.tournaments_registered,
      events_attended: summary.events_attended,
      completed_events: summary.completed_events,
      achievements_count: summary.achievements_count,
      badges_count: summary.badges_count,
      teams_count: summary.teams_count,
      verified_records_count: summary.verified_records_count,
      last_activity_at: summary.last_activity_at,
      computed_at: summary.computed_at,
    },
    { onConflict: 'user_id' }
  );

  if (result.error && !isMissingTableError(result.error, 'passport_profile_summaries')) {
    console.error('[Passport] Could not persist summary projection:', result.error);
  }
}

async function loadSocialCounts(userId: string) {
  const { data, error } = await createServiceClient()
    .from('passport_profile_summaries')
    .select('friends_count, followers_count, following_count')
    .eq('user_id', userId)
    .maybeSingle();
  if (error && !isMissingTableError(error, 'passport_profile_summaries')) {
    console.error('[Passport] Could not load social counts:', error);
  }
  return {
    friends: Number(data?.friends_count ?? 0),
    followers: Number(data?.followers_count ?? 0),
    following: Number(data?.following_count ?? 0),
  };
}

type PassportDataOptions = {
  ownerView?: boolean;
  friendView?: boolean;
};

export function getPassportData(username: string): Promise<PublicPassportData | null>;
export function getPassportData(
  username: string,
  options: { ownerView: true; friendView?: boolean }
): Promise<PassportOwnerData | null>;
export function getPassportData(
  username: string,
  options: { ownerView?: false; friendView?: boolean }
): Promise<PublicPassportData | null>;
export function getPassportData(
  username: string,
  options: PassportDataOptions
): Promise<PublicPassportData | PassportOwnerData | null>;
export async function getPassportData(
  username: string,
  options: PassportDataOptions = {}
): Promise<PublicPassportData | PassportOwnerData | null> {
  let profile: Awaited<ReturnType<typeof getPublicProfileData>>;
  if (options.ownerView) {
    const normalizedUsername = normalizePassportUsername(username);
    if (!normalizedUsername) return null;
    profile = await getPublicProfileData(normalizedUsername);
  } else {
    const validation = validatePassportHandle(username);
    if (!validation.valid) return null;
    const resolution = await createServiceClient()
      .from('passport_profiles')
      .select('user_id')
      .eq('public_handle', validation.handle)
      .eq('publication_status', 'published')
      .maybeSingle();
    if (resolution.error || !resolution.data?.user_id) return null;
    if (await isMinorAccount(resolution.data.user_id as string)) return null;
    profile = await getPublicProfileDataByUserId(resolution.data.user_id as string);
  }
  if (!profile) return null;

  const [passportResult, tournamentRows, onlineRows, eventCounts, achievementsCount, badgesCount, teams, verifications, library] =
    await Promise.all([
      loadPassportProfile(profile.id),
      loadTournamentHistory(profile.id),
      loadOnlineTournamentHistory(profile.id),
      loadEventCounts(profile.id),
      countRows('achievements', profile.id),
      countRows('profile_badges', profile.id),
      loadTeams(profile.id),
      loadVerifications(profile.id),
      getPassportGameLibraryByUserId(
        profile.id,
        options.ownerView ? 'owner' : options.friendView ? 'friend' : 'public'
      ),
    ]);

  const identity = defaultPassportIdentity(
    profile,
    passportResult.row,
    passportResult.storageReady
  );
  const genericEvents = mapGenericEvents(tournamentRows);
  const onlineEvents = mapOnlineEvents(onlineRows);
  const events = [...genericEvents, ...onlineEvents]
    .sort((left, right) => right.joined_at.localeCompare(left.joined_at))
    .slice(0, 12);
  const totalMatches = profile.totalWins + profile.totalLosses;
  const socialCounts = await loadSocialCounts(profile.id);
  const summary: PassportSummary = {
    games_count: Math.max(profile.games.length, library.stats.total),
    playing_games_count: library.stats.playing,
    completed_games_count: library.stats.completed,
    favorite_games_count: library.stats.favorites,
    total_library_hours: library.stats.total_hours,
    friends_count: socialCounts.friends,
    followers_count: socialCounts.followers,
    following_count: socialCounts.following,
    total_matches: totalMatches,
    total_wins: profile.totalWins,
    total_losses: profile.totalLosses,
    win_rate: totalMatches > 0 ? Math.round((profile.totalWins / totalMatches) * 100) : 0,
    best_rating: profile.bestRating,
    tournaments_registered: eventCounts.registered,
    events_attended: eventCounts.attended,
    completed_events: eventCounts.completed,
    achievements_count: achievementsCount,
    badges_count: badgesCount,
    teams_count: teams.length,
    verified_records_count: totalMatches + eventCounts.attended + verifications.length,
    last_activity_at: profile.last_match_date ?? events[0]?.joined_at ?? null,
    computed_at: new Date().toISOString(),
  };

  if (passportResult.storageReady && options.ownerView) {
    await persistSummary(profile.id, summary);
  }

  if (options.ownerView) {
    return {
      access: 'public',
      identity,
      age_policy: await getProfileAgePolicy(profile.id),
      summary,
      events,
      teams,
      verifications,
      library,
    };
  }

  if (
    identity.default_visibility === 'private'
    || (identity.default_visibility === 'friends' && !options.friendView)
  ) {
    return {
      access: 'restricted',
      identity: restrictedIdentity(identity, Boolean(options.friendView)),
      summary: null,
      events: [],
      teams: [],
      verifications: [],
      library: {
        access: 'restricted',
        storage_ready: library.storage_ready,
        entries: [],
        stats: {
          total: 0,
          playing: 0,
          completed: 0,
          backlog: 0,
          favorites: 0,
          featured: 0,
          total_hours: 0,
          platforms: [],
          genres: [],
          years: [],
        },
      },
    };
  }

  const friendView = Boolean(options.friendView);
  const publicVerifications = filterPublicPassportVerifications(
    verifications,
    identity,
    friendView
  );

  return {
    access: 'public',
    identity: restrictedIdentity(identity, friendView),
    summary: buildPublicPassportSummary(
      summary,
      identity,
      friendView,
      publicVerifications.length
    ),
    events: isPassportFieldVisible(identity, 'events', friendView) ? events : [],
    teams: isPassportFieldVisible(identity, 'teams', friendView) ? teams : [],
    verifications: publicVerifications,
    library: isPassportFieldVisible(identity, 'games', friendView)
      ? library
      : {
          access: 'restricted',
          storage_ready: library.storage_ready,
          entries: [],
          stats: {
            total: 0,
            playing: 0,
            completed: 0,
            backlog: 0,
            favorites: 0,
            featured: 0,
            total_hours: 0,
            platforms: [],
            genres: [],
            years: [],
          },
        },
  };
}

export async function getPassportOwnerDataByUserId(
  userId: string
): Promise<PassportOwnerData | null> {
  const supabase = createServiceClient();
  const profileResult = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle();

  if (profileResult.error || !profileResult.data?.username) {
    return null;
  }

  const data = await getPassportData(profileResult.data.username as string, { ownerView: true });
  return data as PassportOwnerData | null;
}

export async function upsertPassportProfile(
  userId: string,
  input: PassportUpdateInput,
  requestId?: string | null
): Promise<{ data: PassportOwnerData | null; error: string | null; storageReady: boolean }> {
  const supabase = createServiceClient();
  const updateData: Record<string, unknown> = { user_id: userId };
  const current = await loadPassportProfile(userId);
  const agePolicy = await getProfileAgePolicy(userId);

  if (!current.storageReady) {
    return { data: null, error: 'Passport storage is not ready', storageReady: false };
  }

  if (agePolicy.status === 'minor') {
    const widensDefault = input.default_visibility !== undefined
      && input.default_visibility !== 'private';
    const widensFields = input.field_visibility
      && Object.values(input.field_visibility).some((value) => value !== 'private');
    if (widensDefault || widensFields || input.is_discoverable === true) {
      return {
        data: null,
        error: MINOR_PASSPORT_PRIVACY_ERROR,
        storageReady: true,
      };
    }
  }

  if ('public_handle' in input) {
    if (input.public_handle === null) {
      if (current.row?.publication_status === 'published') {
        return {
          data: null,
          error: 'Unpublish the Gamer Passport before removing its public handle',
          storageReady: true,
        };
      }
      updateData.public_handle = null;
    } else {
      const validation = validatePassportHandle(input.public_handle ?? '');
      if (!validation.valid) {
        return { data: null, error: validation.error, storageReady: true };
      }
      updateData.public_handle = validation.handle;
    }
  }

  if ('display_name' in input) updateData.display_name = input.display_name;
  if ('bio' in input) updateData.bio = input.bio;
  if ('gamer_since' in input) updateData.gamer_since = input.gamer_since;
  if ('archetypes' in input) updateData.archetypes = input.archetypes;
  if ('current_status' in input) updateData.current_status = input.current_status;
  if ('default_visibility' in input) updateData.default_visibility = input.default_visibility;
  if ('is_discoverable' in input) updateData.is_discoverable = input.is_discoverable;
  if ('card_accent' in input) updateData.card_accent = input.card_accent;

  const resultingVisibility = (updateData.default_visibility as string | undefined)
    ?? current.row?.default_visibility
    ?? 'private';
  const resultingDiscoverability = (updateData.is_discoverable as boolean | undefined)
    ?? current.row?.is_discoverable
    ?? false;
  if (current.row?.publication_status === 'published' && resultingVisibility === 'private') {
    return {
      data: null,
      error: 'Unpublish the Gamer Passport before making it private',
      storageReady: true,
    };
  }
  if (resultingDiscoverability && resultingVisibility !== 'public') {
    return {
      data: null,
      error: 'Discovery requires Public visibility',
      storageReady: true,
    };
  }
  if (resultingDiscoverability && current.row?.publication_status !== 'published') {
    return {
      data: null,
      error: 'Publish the Gamer Passport before enabling discovery',
      storageReady: true,
    };
  }

  if ('field_visibility' in input) {
    updateData.field_visibility = {
      ...normalizePassportFieldVisibility(current.row?.field_visibility),
      ...input.field_visibility,
    };
  }

  const changedFields = Object.keys(updateData).filter((key) => key !== 'user_id');
  const result = await supabase
    .from('passport_profiles')
    .upsert(updateData, { onConflict: 'user_id' })
    .select('user_id')
    .single();

  if (result.error) {
    if (isMissingTableError(result.error, 'passport_profiles')) {
      return { data: null, error: 'Passport storage is not ready', storageReady: false };
    }
    if (result.error.code === '23505' && 'public_handle' in input) {
      return { data: null, error: 'That public handle is already taken', storageReady: true };
    }
    console.error('[Passport] Could not update identity:', result.error);
    return { data: null, error: 'Could not update Gamer Passport', storageReady: true };
  }

  const previousHandle = current.row?.public_handle;
  const nextHandle = typeof updateData.public_handle === 'string' ? updateData.public_handle : null;
  if ('public_handle' in input && previousHandle && previousHandle !== nextHandle) {
    const historyResult = await supabase.from('passport_handle_history').insert({
      user_id: userId,
      public_handle: normalizePassportHandle(previousHandle),
      redirect_allowed: false,
    });
    if (historyResult.error && !isMissingTableError(historyResult.error, 'passport_handle_history')) {
      console.error('[Passport] Could not preserve retired handle:', historyResult.error);
    }
  }

  if (changedFields.length > 0) {
    const auditResult = await supabase.from('passport_audit_logs').insert({
      user_id: userId,
      actor_id: userId,
      action: 'passport_profile_updated',
      changed_fields: changedFields,
      details: {},
      request_id: requestId ?? null,
    });
    if (auditResult.error && !isMissingTableError(auditResult.error, 'passport_audit_logs')) {
      console.error('[Passport] Could not write audit log:', auditResult.error);
    }
  }

  return {
    data: await getPassportOwnerDataByUserId(userId),
    error: null,
    storageReady: true,
  };
}

export async function setPassportPublication(
  userId: string,
  action: 'publish' | 'unpublish',
  options: { confirmed?: boolean; requestId?: string | null } = {}
): Promise<{ data: PassportOwnerData | null; error: string | null; storageReady: boolean }> {
  const supabase = createServiceClient();
  const current = await loadPassportProfile(userId);
  if (!current.storageReady || !current.row) {
    return { data: null, error: 'Passport storage is not ready', storageReady: false };
  }

  const now = new Date().toISOString();
  let update: Record<string, unknown>;
  if (action === 'publish') {
    if (await isMinorAccount(userId)) {
      return {
        data: null,
        error: MINOR_PASSPORT_PRIVACY_ERROR,
        storageReady: true,
      };
    }
    if (!options.confirmed) {
      return { data: null, error: 'Confirm that you want to publish this Gamer Passport', storageReady: true };
    }
    const handle = validatePassportHandle(current.row.public_handle ?? '');
    if (!handle.valid) {
      return { data: null, error: handle.error, storageReady: true };
    }
    if (!isSafePassportDisplayName(current.row.display_name ?? '')) {
      return {
        data: null,
        error: 'Choose a public display name that is not an email address, phone number, or URL',
        storageReady: true,
      };
    }
    if (!['public', 'friends'].includes(current.row.default_visibility)) {
      return {
        data: null,
        error: 'Choose Public or Friends visibility before publishing',
        storageReady: true,
      };
    }
    update = {
      publication_status: 'published',
      published_at: now,
      publication_consent_version: PASSPORT_PUBLICATION_CONSENT_VERSION,
      publication_consent_at: now,
      is_discoverable:
        current.row.default_visibility === 'public' && current.row.is_discoverable,
    };
  } else {
    update = {
      publication_status: 'draft',
      published_at: null,
      default_visibility: 'private',
      is_discoverable: false,
    };
  }

  const result = await supabase
    .from('passport_profiles')
    .update(update)
    .eq('user_id', userId);
  if (result.error) {
    if (isMissingTableError(result.error, 'passport_profiles')) {
      return { data: null, error: 'Passport storage is not ready', storageReady: false };
    }
    console.error('[Passport] Could not change publication state:', result.error);
    return { data: null, error: 'Could not change Gamer Passport publication', storageReady: true };
  }

  const auditResult = await supabase.from('passport_audit_logs').insert({
    user_id: userId,
    actor_id: userId,
    action: action === 'publish' ? 'passport_published' : 'passport_unpublished',
    changed_fields: Object.keys(update),
    details: action === 'publish'
      ? { consent_version: PASSPORT_PUBLICATION_CONSENT_VERSION }
      : { reason: 'owner_request' },
    request_id: options.requestId ?? null,
  });
  if (auditResult.error && !isMissingTableError(auditResult.error, 'passport_audit_logs')) {
    console.error('[Passport] Could not write publication audit log:', auditResult.error);
  }

  return {
    data: await getPassportOwnerDataByUserId(userId),
    error: null,
    storageReady: true,
  };
}
