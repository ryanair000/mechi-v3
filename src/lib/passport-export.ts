import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase';

type QueryResult = { data: unknown; error: { message?: string } | null };

function hashReference(value: string): string {
  return createHash('sha256').update(`passport-export-reference-v1:${value}`).digest('hex').slice(0, 20);
}

function requestHash(value: string | null): string | null {
  return value ? createHash('sha256').update(value).digest('hex') : null;
}

function requireResult(section: string, result: QueryResult): unknown {
  if (result.error) throw new Error(`Passport export could not load ${section}`);
  return result.data ?? [];
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
}

function relationshipRows(
  rows: Array<Record<string, unknown>>,
  userId: string,
  leftKey: string,
  rightKey: string,
  fields: string[]
) {
  return rows.map((row) => {
    const left = String(row[leftKey] ?? '');
    const right = String(row[rightKey] ?? '');
    const counterpart = left === userId ? right : left;
    return {
      counterpart_reference: hashReference(counterpart),
      ...Object.fromEntries(fields.map((field) => [field, row[field] ?? null])),
    };
  });
}

export async function buildPassportExportBundle(userId: string) {
  const supabase = createServiceClient();
  const [
    account,
    identity,
    summary,
    games,
    verifications,
    events,
    friendships,
    follows,
    blocks,
    comparisons,
    highlights,
    dimensions,
    achievements,
    customization,
    showcase,
    shelves,
    replays,
    connections,
    imports,
    competitive,
    cvSettings,
    mediaKit,
  ] = await Promise.all([
    supabase.from('profiles').select('id, username, phone, email, region, country, platforms, selected_games, game_ids, avatar_url, cover_url, age_policy_status, age_policy_source, age_policy_updated_at, created_at').eq('id', userId).maybeSingle(),
    supabase.from('passport_profiles').select('public_handle, publication_status, published_at, publication_consent_version, publication_consent_at, display_name, bio, gamer_since, archetypes, current_status, default_visibility, field_visibility, is_discoverable, card_accent, created_at, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('passport_profile_summaries').select('games_count, playing_games_count, completed_games_count, favorite_games_count, total_library_hours, total_matches, total_wins, total_losses, best_rating, tournaments_registered, events_attended, completed_events, achievements_count, badges_count, teams_count, verified_records_count, friends_count, followers_count, following_count, last_activity_at, computed_at').eq('user_id', userId).maybeSingle(),
    supabase.from('passport_game_entries').select('id, catalog_game_id, platform, play_status, started_on, completed_on, rating, hours_played, short_review, contains_spoilers, is_favorite, is_featured, visibility, screenshot_url, source_type, source_key, created_at, updated_at, game:passport_game_catalog(slug,title,release_year)').eq('user_id', userId).order('created_at'),
    supabase.from('passport_verification_records').select('id, subject_type, subject_id, verification_state, label, source_type, source_key, public_details, issued_at, revoked_at, revocation_reason, created_at, updated_at').eq('user_id', userId).order('issued_at'),
    supabase.from('passport_event_credentials').select('id, event_key, event_title, stamp_type, credential_state, game, role_label, placement, source_type, source_key, source_subject_id, issued_at, occurred_at, public_details, media_url, media_consent, revoked_at, revocation_reason, created_at, updated_at').eq('user_id', userId).order('occurred_at'),
    supabase.from('passport_friendships').select('user_a_id, user_b_id, requested_by, status, responded_at, created_at, updated_at').or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`).order('created_at'),
    supabase.from('passport_follows').select('follower_id, followed_id, created_at').or(`follower_id.eq.${userId},followed_id.eq.${userId}`).order('created_at'),
    supabase.from('passport_blocks').select('blocker_id, blocked_id, reason_category, created_at').or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`).order('created_at'),
    supabase.from('passport_comparison_events').select('actor_id, left_user_id, right_user_id, event_type, created_at').or(`left_user_id.eq.${userId},right_user_id.eq.${userId},actor_id.eq.${userId}`).order('created_at'),
    supabase.from('passport_highlights').select('id, source_type, source_id, title, caption, media_url, media_consent, visibility, display_order, is_active, created_at, updated_at').eq('user_id', userId).order('display_order'),
    supabase.from('passport_dimension_snapshots').select('formula_version, passport_level, total_points, dimensions, source_counts, projected_at').eq('user_id', userId).maybeSingle(),
    supabase.from('passport_achievement_awards').select('id, achievement_key, source_type, source_key, issued_at, revoked_at, revocation_reason, last_evaluated_at').eq('user_id', userId).order('issued_at'),
    supabase.from('passport_customizations').select('theme_key, avatar_frame_key, card_style_key, show_dimensions, show_level, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('passport_showcase_items').select('id, slot, source_type, source_id, label, visibility, created_at, updated_at').eq('user_id', userId).order('slot'),
    supabase.from('passport_custom_shelves').select('id, title, description, visibility, display_order, created_at, updated_at').eq('user_id', userId).order('display_order'),
    supabase.from('passport_replay_snapshots').select('id, replay_year, formula_version, period_state, payload, source_cutoff_at, is_public, generated_at, updated_at').eq('user_id', userId).order('replay_year'),
    supabase.from('passport_provider_connections').select('id, provider_key, provider_account_id, account_label, account_url, status, granted_scopes, token_expires_at, consent_version, consented_at, last_sync_started_at, last_synced_at, last_sync_status, last_error_code, revoked_at, created_at, updated_at').eq('user_id', userId).order('created_at'),
    supabase.from('passport_import_events').select('id, external_item_id, action, created_at').eq('user_id', userId).order('created_at'),
    supabase.from('passport_competitive_snapshots').select('id, game, season_id, current_rating, peak_rating, matches_played, wins, losses, draws, tournament_entries, tournament_wins, podiums, computed_at, created_at, updated_at').eq('user_id', userId).order('computed_at'),
    supabase.from('passport_cv_settings').select('selected_games, include_events, include_teams, include_achievements, inquiry_enabled, inquiry_url, headline, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('passport_media_kit_settings').select('enabled, headline, creator_roles, inquiry_url, include_dimensions, include_events, include_teams, updated_at').eq('user_id', userId).maybeSingle(),
  ]);

  const connectionRows = asRows(requireResult('platform connections', connections));
  const shelfRows = asRows(requireResult('custom shelves', shelves));
  const [externalItems, shelfItems] = await Promise.all([
    connectionRows.length
      ? supabase.from('passport_external_items').select('id, connection_id, provider_item_type, title, remote_updated_at, first_seen_at, last_seen_at, import_state, matched_catalog_game_id, passport_game_entry_id, imported_at, hidden_at, created_at, updated_at').in('connection_id', connectionRows.map((row) => String(row.id))).order('created_at')
      : Promise.resolve({ data: [], error: null }),
    shelfRows.length
      ? supabase.from('passport_custom_shelf_items').select('shelf_id, game_entry_id, display_order, added_at').in('shelf_id', shelfRows.map((row) => String(row.id))).order('display_order')
      : Promise.resolve({ data: [], error: null }),
  ]);

  const bundle = {
    export: {
      schema_version: 'passport-export-v1',
      generated_at: new Date().toISOString(),
      subject_user_id: userId,
      format: 'application/json',
      source: 'PlayMechi Gamer Passport',
    },
    account: requireResult('account', account),
    identity_and_privacy: requireResult('identity and privacy', identity),
    aggregate_summary: requireResult('aggregate summary', summary),
    game_journal: requireResult('game journal', games),
    verification_records: requireResult('verification records', verifications),
    event_credentials: requireResult('event credentials', events),
    social_relationships: {
      friendships: relationshipRows(asRows(requireResult('friendships', friendships)), userId, 'user_a_id', 'user_b_id', ['status', 'responded_at', 'created_at', 'updated_at']),
      follows: relationshipRows(asRows(requireResult('follows', follows)), userId, 'follower_id', 'followed_id', ['created_at']),
      blocks: relationshipRows(asRows(requireResult('blocks', blocks)), userId, 'blocker_id', 'blocked_id', ['reason_category', 'created_at']),
    },
    comparisons: relationshipRows(asRows(requireResult('comparisons', comparisons)), userId, 'left_user_id', 'right_user_id', ['event_type', 'created_at']),
    highlights: requireResult('highlights', highlights),
    progression: {
      dimensions: requireResult('dimension progression', dimensions),
      achievements: requireResult('achievement awards', achievements),
      customization: requireResult('customization', customization),
      showcase: requireResult('showcase', showcase),
      shelves: shelfRows,
      shelf_items: requireResult('shelf items', shelfItems),
    },
    annual_replays: requireResult('annual replays', replays),
    competitive_history: requireResult('competitive history', competitive),
    presentation_settings: {
      gamer_cv: requireResult('Gamer CV settings', cvSettings),
      media_kit: requireResult('media kit settings', mediaKit),
    },
    platform_connections: connectionRows,
    connection_import_history: {
      items: requireResult('external item history', externalItems),
      actions: requireResult('import actions', imports),
    },
    exclusions: [
      'password hashes and authentication secrets',
      'provider access and refresh tokens',
      'developer API token hashes and webhook signing secrets',
      'raw third-party provider payloads and conflict metadata',
      'other players’ direct identifiers and profile data',
      'internal fraud, moderation, security, and abuse-detection signals',
      'raw product analytics request identifiers',
    ],
  };

  return bundle;
}

export async function createPassportDataExport(userId: string, requestId: string | null) {
  const supabase = createServiceClient();
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const requestedAt = new Date();
  const expiresAt = new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000);
  let bundle: Awaited<ReturnType<typeof buildPassportExportBundle>>;
  try {
    bundle = await buildPassportExportBundle(userId);
  } catch {
    await supabase.from('passport_data_export_audit').insert({
      user_id: userId,
      action: 'failed',
      request_id_hash: requestHash(requestId),
      details: { failure_class: 'bundle_generation_error' },
    });
    return { data: null, error: 'Could not create Passport export', status: 500 } as const;
  }
  const sections = Object.keys(bundle).filter((key) => key !== 'export' && key !== 'exclusions');
  const { data, error } = await supabase.from('passport_data_exports').insert({
    user_id: userId,
    status: 'ready',
    format: 'json',
    schema_version: 'passport-export-v1',
    manifest: { sections, exclusion_count: bundle.exclusions.length },
    payload: bundle,
    download_token_hash: tokenHash,
    requested_at: requestedAt.toISOString(),
    ready_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  }).select('id, expires_at').single();

  if (error || !data) {
    await supabase.from('passport_data_export_audit').insert({
      user_id: userId,
      action: 'failed',
      request_id_hash: requestHash(requestId),
      details: { failure_class: error?.code === 'P0001' ? 'rate_limited' : 'storage_error' },
    });
    return {
      data: null,
      error: error?.code === 'P0001'
        ? 'You can create up to three Passport exports in 24 hours'
        : 'Could not create Passport export',
      status: error?.code === 'P0001' ? 429 : 500,
    } as const;
  }

  await supabase.from('passport_data_export_audit').insert([
    { export_id: data.id, user_id: userId, action: 'requested', request_id_hash: requestHash(requestId), details: { format: 'json' } },
    { export_id: data.id, user_id: userId, action: 'ready', request_id_hash: requestHash(requestId), details: { section_count: sections.length } },
  ]);
  return {
    data: {
      id: String(data.id),
      token: rawToken,
      expires_at: String(data.expires_at),
    },
    error: null,
    status: 201,
  } as const;
}

export async function listPassportDataExports(userId: string) {
  const { data, error } = await createServiceClient().from('passport_data_exports')
    .select('id, status, format, schema_version, manifest, requested_at, ready_at, expires_at, downloaded_at, download_count')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })
    .limit(10);
  if (error) throw new Error('Could not load Passport exports');
  return data ?? [];
}

