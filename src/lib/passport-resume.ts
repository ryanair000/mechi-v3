import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { GAMES } from '@/lib/config';
import { isMissingTableError } from '@/lib/db-compat';
import { getPassportData } from '@/lib/passport';
import type {
  PassportCheckinPass,
  PassportCompetitiveGame,
  PassportCompetitiveSeasonEntry,
  PassportCompetitiveResume,
  PassportCvSettings,
  PassportEventCredential,
  PassportEventStampType,
  PassportTeamHistoryEntry,
  PassportTournamentResumeEntry,
  PassportVerifiedMatch,
} from '@/lib/passport-resume-types';
import { createServiceClient } from '@/lib/supabase';
import { APP_URL } from '@/lib/urls';

const DEFAULT_CV_SETTINGS: PassportCvSettings = {
  selected_games: [], include_events: true, include_teams: true,
  include_achievements: true, inquiry_enabled: false, inquiry_url: null, headline: '',
};

type MatchRow = {
  id: string; player1_id: string; player2_id: string; winner_id: string | null;
  game: string; platform: string | null; player1_score: number | null; player2_score: number | null;
  completed_at: string; tournament_id: string | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function ratingForProfile(profile: Record<string, unknown>, game: string) {
  const value = Number(profile[`rating_${game}`] ?? 1000);
  return Number.isFinite(value) ? value : 1000;
}

function safeScore(match: MatchRow, userId: string) {
  if (match.player1_score === null || match.player2_score === null) return null;
  return userId === match.player1_id
    ? `${match.player1_score}-${match.player2_score}`
    : `${match.player2_score}-${match.player1_score}`;
}

async function loadCompetitiveGames(userId: string) {
  const supabase = createServiceClient();
  const [{ data: profile }, { data: rows, error }, { data: snapshots }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('matches').select('id, player1_id, player2_id, winner_id, game, platform, player1_score, player2_score, completed_at, tournament_id')
      .eq('status', 'completed').or(`player1_id.eq.${userId},player2_id.eq.${userId}`).order('completed_at', { ascending: false }).limit(200),
    supabase.from('passport_competitive_snapshots').select('*').eq('user_id', userId).is('season_id', null),
  ]);
  if (error) console.error('[Passport Resume] Match history failed:', error);
  const matches = (rows ?? []) as MatchRow[];
  const snapshotByGame = new Map((snapshots ?? []).map((row) => [String(row.game), row]));
  const games = [...new Set(matches.map((match) => match.game))];
  const profilesById = new Map<string, string>();
  const opponentIds = [...new Set(matches.map((match) => match.player1_id === userId ? match.player2_id : match.player1_id))];
  if (opponentIds.length) {
    const { data: opponents } = await supabase.from('profiles').select('id, username').in('id', opponentIds);
    for (const opponent of opponents ?? []) profilesById.set(String(opponent.id), String(opponent.username));
  }
  const competitiveGames: PassportCompetitiveGame[] = games.map((game) => {
    const gameMatches = matches.filter((match) => match.game === game);
    const wins = gameMatches.filter((match) => match.winner_id === userId).length;
    const losses = gameMatches.filter((match) => match.winner_id && match.winner_id !== userId).length;
    const draws = gameMatches.length - wins - losses;
    const snapshot = snapshotByGame.get(game);
    const currentRating = Number(snapshot?.current_rating ?? ratingForProfile((profile ?? {}) as Record<string, unknown>, game));
    return {
      game, label: GAMES[game as keyof typeof GAMES]?.label ?? game,
      current_rating: currentRating, peak_rating: Math.max(currentRating, Number(snapshot?.peak_rating ?? currentRating)),
      matches: gameMatches.length, wins, losses, draws,
      win_rate: gameMatches.length ? Math.round(wins / gameMatches.length * 100) : 0,
      tournament_entries: Number(snapshot?.tournament_entries ?? 0), tournament_wins: Number(snapshot?.tournament_wins ?? 0),
      podiums: Number(snapshot?.podiums ?? 0), latest_match_at: gameMatches[0]?.completed_at ?? null,
    };
  }).sort((left, right) => right.matches - left.matches);
  const history: PassportVerifiedMatch[] = matches.slice(0, 50).map((match) => {
    const opponentId = match.player1_id === userId ? match.player2_id : match.player1_id;
    return {
      id: match.id, game: match.game, platform: match.platform, opponent_id: opponentId,
      opponent_username: profilesById.get(opponentId) ?? 'Player',
      result: match.winner_id === userId ? 'win' : match.winner_id ? 'loss' : 'draw',
      score: safeScore(match, userId), completed_at: match.completed_at, tournament_id: match.tournament_id,
    };
  });
  return { games: competitiveGames, matches: history };
}

