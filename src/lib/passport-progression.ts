import 'server-only';

import { ACHIEVEMENTS } from '@/lib/gamification';
import {
  isMinorAccount,
  MINOR_PASSPORT_PRIVACY_ERROR,
} from '@/lib/passport-age-policy';
import { arePassportFriends } from '@/lib/passport-social';
import type { GamerDimension, GamerDimensionKey, PassportAchievement, PassportCosmetic, PassportCustomization, PassportProgression, PassportReplay, PassportReplayPayload, PassportShowcaseItem } from '@/lib/passport-progression-types';
import { resolvePlan, type Plan } from '@/lib/plans';
import { createServiceClient } from '@/lib/supabase';

const FORMULA_VERSION = 'v1';
const DIMENSION_LABELS: Record<GamerDimensionKey, string> = { competitive: 'Competitor', explorer: 'Explorer', completionist: 'Completionist', community: 'Community', event_presence: 'Event Presence', team_player: 'Team Player' };
const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, elite: 2 };
const SHOWCASE_LIMIT: Record<Plan, number> = { free: 3, pro: 6, elite: 9 };
const PRESENCE_STAMPS = ['checked_in', 'attended', 'competed', 'placement', 'staff', 'organizer', 'streamer'];

function relation<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function dimensionLevel(score: number): GamerDimension['level'] { return score >= 75 ? 'standout' : score >= 45 ? 'established' : score >= 15 ? 'growing' : 'starting'; }
function makeDimension(key: GamerDimensionKey, score: number, explanation: string, inputs: GamerDimension['inputs']): GamerDimension { const safeScore = clamp(score); return { key, label: DIMENSION_LABELS[key], score: safeScore, level: dimensionLevel(safeScore), explanation, inputs }; }
function publicPlan(value: string | null | undefined, expiresAt?: string | null): Plan { return resolvePlan(value, expiresAt); }

type ProjectionSources = {
  userId: string;
  profile: { plan?: string | null; plan_expires_at?: string | null } | null;
  games: Array<Record<string, unknown>>;
  matches: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  friendships: Array<Record<string, unknown>>;
  teams: Array<Record<string, unknown>>;
  reactions: number;
  replayYears: number[];
};