export async function consumePassportDataExport(userId: string, rawToken: string, requestId: string | null) {
  if (!/^[a-f0-9]{64}$/.test(rawToken)) return null;
  const supabase = createServiceClient();
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const { data } = await supabase.from('passport_data_exports')
    .select('id, payload, expires_at, download_count')
    .eq('user_id', userId)
    .eq('status', 'ready')
    .eq('download_token_hash', tokenHash)
    .maybeSingle();
  if (!data?.payload) return null;

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await supabase.from('passport_data_exports').update({ status: 'expired', payload: null, download_token_hash: null }).eq('id', data.id).eq('user_id', userId);
    await supabase.from('passport_data_export_audit').insert({ export_id: data.id, user_id: userId, action: 'expired', request_id_hash: requestHash(requestId) });
    return null;
  }

  const downloadedAt = new Date().toISOString();
  await supabase.from('passport_data_exports').update({
    downloaded_at: downloadedAt,
    download_count: Number(data.download_count ?? 0) + 1,
  }).eq('id', data.id).eq('user_id', userId);
  await supabase.from('passport_data_export_audit').insert({
    export_id: data.id,
    user_id: userId,
    action: 'downloaded',
    request_id_hash: requestHash(requestId),
    details: { format: 'json' },
  });
  return { id: String(data.id), payload: data.payload };
}