async function loadCompetitiveSeasons(userId: string): Promise<PassportCompetitiveSeasonEntry[]> {
  const { data, error } = await createServiceClient().from('passport_competitive_snapshots')
    .select('id, game, current_rating, peak_rating, matches_played, wins, losses, draws, tournament_entries, tournament_wins, podiums, season:passport_competitive_seasons!inner(season_key, title, starts_at, ends_at)')
    .eq('user_id', userId).not('season_id', 'is', null).order('computed_at', { ascending: false });
  if (error) return [];
  return (data ?? []).flatMap((row) => {
    const season = firstRelation(row.season as unknown as { season_key: string; title: string; starts_at: string; ends_at: string | null } | Array<{ season_key: string; title: string; starts_at: string; ends_at: string | null }> | null);
    if (!season) return [];
    return [{ id: String(row.id), season_key: season.season_key, title: season.title, game: String(row.game), current_rating: Number(row.current_rating), peak_rating: Number(row.peak_rating), matches: Number(row.matches_played), wins: Number(row.wins), losses: Number(row.losses), draws: Number(row.draws), tournament_entries: Number(row.tournament_entries), tournament_wins: Number(row.tournament_wins), podiums: Number(row.podiums), starts_at: season.starts_at, ends_at: season.ends_at }];
  });
}

async function loadTournamentResume(userId: string): Promise<PassportTournamentResumeEntry[]> {
  const supabase = createServiceClient();
  const { data } = await supabase.from('tournament_players')
    .select('id, joined_at, check_in_status, checked_in_at, tournament:tournaments(id, slug, title, game, status, winner_id, ended_at)')
    .eq('user_id', userId).in('payment_status', ['paid', 'free']).order('joined_at', { ascending: false });
  const rows = data ?? [];
  const tournamentIds = rows.flatMap((row) => {
    const tournament = firstRelation(row.tournament as unknown as { id: string } | Array<{ id: string }> | null);
    return tournament ? [tournament.id] : [];
  });
  let roundByTournament = new Map<string, number>();
  if (tournamentIds.length) {
    const { data: rounds } = await supabase.from('tournament_matches').select('tournament_id, round')
      .in('tournament_id', tournamentIds).or(`player1_id.eq.${userId},player2_id.eq.${userId}`);
    roundByTournament = new Map((rounds ?? []).map((row) => [String(row.tournament_id), Number(row.round)]));
    for (const row of rounds ?? []) roundByTournament.set(String(row.tournament_id), Math.max(roundByTournament.get(String(row.tournament_id)) ?? 0, Number(row.round)));
  }
  return rows.flatMap((row) => {
    const tournament = firstRelation(row.tournament as unknown as { id: string; slug: string; title: string; game: string; status: string; winner_id: string | null; ended_at: string | null } | Array<{ id: string; slug: string; title: string; game: string; status: string; winner_id: string | null; ended_at: string | null }> | null);
    if (!tournament) return [];
    return [{ id: tournament.id, slug: tournament.slug, title: tournament.title, game: tournament.game, status: tournament.status,
      registration_state: row.check_in_status as PassportTournamentResumeEntry['registration_state'], joined_at: String(row.joined_at),
      checked_in_at: row.checked_in_at ? String(row.checked_in_at) : null, highest_round: roundByTournament.get(tournament.id) ?? null,
      champion: tournament.winner_id === userId, ended_at: tournament.ended_at }];
  });
}