async function loadProjectionSources(userId: string): Promise<ProjectionSources> {
  const supabase = createServiceClient();
  const [profileResult, gamesResult, matchesResult, eventsResult, friendshipsResult, teamsResult, activityResult, replayResult] = await Promise.all([
    supabase.from('profiles').select('plan, plan_expires_at').eq('id', userId).maybeSingle(),
    supabase.from('passport_game_entries').select('id, play_status, hours_played, created_at, completed_on, game:passport_game_catalog(title, slug, genres)').eq('user_id', userId),
    supabase.from('matches').select('id, game, winner_id, player1_id, player2_id, completed_at').eq('status', 'completed').or(`player1_id.eq.${userId},player2_id.eq.${userId}`),
    supabase.from('passport_event_credentials').select('id, event_key, event_title, stamp_type, game, occurred_at').eq('user_id', userId).eq('credential_state', 'active').in('stamp_type', PRESENCE_STAMPS),
    supabase.from('passport_friendships').select('id, user_a_id, user_b_id, updated_at').eq('status', 'accepted').or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`),
    supabase.from('team_members').select('id, team_id, joined_at').eq('user_id', userId).eq('status', 'active'),
    supabase.from('passport_activity_objects').select('id').eq('actor_id', userId).is('retracted_at', null),
    supabase.from('passport_replay_snapshots').select('replay_year').eq('user_id', userId),
  ]);
  const activityIds = (activityResult.data ?? []).map((row) => String(row.id));
  const reactionResult = activityIds.length ? await supabase.from('passport_activity_reactions').select('activity_id', { count: 'exact', head: true }).in('activity_id', activityIds) : { count: 0 };
  return { userId, profile: profileResult.data, games: gamesResult.data ?? [], matches: matchesResult.data ?? [], events: eventsResult.data ?? [], friendships: friendshipsResult.data ?? [], teams: teamsResult.data ?? [], reactions: reactionResult.count ?? 0, replayYears: (replayResult.data ?? []).map((row) => Number(row.replay_year)) };
}

function calculateDimensions(sources: ProjectionSources) {
  const ownedWins = sources.matches.filter((match) => String(match.winner_id) === sources.userId).length;
  const distinctGenres = new Set<string>();
  for (const row of sources.games) { const game = relation(row.game as { genres?: string[] } | Array<{ genres?: string[] }> | null); for (const genre of game?.genres ?? []) distinctGenres.add(genre); }
  const completed = sources.games.filter((row) => row.play_status === 'completed').length;
  const replaying = sources.games.filter((row) => row.play_status === 'replaying').length;
  const distinctEvents = new Set(sources.events.map((row) => String(row.event_key))).size;
  const dimensions = [
    makeDimension('competitive', sources.matches.length * 4 + ownedWins * 2, `${sources.matches.length} verified matches and ${ownedWins} recorded wins contribute. Competitive facts come only from completed Mechi matches.`, [{ label: 'Verified matches', value: sources.matches.length }, { label: 'Recorded wins', value: ownedWins }]),
    makeDimension('explorer', sources.games.length * 7 + distinctGenres.size * 6, `${sources.games.length} library titles across ${distinctGenres.size} visible genres contribute. This is personal library activity, not competitive verification.`, [{ label: 'Library titles', value: sources.games.length }, { label: 'Distinct genres', value: distinctGenres.size }]),
    makeDimension('completionist', completed * 14 + replaying * 5, `${completed} completed titles and ${replaying} replayed titles contribute. These are owner-recorded library facts unless separately verified.`, [{ label: 'Completed games', value: completed }, { label: 'Replaying games', value: replaying }]),
    makeDimension('community', sources.friendships.length * 9 + Math.min(25, sources.reactions * 2), `${sources.friendships.length} accepted friendships and ${sources.reactions} reactions received contribute. Following alone does not increase this Dimension.`, [{ label: 'Accepted friends', value: sources.friendships.length }, { label: 'Reactions received', value: sources.reactions }]),
    makeDimension('event_presence', distinctEvents * 22, `${distinctEvents} distinct events with active presence credentials contribute. Registration alone never counts as presence.`, [{ label: 'Verified events', value: distinctEvents }, { label: 'Presence credentials', value: sources.events.length }]),
    makeDimension('team_player', sources.teams.length * 35, `${sources.teams.length} active Mechi team memberships contribute. Former teams remain history but do not raise the current score.`, [{ label: 'Active teams', value: sources.teams.length }]),
  ];
  const totalPoints = dimensions.reduce((total, dimension) => total + dimension.score, 0);
  const passportLevel = Math.min(100, 1 + Math.floor((totalPoints * 99) / 600));
  return { dimensions, totalPoints, passportLevel, completed, distinctEvents };
}

async function projectPassportAchievements(userId: string, sources: ProjectionSources, completed: number, distinctEvents: number) {
  const supabase = createServiceClient();
  const managed = [
    { key: 'passport_library_started', qualified: sources.games.length >= 1, sourceType: 'game_entry', sourceKey: 'library:first' },
    { key: 'passport_library_five', qualified: sources.games.length >= 5, sourceType: 'game_entry', sourceKey: 'library:five' },
    { key: 'passport_first_completion', qualified: completed >= 1, sourceType: 'game_entry', sourceKey: 'completion:first' },
    { key: 'passport_completion_five', qualified: completed >= 5, sourceType: 'game_entry', sourceKey: 'completion:five' },
    { key: 'passport_first_verified_match', qualified: sources.matches.length >= 1, sourceType: 'match', sourceKey: 'matches:first' },
    { key: 'passport_ten_verified_matches', qualified: sources.matches.length >= 10, sourceType: 'match', sourceKey: 'matches:ten' },
    { key: 'passport_first_event', qualified: distinctEvents >= 1, sourceType: 'event_credential', sourceKey: 'events:first-presence' },
    { key: 'passport_event_regular', qualified: distinctEvents >= 3, sourceType: 'event_credential', sourceKey: 'events:three-presence' },
    { key: 'passport_team_player', qualified: sources.teams.length >= 1, sourceType: 'team_membership', sourceKey: 'teams:active' },
    { key: 'passport_connector', qualified: sources.friendships.length >= 5, sourceType: 'friendship', sourceKey: 'friends:five' },
    { key: 'passport_2026_replay', qualified: sources.replayYears.includes(2026), sourceType: 'replay', sourceKey: 'replay:2026' },
  ];
  const now = new Date().toISOString();
  for (const item of managed) {
    if (item.qualified) await supabase.from('passport_achievement_awards').upsert({ user_id: userId, achievement_key: item.key, source_type: item.sourceType, source_key: item.sourceKey, revoked_at: null, revocation_reason: null, last_evaluated_at: now }, { onConflict: 'user_id,achievement_key' });
    else await supabase.from('passport_achievement_awards').update({ revoked_at: now, revocation_reason: 'Source requirement is no longer satisfied', last_evaluated_at: now }).eq('user_id', userId).eq('achievement_key', item.key).is('revoked_at', null);
  }
}

async function loadAchievements(userId: string): Promise<PassportAchievement[]> {
  const supabase = createServiceClient();
  const [awardsResult, legacyResult] = await Promise.all([
    supabase.from('passport_achievement_awards').select('achievement_key, source_type, issued_at, revoked_at, definition:passport_achievement_definitions(family, title, description, requirement_text, rarity, trust_tier, issuer_label)').eq('user_id', userId).order('issued_at', { ascending: false }),
    supabase.from('achievements').select('achievement_key, unlocked_at').eq('user_id', userId).order('unlocked_at', { ascending: false }),
  ]);
  const projected = (awardsResult.data ?? []).flatMap((row) => { const definition = relation(row.definition as Record<string, unknown> | Array<Record<string, unknown>> | null); if (!definition) return []; return [{ key: String(row.achievement_key), family: String(definition.family), title: String(definition.title), description: String(definition.description), requirement: String(definition.requirement_text), rarity: definition.rarity as PassportAchievement['rarity'], trust_tier: definition.trust_tier as PassportAchievement['trust_tier'], issuer: String(definition.issuer_label), issued_at: String(row.issued_at), source_type: String(row.source_type), is_active: !row.revoked_at }]; });
  const legacyMap = new Map(ACHIEVEMENTS.map((definition) => [definition.key, definition]));
  const legacy = (legacyResult.data ?? []).flatMap((row) => { const definition = legacyMap.get(String(row.achievement_key)); return definition ? [{ key: definition.key, family: 'competitive', title: definition.title, description: definition.description, requirement: definition.description, rarity: 'uncommon' as const, trust_tier: 'mechi_verified' as const, issuer: 'PlayMechi match system', issued_at: String(row.unlocked_at), source_type: 'match', is_active: true }] : []; });
  return [...projected, ...legacy].sort((left, right) => right.issued_at.localeCompare(left.issued_at));
}

async function loadCustomization(userId: string, plan: Plan) {
  const supabase = createServiceClient();
  const [customResult, catalogResult, showcaseResult] = await Promise.all([
    supabase.from('passport_customizations').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('passport_cosmetic_catalog').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('passport_showcase_items').select('id, slot, source_type, source_id, label, visibility').eq('user_id', userId).order('slot'),
  ]);
  const customization: PassportCustomization = { theme_key: customResult.data?.theme_key ?? 'mechi_core', avatar_frame_key: customResult.data?.avatar_frame_key ?? 'frame_none', card_style_key: customResult.data?.card_style_key ?? 'card_core', show_dimensions: customResult.data?.show_dimensions ?? true, show_level: customResult.data?.show_level ?? true, plan, showcase_limit: SHOWCASE_LIMIT[plan] };
  const cosmetics: PassportCosmetic[] = (catalogResult.data ?? []).map((row) => ({ key: String(row.cosmetic_key), type: row.cosmetic_type, label: String(row.label), description: String(row.description), required_plan: row.required_plan, style_tokens: row.style_tokens ?? {}, is_animated: Boolean(row.is_animated), performance_tier: row.performance_tier, unlocked: PLAN_RANK[plan] >= PLAN_RANK[row.required_plan as Plan] }));
  const showcase: PassportShowcaseItem[] = (showcaseResult.data ?? []).map((row) => ({ id: String(row.id), slot: Number(row.slot), source_type: String(row.source_type), source_id: String(row.source_id), label: String(row.label), visibility: row.visibility }));
  return { customization, cosmetics, showcase, storageReady: !customResult.error && !catalogResult.error && !showcaseResult.error };
}

export async function getPassportProgression(userId: string): Promise<PassportProgression> {
  const sources = await loadProjectionSources(userId);
  const calculated = calculateDimensions(sources);
  await projectPassportAchievements(userId, sources, calculated.completed, calculated.distinctEvents);
  const plan = publicPlan(sources.profile?.plan, sources.profile?.plan_expires_at);
  const [achievements, presentation] = await Promise.all([loadAchievements(userId), loadCustomization(userId, plan)]);
  const projectedAt = new Date().toISOString();
  const snapshot = await createServiceClient().from('passport_dimension_snapshots').upsert({ user_id: userId, formula_version: FORMULA_VERSION, passport_level: calculated.passportLevel, total_points: calculated.totalPoints, dimensions: Object.fromEntries(calculated.dimensions.map((dimension) => [dimension.key, dimension])), source_counts: { games: sources.games.length, matches: sources.matches.length, events: sources.events.length, friends: sources.friendships.length, teams: sources.teams.length, reactions: sources.reactions }, projected_at: projectedAt }, { onConflict: 'user_id' });
  return { passport_level: calculated.passportLevel, total_points: calculated.totalPoints, formula_version: FORMULA_VERSION, level_explanation: 'Passport Level maps the sum of six independent 0–100 Gamer Dimensions onto levels 1–100. It is progress, not a universal skill ranking.', dimensions: calculated.dimensions, achievements, customization: presentation.customization, cosmetics: presentation.cosmetics, showcase: presentation.showcase, projected_at: projectedAt, storage_ready: presentation.storageReady && !snapshot.error };
}

export async function getVisiblePassportProgression(userId: string, viewerId?: string | null, includeAchievements = true) {
  const progression = await getPassportProgression(userId);
  const friend = Boolean(viewerId && viewerId !== userId && await arePassportFriends(viewerId, userId));
  const selected = new Set([progression.customization.theme_key, progression.customization.avatar_frame_key, progression.customization.card_style_key]);
  let showcase = progression.showcase.filter((item) => item.visibility === 'public' || viewerId === userId || (friend && item.visibility === 'friends'));
  if (viewerId !== userId && showcase.length) {
    const supabase = createServiceClient();
    const highlightIds = showcase.filter((item) => item.source_type === 'highlight').map((item) => item.source_id);
    const gameIds = showcase.filter((item) => item.source_type === 'game_entry').map((item) => item.source_id);
    const [highlightResult, gameResult] = await Promise.all([
      highlightIds.length ? supabase.from('passport_highlights').select('id, visibility').eq('user_id', userId).eq('is_active', true).in('id', highlightIds) : Promise.resolve({ data: [] }),
      gameIds.length ? supabase.from('passport_game_entries').select('id, visibility').eq('user_id', userId).in('id', gameIds) : Promise.resolve({ data: [] }),
    ]);
    const allowedHighlights = new Set((highlightResult.data ?? []).filter((row) => row.visibility === 'public' || (friend && row.visibility === 'friends')).map((row) => String(row.id)));
    const allowedGames = new Set((gameResult.data ?? []).filter((row) => row.visibility === 'public' || (friend && row.visibility === 'friends')).map((row) => String(row.id)));
    showcase = showcase.filter((item) => item.source_type === 'highlight' ? allowedHighlights.has(item.source_id) : item.source_type === 'game_entry' ? allowedGames.has(item.source_id) : true);
  }
  return { ...progression, achievements: includeAchievements ? progression.achievements.filter((award) => award.is_active) : [], cosmetics: progression.cosmetics.filter((cosmetic) => selected.has(cosmetic.key)), showcase };
}

export async function updatePassportCustomization(userId: string, input: { themeKey: string; avatarFrameKey: string; cardStyleKey: string; showDimensions: boolean; showLevel: boolean }) {
  const supabase = createServiceClient();
  const [{ data: profile }, { data: cosmetics }] = await Promise.all([supabase.from('profiles').select('plan, plan_expires_at').eq('id', userId).maybeSingle(), supabase.from('passport_cosmetic_catalog').select('cosmetic_key, cosmetic_type, required_plan').in('cosmetic_key', [input.themeKey, input.avatarFrameKey, input.cardStyleKey]).eq('is_active', true)]);
  const plan = publicPlan(profile?.plan, profile?.plan_expires_at); const map = new Map((cosmetics ?? []).map((row) => [String(row.cosmetic_key), row]));
  const choices = [{ key: input.themeKey, type: 'theme' }, { key: input.avatarFrameKey, type: 'avatar_frame' }, { key: input.cardStyleKey, type: 'card_style' }];
  for (const choice of choices) { const cosmetic = map.get(choice.key); if (!cosmetic || cosmetic.cosmetic_type !== choice.type) return { ok: false, error: 'Invalid cosmetic selection' }; if (PLAN_RANK[plan] < PLAN_RANK[cosmetic.required_plan as Plan]) return { ok: false, error: `${cosmetic.required_plan} plan required for this cosmetic` }; }
  const { error } = await supabase.from('passport_customizations').upsert({ user_id: userId, theme_key: input.themeKey, avatar_frame_key: input.avatarFrameKey, card_style_key: input.cardStyleKey, show_dimensions: input.showDimensions, show_level: input.showLevel }, { onConflict: 'user_id' });
  return { ok: !error, error: error ? 'Could not save Passport customization' : null };
}

export async function getPassportShowcaseSources(userId: string) {
  const supabase = createServiceClient();
  const [{ data: highlights }, { data: awards }, { data: events }, { data: memberships }, { data: games }] = await Promise.all([
    supabase.from('passport_highlights').select('id, title').eq('user_id', userId).eq('is_active', true),
    supabase.from('passport_achievement_awards').select('id, definition:passport_achievement_definitions(title)').eq('user_id', userId).is('revoked_at', null),
    supabase.from('passport_event_credentials').select('id, event_title, stamp_type').eq('user_id', userId).eq('credential_state', 'active'),
    supabase.from('team_members').select('team_id').eq('user_id', userId).eq('status', 'active'),
    supabase.from('passport_game_entries').select('id, game:passport_game_catalog(title)').eq('user_id', userId),
  ]);
  const teamIds = (memberships ?? []).map((row) => String(row.team_id));
  const { data: teamAwards } = teamIds.length ? await supabase.from('team_passport_achievements').select('id, title').in('team_id', teamIds).eq('state', 'active') : { data: [] };
  return [
    ...(highlights ?? []).map((row) => ({ source_type: 'highlight', source_id: String(row.id), label: String(row.title) })),
    ...(awards ?? []).flatMap((row) => { const definition = relation(row.definition as { title: string } | Array<{ title: string }> | null); return definition ? [{ source_type: 'achievement_award', source_id: String(row.id), label: definition.title }] : []; }),
    ...(events ?? []).map((row) => ({ source_type: 'event_credential', source_id: String(row.id), label: `${row.event_title} · ${String(row.stamp_type).replaceAll('_', ' ')}` })),
    ...(teamAwards ?? []).map((row) => ({ source_type: 'team_achievement', source_id: String(row.id), label: String(row.title) })),
    ...(games ?? []).flatMap((row) => { const game = relation(row.game as { title: string } | Array<{ title: string }> | null); return game ? [{ source_type: 'game_entry', source_id: String(row.id), label: game.title }] : []; }),
  ];
}

async function showcaseSourceExists(userId: string, sourceType: string, sourceId: string) {
  const supabase = createServiceClient();
  if (sourceType === 'highlight') return Boolean((await supabase.from('passport_highlights').select('id').eq('id', sourceId).eq('user_id', userId).eq('is_active', true).maybeSingle()).data);
  if (sourceType === 'achievement_award') return Boolean((await supabase.from('passport_achievement_awards').select('id').eq('id', sourceId).eq('user_id', userId).is('revoked_at', null).maybeSingle()).data);
  if (sourceType === 'event_credential') return Boolean((await supabase.from('passport_event_credentials').select('id').eq('id', sourceId).eq('user_id', userId).eq('credential_state', 'active').maybeSingle()).data);
  if (sourceType === 'game_entry') return Boolean((await supabase.from('passport_game_entries').select('id').eq('id', sourceId).eq('user_id', userId).maybeSingle()).data);
  if (sourceType === 'team_achievement') { const { data } = await supabase.from('team_passport_achievements').select('team_id').eq('id', sourceId).eq('state', 'active').maybeSingle(); if (!data) return false; return Boolean((await supabase.from('team_members').select('id').eq('team_id', data.team_id).eq('user_id', userId).eq('status', 'active').maybeSingle()).data); }
  return false;
}

export async function savePassportShowcaseItem(userId: string, input: { slot: number; sourceType: string; sourceId: string; label: string; visibility: string }) {
  const supabase = createServiceClient(); const { data: profile } = await supabase.from('profiles').select('plan, plan_expires_at').eq('id', userId).maybeSingle(); const plan = publicPlan(profile?.plan, profile?.plan_expires_at);
  if (!Number.isInteger(input.slot) || input.slot < 1 || input.slot > SHOWCASE_LIMIT[plan]) return { ok: false, error: `${plan} supports ${SHOWCASE_LIMIT[plan]} showcase slots` };
  if (!await showcaseSourceExists(userId, input.sourceType, input.sourceId)) return { ok: false, error: 'Verified showcase source not found' };
  const visibility = input.visibility === 'private' || input.visibility === 'friends' ? input.visibility : 'public';
  const { error } = await supabase.from('passport_showcase_items').upsert({ user_id: userId, slot: input.slot, source_type: input.sourceType, source_id: input.sourceId, label: input.label.trim().slice(0, 100), visibility }, { onConflict: 'user_id,slot' });
  return { ok: !error, error: error ? 'Could not save showcase item' : null };
}

export async function removePassportShowcaseItem(userId: string, id: string) { const { data } = await createServiceClient().from('passport_showcase_items').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle(); return Boolean(data); }

export async function getPassportShelves(userId: string, viewerId?: string | null) {
  const friend = Boolean(viewerId && viewerId !== userId && await arePassportFriends(viewerId, userId));
  let query = createServiceClient().from('passport_custom_shelves').select('id, title, description, visibility, display_order, items:passport_custom_shelf_items(display_order, game:passport_game_entries(id, visibility, game:passport_game_catalog(title, slug, cover_url)))').eq('user_id', userId).order('display_order');
  if (viewerId !== userId) query = friend ? query.in('visibility', ['public', 'friends']) : query.eq('visibility', 'public');
  const { data } = await query;
  return (data ?? []).map((shelf) => ({ ...shelf, items: (shelf.items ?? []).filter((item) => {
    if (viewerId === userId) return true;
    const entry = relation(item.game as { visibility?: string } | Array<{ visibility?: string }> | null);
    return entry?.visibility === 'public' || (friend && entry?.visibility === 'friends');
  }) }));
}

export async function savePassportShelf(userId: string, input: { id?: string | null; title: string; description: string; visibility: string; displayOrder: number; gameEntryIds: string[] }) {
  const supabase = createServiceClient(); const { data: profile } = await supabase.from('profiles').select('plan, plan_expires_at').eq('id', userId).maybeSingle(); const plan = publicPlan(profile?.plan, profile?.plan_expires_at); if (plan === 'free') return { shelfId: null, error: 'Pro or Elite is required for custom shelves' };
  const ids = [...new Set(input.gameEntryIds)].slice(0, plan === 'elite' ? 24 : 12); const { count } = ids.length ? await supabase.from('passport_game_entries').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('id', ids) : { count: 0 }; if ((count ?? 0) !== ids.length) return { shelfId: null, error: 'One or more games are unavailable' };
  const visibility = input.visibility === 'public' || input.visibility === 'friends' ? input.visibility : 'private';
  const values = { user_id: userId, title: input.title.trim().slice(0, 60), description: input.description.trim().slice(0, 180), visibility, display_order: input.displayOrder };
  const result = input.id ? await supabase.from('passport_custom_shelves').update(values).eq('id', input.id).eq('user_id', userId).select('id').maybeSingle() : await supabase.from('passport_custom_shelves').insert(values).select('id').single();
  if (!result.data) return { shelfId: null, error: 'Could not save custom shelf' }; const shelfId = String(result.data.id);
  await supabase.from('passport_custom_shelf_items').delete().eq('shelf_id', shelfId);
  if (ids.length) await supabase.from('passport_custom_shelf_items').insert(ids.map((gameEntryId, index) => ({ shelf_id: shelfId, game_entry_id: gameEntryId, display_order: index })));
  return { shelfId, error: null };
}

export async function getPassportMediaKitSettings(userId: string) { const { data } = await createServiceClient().from('passport_media_kit_settings').select('*').eq('user_id', userId).maybeSingle(); return data ?? { enabled: false, headline: '', creator_roles: [], inquiry_url: null, include_dimensions: true, include_events: true, include_teams: true }; }
export async function updatePassportMediaKitSettings(userId: string, input: { enabled: boolean; headline: string; creatorRoles: string[]; inquiryUrl: string | null; includeDimensions: boolean; includeEvents: boolean; includeTeams: boolean }) { const supabase = createServiceClient(); if ((input.enabled || input.inquiryUrl) && await isMinorAccount(userId)) return { ok: false, error: MINOR_PASSPORT_PRIVACY_ERROR }; const { data: profile } = await supabase.from('profiles').select('plan, plan_expires_at').eq('id', userId).maybeSingle(); if (publicPlan(profile?.plan, profile?.plan_expires_at) === 'free') return { ok: false, error: 'Pro or Elite is required for a media kit' }; if (input.inquiryUrl && !input.inquiryUrl.startsWith('https://')) return { ok: false, error: 'Inquiry URL must use HTTPS' }; const { error } = await supabase.from('passport_media_kit_settings').upsert({ user_id: userId, enabled: input.enabled, headline: input.headline.trim().slice(0, 140), creator_roles: input.creatorRoles.map((role) => role.trim()).filter(Boolean).slice(0, 8), inquiry_url: input.inquiryUrl, include_dimensions: input.includeDimensions, include_events: input.includeEvents, include_teams: input.includeTeams }, { onConflict: 'user_id' }); return { ok: !error, error: error ? 'Could not save media kit' : null }; }

export async function getPublicPassportMediaKitSettings(userId: string) {
  if (await isMinorAccount(userId)) return null;
  const supabase = createServiceClient();
  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabase.from('passport_media_kit_settings').select('*').eq('user_id', userId).eq('enabled', true).maybeSingle(),
    supabase.from('profiles').select('plan, plan_expires_at').eq('id', userId).maybeSingle(),
  ]);
  if (!settings || publicPlan(profile?.plan, profile?.plan_expires_at) === 'free') return null;
  return settings;
}

export async function generatePassportReplay(userId: string, year: number) {
  const currentYear = new Date().getUTCFullYear(); if (!Number.isInteger(year) || year < 2020 || year > currentYear) return { replay: null, error: 'Choose a valid Replay year' };
  const supabase = createServiceClient(); const start = `${year}-01-01T00:00:00.000Z`; const end = `${year + 1}-01-01T00:00:00.000Z`; const cutoff = year === currentYear ? new Date().toISOString() : end;
  const [profileResult, gamesResult, matchesResult, eventsResult, awardsResult, legacyAwardsResult, passportResult] = await Promise.all([
    supabase.from('profiles').select('username, avatar_url').eq('id', userId).maybeSingle(),
    supabase.from('passport_game_entries').select('id, play_status, completed_on, hours_played, is_favorite, created_at, game:passport_game_catalog(title, slug)').eq('user_id', userId),
    supabase.from('matches').select('id, game, winner_id, player1_id, player2_id, completed_at').eq('status', 'completed').or(`player1_id.eq.${userId},player2_id.eq.${userId}`).gte('completed_at', start).lt('completed_at', end),
    supabase.from('passport_event_credentials').select('id, event_key, stamp_type, occurred_at').eq('user_id', userId).eq('credential_state', 'active').in('stamp_type', PRESENCE_STAMPS).gte('occurred_at', start).lt('occurred_at', end),
    supabase.from('passport_achievement_awards').select('id, issued_at').eq('user_id', userId).is('revoked_at', null).gte('issued_at', start).lt('issued_at', end),
    supabase.from('achievements').select('id, unlocked_at').eq('user_id', userId).gte('unlocked_at', start).lt('unlocked_at', end),
    supabase.from('passport_profiles').select('display_name').eq('user_id', userId).maybeSingle(),
  ]);
  if (!profileResult.data) return { replay: null, error: 'Player not found' };
  const allGames = gamesResult.data ?? [];
  const gamesAdded = allGames.filter((row) => String(row.created_at) >= start && String(row.created_at) < end);
  const gamesCompleted = allGames.filter((row) => row.completed_on && String(row.completed_on) >= `${year}-01-01` && String(row.completed_on) < `${year + 1}-01-01`);
  const matches = matchesResult.data ?? []; const events = eventsResult.data ?? [];
  const wins = matches.filter((row) => row.winner_id === userId).length; const draws = matches.filter((row) => !row.winner_id).length; const losses = Math.max(0, matches.length - wins - draws);
  const gameCounts = new Map<string, number>(); const teammateIds = new Set<string>(); const monthCounts = new Map<string, number>();
  for (const match of matches) { gameCounts.set(String(match.game), (gameCounts.get(String(match.game)) ?? 0) + 1); teammateIds.add(String(match.player1_id === userId ? match.player2_id : match.player1_id)); if (match.completed_at) { const month = String(match.completed_at).slice(0, 7); monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1); } }
  const top = [...gameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; const busiestMonth = [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favorite = gamesAdded.find((row) => row.is_favorite); const favoriteGame = favorite ? relation(favorite.game as { title: string } | Array<{ title: string }> | null)?.title ?? null : null;
  const hours = gamesAdded.reduce((sum, row) => sum + Number(row.hours_played ?? 0), 0);
  const payload: PassportReplayPayload = { year, period_label: year === currentYear ? `${year} year to date` : `${year} final`, exact: { games_added: gamesAdded.length, games_completed: gamesCompleted.length, verified_matches: matches.length, wins, losses, draws, win_rate: matches.length ? Math.round((wins / matches.length) * 100) : 0, event_credentials: events.length, distinct_events: new Set(events.map((row) => String(row.event_key))).size, achievements_unlocked: (awardsResult.data?.length ?? 0) + (legacyAwardsResult.data?.length ?? 0), teammates_played: teammateIds.size, hours_recorded: Math.round(hours * 10) / 10 }, highlights: { top_competitive_game: top, favorite_added_game: favoriteGame, busiest_month: busiestMonth }, estimates: [], generated_from: ['Passport game entries', 'completed Mechi matches', 'active Event Passport credentials', 'active Passport and match achievement awards'] };
  const periodState = year === currentYear ? 'year_to_date' : 'final';
  const { data, error } = await supabase.from('passport_replay_snapshots').upsert({ user_id: userId, replay_year: year, formula_version: FORMULA_VERSION, period_state: periodState, payload, source_cutoff_at: cutoff }, { onConflict: 'user_id,replay_year' }).select('id, share_token, user_id, replay_year, period_state, payload, source_cutoff_at, is_public, generated_at').single();
  if (error || !data) return { replay: null, error: 'Could not generate Replay' };
  await getPassportProgression(userId);
  return { replay: { ...data, username: String(profileResult.data.username), display_name: String(passportResult.data?.display_name ?? profileResult.data.username), avatar_url: profileResult.data.avatar_url } as PassportReplay, error: null };
}

export async function getPassportReplays(userId: string): Promise<PassportReplay[]> {
  const supabase = createServiceClient(); const [{ data: profile }, { data: passport }, { data }] = await Promise.all([supabase.from('profiles').select('username, avatar_url').eq('id', userId).maybeSingle(), supabase.from('passport_profiles').select('display_name').eq('user_id', userId).maybeSingle(), supabase.from('passport_replay_snapshots').select('*').eq('user_id', userId).order('replay_year', { ascending: false })]);
  return (data ?? []).map((row) => ({ id: String(row.id), share_token: String(row.share_token), user_id: userId, username: String(profile?.username ?? 'player'), display_name: String(passport?.display_name ?? profile?.username ?? 'player'), avatar_url: profile?.avatar_url ?? null, replay_year: Number(row.replay_year), period_state: row.period_state, payload: row.payload, source_cutoff_at: String(row.source_cutoff_at), is_public: Boolean(row.is_public), generated_at: String(row.generated_at) }));
}

export async function setPassportReplayPublic(userId: string, replayId: string, isPublic: boolean) { const supabase = createServiceClient(); if (isPublic) { if (await isMinorAccount(userId)) return false; const { data: passport } = await supabase.from('passport_profiles').select('user_id').eq('user_id', userId).eq('publication_status', 'published').maybeSingle(); if (!passport) return false; } const { data } = await supabase.from('passport_replay_snapshots').update({ is_public: isPublic }).eq('id', replayId).eq('user_id', userId).select('id').maybeSingle(); return Boolean(data); }
export async function getPublicPassportReplay(token: string): Promise<PassportReplay | null> { const supabase = createServiceClient(); const { data } = await supabase.from('passport_replay_snapshots').select('id, share_token, user_id, replay_year, period_state, payload, source_cutoff_at, is_public, generated_at, profile:profiles(avatar_url)').eq('share_token', token).eq('is_public', true).maybeSingle(); if (!data || await isMinorAccount(String(data.user_id))) return null; const profile = relation(data.profile as { avatar_url: string | null } | Array<{ avatar_url: string | null }> | null); if (!profile) return null; const { data: passport } = await supabase.from('passport_profiles').select('public_handle, display_name').eq('user_id', data.user_id).eq('publication_status', 'published').maybeSingle(); if (!passport?.public_handle) return null; return { id: String(data.id), share_token: String(data.share_token), user_id: String(data.user_id), username: String(passport.public_handle), display_name: passport.display_name ?? String(passport.public_handle), avatar_url: profile.avatar_url, replay_year: Number(data.replay_year), period_state: data.period_state, payload: data.payload, source_cutoff_at: String(data.source_cutoff_at), is_public: true, generated_at: String(data.generated_at) }; }