async function loadTeamHistory(userId: string): Promise<PassportTeamHistoryEntry[]> {
  const { data } = await createServiceClient().from('team_members')
    .select('role, status, joined_at, left_at, team:teams(id, name, slug, avatar_url)')
    .eq('user_id', userId).order('joined_at', { ascending: false });
  return (data ?? []).flatMap((row) => {
    const team = firstRelation(row.team as unknown as { id: string; name: string; slug: string; avatar_url: string | null } | Array<{ id: string; name: string; slug: string; avatar_url: string | null }> | null);
    return team ? [{ id: team.id, name: team.name, slug: team.slug, avatar_url: team.avatar_url, role: String(row.role), membership_status: String(row.status), joined_at: String(row.joined_at), left_at: row.left_at ? String(row.left_at) : null }] : [];
  });
}

function normalizeCredential(row: Record<string, unknown>): PassportEventCredential {
  const profile = firstRelation(row.profile as { username?: string; passport_profiles?: { display_name?: string } | Array<{ display_name?: string }> } | Array<{ username?: string; passport_profiles?: { display_name?: string } | Array<{ display_name?: string }> }> | null);
  const issuer = firstRelation(row.issuer as { username?: string } | Array<{ username?: string }> | null);
  const passport = firstRelation(profile?.passport_profiles);
  return {
    id: String(row.id), verification_token: String(row.verification_token), user_id: String(row.user_id),
    username: profile?.username ?? 'player', display_name: passport?.display_name ?? profile?.username ?? 'Player',
    event_key: String(row.event_key), event_title: String(row.event_title), stamp_type: row.stamp_type as PassportEventStampType,
    credential_state: row.credential_state as 'active' | 'revoked', game: row.game ? String(row.game) : null,
    role_label: row.role_label ? String(row.role_label) : null, placement: row.placement === null ? null : Number(row.placement),
    source_type: String(row.source_type), source_key: String(row.source_key), issued_by: row.issued_by ? String(row.issued_by) : null,
    issuer_username: issuer?.username ?? null, issued_at: String(row.issued_at), occurred_at: String(row.occurred_at),
    public_details: (row.public_details ?? {}) as Record<string, unknown>, media_url: row.media_url ? String(row.media_url) : null,
    media_consent: Boolean(row.media_consent), revoked_at: row.revoked_at ? String(row.revoked_at) : null,
  };
}

const CREDENTIAL_SELECT = '*, profile:profiles!passport_event_credentials_user_id_fkey(username, passport_profiles(display_name)), issuer:profiles!passport_event_credentials_issued_by_fkey(username)';

export async function loadPassportEventCredentials(userId: string, includeRevoked = false) {
  let query = createServiceClient().from('passport_event_credentials').select(CREDENTIAL_SELECT).eq('user_id', userId).order('occurred_at', { ascending: false });
  if (!includeRevoked) query = query.eq('credential_state', 'active');
  const { data, error } = await query;
  if (error) {
    if (!isMissingTableError(error, 'passport_event_credentials')) console.error('[Passport Resume] Credentials failed:', error);
    return { credentials: [] as PassportEventCredential[], storageReady: !isMissingTableError(error, 'passport_event_credentials') };
  }
  return { credentials: (data ?? []).map((row) => normalizeCredential(row as Record<string, unknown>)), storageReady: true };
}

export async function getPassportCredentialByToken(token: string) {
  const { data } = await createServiceClient().from('passport_event_credentials').select(CREDENTIAL_SELECT).eq('verification_token', token).maybeSingle();
  return data ? normalizeCredential(data as Record<string, unknown>) : null;
}

async function loadCvSettings(userId: string): Promise<PassportCvSettings> {
  const { data } = await createServiceClient().from('passport_cv_settings').select('selected_games, include_events, include_teams, include_achievements, inquiry_enabled, inquiry_url, headline').eq('user_id', userId).maybeSingle();
  return data ? { selected_games: data.selected_games ?? [], include_events: Boolean(data.include_events), include_teams: Boolean(data.include_teams), include_achievements: Boolean(data.include_achievements), inquiry_enabled: Boolean(data.inquiry_enabled), inquiry_url: data.inquiry_url, headline: data.headline ?? '' } : DEFAULT_CV_SETTINGS;
}

export async function getPassportCompetitiveResume(username: string, ownerView = false): Promise<PassportCompetitiveResume | null> {
  const passport = await getPassportData(username, { ownerView });
  if (!passport || (!ownerView && passport.access === 'restricted')) return null;
  const userId = passport.identity.user_id;
  const [competitive, seasons, tournaments, teams, events, cvSettings] = await Promise.all([
    loadCompetitiveGames(userId), loadCompetitiveSeasons(userId), loadTournamentResume(userId), loadTeamHistory(userId), loadPassportEventCredentials(userId), loadCvSettings(userId),
  ]);
  const games = competitive.games.map((game) => {
    const entries = tournaments.filter((tournament) => tournament.game === game.game);
    const tournamentWins = entries.filter((tournament) => tournament.champion).length;
    return { ...game, tournament_entries: entries.length, tournament_wins: tournamentWins, podiums: Math.max(game.podiums, tournamentWins) };
  });
  if (ownerView && events.storageReady && games.length) {
    await createServiceClient().from('passport_competitive_snapshots').upsert(games.map((game) => ({
      user_id: userId, game: game.game, season_id: null, current_rating: game.current_rating,
      peak_rating: game.peak_rating, matches_played: game.matches, wins: game.wins, losses: game.losses,
      draws: game.draws, tournament_entries: game.tournament_entries, tournament_wins: game.tournament_wins,
      podiums: game.podiums, source_cursor: game.latest_match_at, computed_at: new Date().toISOString(),
    })), { onConflict: 'user_id,game,season_id' });
  }
  const fieldVisible = (field: 'competitive' | 'events' | 'teams') => ownerView || (
    passport.identity.default_visibility === 'public' && passport.identity.field_visibility[field] === 'public'
  );
  return { access: ownerView ? 'owner' : 'public', storage_ready: events.storageReady, identity: passport.identity,
    games: fieldVisible('competitive') ? games : [], seasons: fieldVisible('competitive') ? seasons : [], matches: fieldVisible('competitive') ? competitive.matches : [],
    tournaments: fieldVisible('events') ? tournaments : [], teams: fieldVisible('teams') ? teams : [],
    events: fieldVisible('events') ? events.credentials : [],
    cv_settings: cvSettings, generated_at: new Date().toISOString() };
}

export async function updatePassportCvSettings(userId: string, settings: PassportCvSettings) {
  const { error } = await createServiceClient().from('passport_cv_settings').upsert({ user_id: userId, ...settings }, { onConflict: 'user_id' });
  return error ? { ok: false, error: 'Could not update Gamer CV settings' } : { ok: true, error: null };
}

export async function issuePassportCheckinPass(input: { userId: string; eventKey: string; eventTitle: string; game?: string | null; tournamentId?: string | null; tournamentPlayerId?: string | null; issuedBy: string; expiresAt: string }): Promise<{ pass: PassportCheckinPass | null; error: string | null }> {
  if (Boolean(input.tournamentId) !== Boolean(input.tournamentPlayerId)) return { pass: null, error: 'Tournament passes require an exact participant registration' };
  if (input.tournamentId && input.tournamentPlayerId) {
    const { data: registration } = await createServiceClient().from('tournament_players').select('id').eq('id', input.tournamentPlayerId).eq('tournament_id', input.tournamentId).eq('user_id', input.userId).in('payment_status', ['paid', 'free']).maybeSingle();
    if (!registration) return { pass: null, error: 'Confirmed tournament registration not found' };
  }
  const token = randomUUID();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data, error } = await createServiceClient().from('passport_event_checkin_passes').insert({
    token_hash: tokenHash, user_id: input.userId, event_key: input.eventKey, event_title: input.eventTitle,
    game: input.game ?? null, tournament_id: input.tournamentId ?? null, tournament_player_id: input.tournamentPlayerId ?? null,
    issued_by: input.issuedBy, expires_at: input.expiresAt,
  }).select('id, expires_at').single();
  if (error) return { pass: null, error: 'Could not issue check-in pass' };
  return { pass: { id: String(data.id), token, check_in_url: `${APP_URL}/passport/check-in/${token}`, expires_at: String(data.expires_at), user_id: input.userId, event_key: input.eventKey }, error: null };
}

export async function redeemPassportCheckin(token: string, actorId: string, fingerprint?: string | null) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data, error } = await createServiceClient().rpc('redeem_passport_event_checkin', { p_token_hash: tokenHash, p_actor_id: actorId, p_request_fingerprint: fingerprint ?? null });
  if (error) return { credentialId: null, outcome: 'invalid', error: 'Could not verify check-in' };
  const result = Array.isArray(data) ? data[0] : data;
  return { credentialId: result?.credential_id ? String(result.credential_id) : null, outcome: String(result?.outcome ?? 'invalid'), error: null };
}

export async function issuePassportEventCredential(input: { userId: string; eventKey: string; eventTitle: string; stampType: PassportEventStampType; game?: string | null; roleLabel?: string | null; placement?: number | null; occurredAt: string; issuedBy: string; sourceType: string; sourceKey: string; subjectType?: 'event' | 'tournament'; subjectId?: string; tournamentId?: string | null; tournamentPlayerId?: string | null; publicDetails?: Record<string, unknown>; mediaUrl?: string | null; mediaConsent?: boolean }) {
  const supabase = createServiceClient();
  const existing = await supabase.from('passport_event_credentials').select(CREDENTIAL_SELECT)
    .eq('user_id', input.userId).eq('stamp_type', input.stampType).eq('source_type', input.sourceType)
    .eq('source_key', input.sourceKey).eq('credential_state', 'active').maybeSingle();
  if (existing.data) return { credential: normalizeCredential(existing.data as Record<string, unknown>), error: null };
  const priorVerification = await supabase.from('passport_verification_records').select('id, revoked_at')
    .eq('user_id', input.userId).eq('source_type', input.sourceType).eq('source_key', input.sourceKey).maybeSingle();
  if (priorVerification.data?.revoked_at) return { credential: null, error: 'This source credential was revoked and cannot be reissued' };
  let verificationId = priorVerification.data?.id ? String(priorVerification.data.id) : null;
  let createdVerification = false;
  if (!verificationId) {
    const verification = await supabase.from('passport_verification_records').insert({
      user_id: input.userId, subject_type: input.subjectType ?? 'event', subject_id: input.subjectId ?? input.eventKey, verification_state: 'organizer_verified',
      label: `${input.eventTitle} ${input.stampType.replace('_', ' ')}`, source_type: input.sourceType, source_key: input.sourceKey,
      public_details: { event_key: input.eventKey, stamp_type: input.stampType, ...(input.publicDetails ?? {}) }, issued_by: input.issuedBy, issued_at: input.occurredAt,
    }).select('id').single();
    if (verification.error) return { credential: null, error: 'Could not create verification record' };
    verificationId = String(verification.data.id);
    createdVerification = true;
  }
  const result = await supabase.from('passport_event_credentials').insert({
    user_id: input.userId, event_key: input.eventKey, event_title: input.eventTitle, stamp_type: input.stampType,
    game: input.game ?? null, role_label: input.roleLabel ?? null, placement: input.placement ?? null,
    source_type: input.sourceType, source_key: input.sourceKey, source_subject_id: input.subjectId ?? input.eventKey,
    tournament_id: input.tournamentId ?? null, tournament_player_id: input.tournamentPlayerId ?? null,
    verification_record_id: verificationId, issued_by: input.issuedBy, issued_at: input.occurredAt,
    occurred_at: input.occurredAt, public_details: input.publicDetails ?? {}, media_url: input.mediaConsent ? input.mediaUrl ?? null : null,
    media_consent: Boolean(input.mediaConsent),
  }).select(CREDENTIAL_SELECT).single();
  if (result.error) {
    if (createdVerification) await supabase.from('passport_verification_records').delete().eq('id', verificationId);
    return { credential: null, error: 'Could not issue event credential' };
  }
  await supabase.from('passport_audit_logs').insert({ user_id: input.userId, actor_id: input.issuedBy, action: 'event_credential_issued', changed_fields: ['credential_state'], details: { credential_id: result.data.id, event_key: input.eventKey, stamp_type: input.stampType, source_type: input.sourceType } });
  return { credential: normalizeCredential(result.data as Record<string, unknown>), error: null };
}

export async function projectPassportTournamentCredentials(tournamentId: string, actorId: string) {
  const supabase = createServiceClient();
  const { data: tournament } = await supabase.from('tournaments')
    .select('id, slug, title, game, status, winner_id, organizer_id, ended_at').eq('id', tournamentId).maybeSingle();
  if (!tournament) return { created: 0, existing: 0, failed: 0, error: 'Tournament not found' };
  const { data: players, error } = await supabase.from('tournament_players')
    .select('id, user_id, joined_at, check_in_status, checked_in_at').eq('tournament_id', tournamentId).in('payment_status', ['paid', 'free']);
  if (error) return { created: 0, existing: 0, failed: 0, error: 'Could not load tournament participants' };
  const candidates: Array<Parameters<typeof issuePassportEventCredential>[0]> = (players ?? []).flatMap((player) => {
    const base = { userId: String(player.user_id), eventKey: String(tournament.slug), eventTitle: String(tournament.title), game: String(tournament.game), issuedBy: actorId, sourceType: 'tournament_player', subjectType: 'tournament' as const, subjectId: String(tournament.id), tournamentId: String(tournament.id), tournamentPlayerId: String(player.id), publicDetails: { tournament_id: tournament.id } };
    const items: Array<Parameters<typeof issuePassportEventCredential>[0]> = [{ ...base, stampType: 'registered', sourceKey: `${player.id}:registered`, occurredAt: String(player.joined_at) }];
    if (player.check_in_status === 'checked_in' && player.checked_in_at) items.push({ ...base, stampType: 'checked_in', sourceKey: `${player.id}:checked_in`, occurredAt: String(player.checked_in_at) });
    if (tournament.status === 'completed' && tournament.winner_id === player.user_id) items.push({ ...base, stampType: 'placement', placement: 1, sourceKey: `${player.id}:placement:1`, occurredAt: String(tournament.ended_at ?? player.checked_in_at ?? player.joined_at) });
    return items;
  });
  let created = 0; let existing = 0; let failed = 0;
  for (const candidate of candidates) {
    const before = await supabase.from('passport_event_credentials').select('id').eq('user_id', candidate.userId)
      .eq('tournament_player_id', candidate.tournamentPlayerId ?? '').eq('stamp_type', candidate.stampType).eq('credential_state', 'active').maybeSingle();
    if (before.data) { existing += 1; continue; }
    const result = await issuePassportEventCredential(candidate);
    if (result.credential) created += 1; else failed += 1;
  }
  return { created, existing, failed, error: null };
}

export async function revokePassportEventCredential(id: string, actorId: string, reason: string) {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('passport_event_credentials').update({ credential_state: 'revoked', revoked_at: now, revoked_by: actorId, revocation_reason: reason })
    .eq('id', id).eq('credential_state', 'active').select('user_id, verification_record_id').maybeSingle();
  if (error || !data) return { ok: false, error: 'Active credential not found' };
  if (data.verification_record_id) await supabase.from('passport_verification_records').update({ revoked_at: now, revoked_by: actorId, revocation_reason: reason }).eq('id', data.verification_record_id);
  await supabase.from('passport_audit_logs').insert({ user_id: data.user_id, actor_id: actorId, action: 'event_credential_revoked', changed_fields: ['credential_state'], details: { credential_id: id, reason } });
  return { ok: true, error: null };
}
