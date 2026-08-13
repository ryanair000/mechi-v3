import 'server-only';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PassportExternalItem, PassportProviderConnection, PassportProviderDefinition, PassportProviderKey } from '@/lib/passport-connections-types';
import { syncPassportLibrarySummary } from '@/lib/passport-games';
import { createServiceClient } from '@/lib/supabase';
import { APP_URL } from '@/lib/urls';

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const STEAM_CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;
const CONNECTION_CONSENT_VERSION = '2026-08-13.v1';
const STEAM_SCOPES = ['identity:read', 'library:read', 'play_history:read'];

function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function relation<T>(value: T | T[] | null | undefined): T | null { return Array.isArray(value) ? value[0] ?? null : value ?? null; }
function safeReturnPath(value?: string | null) { return value?.startsWith('/passport/') && !value.startsWith('//') ? value : '/passport/connections'; }
function stablePayload(value: unknown) { return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort()); }

export async function getPassportConnectionHubData(userId: string) {
  const supabase = createServiceClient();
  const [providersResult, connectionsResult, itemsResult] = await Promise.all([
    supabase.from('passport_provider_catalog').select('provider_key, label, connection_method, capability_scopes, status, attribution_label, terms_url, privacy_url').order('label'),
    supabase.from('passport_provider_connections').select('id, provider_key, account_label, account_url, status, granted_scopes, last_sync_started_at, last_synced_at, last_sync_status, last_error_message, created_at, provider:passport_provider_catalog(label)').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('passport_external_items').select('id, provider_item_type, provider_item_id, title, import_state, payload, last_seen_at, connection:passport_provider_connections!inner(user_id, provider_key)').eq('connection.user_id', userId).order('last_seen_at', { ascending: false }).limit(500),
  ]);
  const providers: PassportProviderDefinition[] = (providersResult.data ?? []).map((row) => ({ key: row.provider_key as PassportProviderKey, label: String(row.label), connection_method: row.connection_method, capability_scopes: row.capability_scopes ?? [], status: row.status, attribution_label: String(row.attribution_label), terms_url: row.terms_url, privacy_url: row.privacy_url }));
  const connections: PassportProviderConnection[] = (connectionsResult.data ?? []).map((row) => ({ id: String(row.id), provider_key: row.provider_key, provider_label: String(relation(row.provider as { label: string } | Array<{ label: string }> | null)?.label ?? row.provider_key), account_label: String(row.account_label), account_url: row.account_url, status: row.status, granted_scopes: row.granted_scopes ?? [], last_sync_started_at: row.last_sync_started_at, last_synced_at: row.last_synced_at, last_sync_status: row.last_sync_status, last_error_message: row.last_error_message, connected_at: String(row.created_at) }));
  const items: PassportExternalItem[] = (itemsResult.data ?? []).flatMap((row) => { const connection = relation(row.connection as { user_id: string; provider_key: PassportProviderKey } | Array<{ user_id: string; provider_key: PassportProviderKey }> | null); if (!connection || connection.user_id !== userId) return []; const payload = row.payload as Record<string, unknown>; return [{ id: String(row.id), provider_key: connection.provider_key, provider_item_type: row.provider_item_type, provider_item_id: String(row.provider_item_id), title: String(row.title), import_state: row.import_state, safe_details: { playtime_hours: Number(payload.playtime_forever ?? 0) / 60, recent_playtime_hours: Number(payload.playtime_2weeks ?? 0) / 60, image_url: typeof payload.img_icon_url === 'string' && payload.img_icon_url ? `https://media.steampowered.com/steamcommunity/public/images/apps/${row.provider_item_id}/${payload.img_icon_url}.jpg` : null }, last_seen_at: String(row.last_seen_at) }]; });
  return { providers, connections, items, storage_ready: !providersResult.error && !connectionsResult.error && !itemsResult.error };
}

export async function createSteamConnectionIntent(userId: string, returnPath?: string | null) {
  const supabase = createServiceClient();
  const { data: provider } = await supabase.from('passport_provider_catalog').select('status').eq('provider_key', 'steam').maybeSingle();
  if (provider?.status !== 'available') return { url: null, error: 'Steam connections are not currently available' };
  const state = randomBytes(32).toString('base64url');
  const callback = `${APP_URL}/api/passport/connections/steam/callback?state=${encodeURIComponent(state)}`;
  const { error } = await supabase.from('passport_connection_intents').insert({ user_id: userId, provider_key: 'steam', state_hash: sha256(state), requested_scopes: STEAM_SCOPES, return_path: safeReturnPath(returnPath), expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
  if (error) return { url: null, error: 'Could not start Steam authorization' };
  const query = new URLSearchParams({ 'openid.ns': 'http://specs.openid.net/auth/2.0', 'openid.mode': 'checkid_setup', 'openid.return_to': callback, 'openid.realm': APP_URL, 'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select', 'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select' });
  return { url: `${STEAM_OPENID_ENDPOINT}?${query.toString()}`, error: null };
}

async function verifySteamOpenId(searchParams: URLSearchParams, expectedReturnTo: string) {
  if (searchParams.get('openid.op_endpoint') !== 'https://steamcommunity.com/openid/login') return null;
  if (searchParams.get('openid.mode') !== 'id_res') return null;
  if (searchParams.get('openid.return_to') !== expectedReturnTo) return null;
  const claimedId = searchParams.get('openid.claimed_id') ?? '';
  const steamId = claimedId.match(STEAM_CLAIMED_ID)?.[1];
  if (!steamId || searchParams.get('openid.identity') !== claimedId) return null;
  const verification = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) if (key.startsWith('openid.')) verification.set(key, value);
  verification.set('openid.mode', 'check_authentication');
  const response = await fetch(STEAM_OPENID_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: verification, cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  if (!response.ok || !(await response.text()).split(/\r?\n/).includes('is_valid:true')) return null;
  return steamId;
}

async function steamAccountLabel(steamId: string) {
  const apiKey = process.env.STEAM_WEB_API_KEY?.trim();
  if (!apiKey) return { label: `Steam ${steamId.slice(-6)}`, url: `https://steamcommunity.com/profiles/${steamId}` };
  try {
    const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
    url.search = new URLSearchParams({ key: apiKey, steamids: steamId, format: 'json' }).toString();
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    const payload = response.ok ? await response.json() as { response?: { players?: Array<{ personaname?: string; profileurl?: string }> } } : null;
    const player = payload?.response?.players?.[0];
    return { label: player?.personaname?.slice(0, 100) || `Steam ${steamId.slice(-6)}`, url: player?.profileurl?.startsWith('https://steamcommunity.com/') ? player.profileurl : `https://steamcommunity.com/profiles/${steamId}` };
  } catch { return { label: `Steam ${steamId.slice(-6)}`, url: `https://steamcommunity.com/profiles/${steamId}` }; }
}

export async function completeSteamConnection(userId: string, state: string, searchParams: URLSearchParams) {
  const supabase = createServiceClient(); const stateHash = sha256(state);
  const { data: intent } = await supabase.from('passport_connection_intents').select('id, user_id, return_path, expires_at, consumed_at, requested_scopes').eq('state_hash', stateHash).eq('provider_key', 'steam').maybeSingle();
  if (!intent || intent.user_id !== userId || intent.consumed_at || new Date(intent.expires_at).getTime() <= Date.now()) return { returnPath: '/passport/connections', error: 'Steam authorization expired or was already used' };
  const expectedReturnTo = `${APP_URL}/api/passport/connections/steam/callback?state=${encodeURIComponent(state)}`;
  const steamId = await verifySteamOpenId(searchParams, expectedReturnTo).catch(() => null);
  if (!steamId) return { returnPath: safeReturnPath(intent.return_path), error: 'Steam could not verify account ownership' };
  const consumed = await supabase.from('passport_connection_intents').update({ consumed_at: new Date().toISOString() }).eq('id', intent.id).is('consumed_at', null).select('id').maybeSingle();
  if (!consumed.data) return { returnPath: safeReturnPath(intent.return_path), error: 'Steam authorization was already completed' };
  const account = await steamAccountLabel(steamId);
  const { error } = await supabase.from('passport_provider_connections').upsert({ user_id: userId, provider_key: 'steam', provider_account_id: steamId, account_label: account.label, account_url: account.url, status: 'connected', granted_scopes: intent.requested_scopes, consent_version: CONNECTION_CONSENT_VERSION, consented_at: new Date().toISOString(), revoked_at: null, encrypted_access_token: null, encrypted_refresh_token: null, last_error_code: null, last_error_message: null, provider_metadata: { authentication: 'steam_openid', ownership_verified_at: new Date().toISOString() } }, { onConflict: 'user_id,provider_key' });
  if (error?.code === '23505') return { returnPath: safeReturnPath(intent.return_path), error: 'That Steam account is already connected to another Mechi account' };
  if (error) return { returnPath: safeReturnPath(intent.return_path), error: 'Could not save the Steam connection' };
  return { returnPath: safeReturnPath(intent.return_path), error: null };
}

type SteamGame = { appid: number; name?: string; playtime_forever?: number; playtime_2weeks?: number; img_icon_url?: string; rtime_last_played?: number };
export async function syncSteamConnection(userId: string, idempotencyKey: string = randomUUID()) {
  const supabase = createServiceClient();
  const { data: connection } = await supabase.from('passport_provider_connections').select('id, provider_account_id, status, last_sync_started_at').eq('user_id', userId).eq('provider_key', 'steam').maybeSingle();
  if (!connection || connection.status === 'revoked') return { ok: false, status: 404, error: 'Active Steam connection not found' };
  if (connection.last_sync_started_at && Date.now() - new Date(connection.last_sync_started_at).getTime() < 60_000 && connection.status === 'syncing') return { ok: false, status: 409, error: 'A Steam sync is already running' };
  const apiKey = process.env.STEAM_WEB_API_KEY?.trim();
  if (!apiKey) return { ok: false, status: 503, error: 'Steam library sync is not configured yet' };
  const runKey = idempotencyKey.trim().slice(0, 100) || randomUUID();
  const { data: run, error: runError } = await supabase.from('passport_provider_sync_runs').insert({ connection_id: connection.id, idempotency_key: runKey }).select('id').maybeSingle();
  if (runError?.code === '23505') return { ok: true, status: 200, error: null, replayed: true };
  if (!run) return { ok: false, status: 500, error: 'Could not start Steam sync' };
  const startedAt = new Date().toISOString();
  await supabase.from('passport_provider_connections').update({ status: 'syncing', last_sync_status: 'running', last_sync_started_at: startedAt, last_error_code: null, last_error_message: null }).eq('id', connection.id);
  try {
    const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/');
    url.search = new URLSearchParams({ key: apiKey, steamid: connection.provider_account_id, format: 'json', include_appinfo: 'true', include_played_free_games: 'true' }).toString();
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`steam_http_${response.status}`);
    const body = await response.json() as { response?: { game_count?: number; games?: SteamGame[] } };
    if (!Array.isArray(body.response?.games)) throw new Error('steam_library_unavailable');
    const games = body.response.games.slice(0, 5000);
    const { data: existingRows } = await supabase.from('passport_external_items').select('id, provider_item_id, payload_hash, import_state, matched_catalog_game_id, passport_game_entry_id, imported_at, hidden_at, conflict_details').eq('connection_id', connection.id).eq('provider_item_type', 'game');
    const existing = new Map((existingRows ?? []).map((row) => [String(row.provider_item_id), row]));
    const now = new Date().toISOString(); let changed = 0; let staged = 0;
    const rows = games.map((game) => { const providerItemId = String(game.appid); const payload = { appid: game.appid, name: game.name ?? `Steam App ${game.appid}`, playtime_forever: game.playtime_forever ?? 0, playtime_2weeks: game.playtime_2weeks ?? 0, img_icon_url: game.img_icon_url ?? '', rtime_last_played: game.rtime_last_played ?? 0 }; const hash = sha256(stablePayload(payload)); const before = existing.get(providerItemId); if (!before) staged += 1; else if (before.payload_hash !== hash) changed += 1; return { connection_id: connection.id, provider_item_type: 'game', provider_item_id: providerItemId, title: payload.name.slice(0, 160), payload, payload_hash: hash, remote_updated_at: payload.rtime_last_played ? new Date(payload.rtime_last_played * 1000).toISOString() : null, last_seen_at: now, import_state: before?.import_state ?? 'staged', matched_catalog_game_id: before?.matched_catalog_game_id ?? null, passport_game_entry_id: before?.passport_game_entry_id ?? null, conflict_details: before?.conflict_details ?? {}, imported_at: before?.imported_at ?? null, hidden_at: before?.hidden_at ?? null } });
    for (let index = 0; index < rows.length; index += 500) { const { error } = await supabase.from('passport_external_items').upsert(rows.slice(index, index + 500), { onConflict: 'connection_id,provider_item_type,provider_item_id' }); if (error) throw new Error('steam_stage_failed'); }
    const currentIds = new Set(games.map((game) => String(game.appid))); const removedRows = (existingRows ?? []).filter((row) => !currentIds.has(String(row.provider_item_id)));
    for (let index = 0; index < removedRows.length; index += 200) { const ids = removedRows.slice(index, index + 200).map((row) => row.id); await supabase.from('passport_external_items').update({ import_state: 'remote_removed' }).in('id', ids); }
    await Promise.all([
      supabase.from('passport_provider_sync_runs').update({ status: 'success', fetched_count: games.length, staged_count: staged, changed_count: changed, removed_count: removedRows.length, completed_at: now }).eq('id', run.id),
      supabase.from('passport_provider_connections').update({ status: 'connected', last_sync_status: 'success', last_synced_at: now, last_error_code: null, last_error_message: null }).eq('id', connection.id),
    ]);
    return { ok: true, status: 200, error: null, replayed: false, fetched: games.length, staged, changed, removed: removedRows.length };
  } catch (error) {
    const code = error instanceof Error ? error.message : 'steam_sync_failed'; const message = code === 'steam_library_unavailable' ? 'Steam library details are private or unavailable' : 'Steam sync is temporarily unavailable'; const now = new Date().toISOString();
    await Promise.all([supabase.from('passport_provider_sync_runs').update({ status: 'error', error_code: code.slice(0, 80), error_message: message, completed_at: now }).eq('id', run.id), supabase.from('passport_provider_connections').update({ status: 'error', last_sync_status: 'error', last_error_code: code.slice(0, 80), last_error_message: message }).eq('id', connection.id)]);
    return { ok: false, status: 502, error: message };
  }
}

export async function reviewPassportExternalItem(userId: string, itemId: string, action: 'accept' | 'hide' | 'restore', visibility: 'public' | 'friends' | 'private' = 'private') {
  const supabase = createServiceClient();
  const { data: item } = await supabase.from('passport_external_items').select('id, provider_item_type, provider_item_id, title, payload, import_state, connection:passport_provider_connections!inner(id, user_id, provider_key, status)').eq('id', itemId).eq('connection.user_id', userId).maybeSingle();
  const connection = relation(item?.connection as { id: string; user_id: string; provider_key: string; status: string } | Array<{ id: string; user_id: string; provider_key: string; status: string }> | null);
  if (!item || !connection || connection.user_id !== userId) return { ok: false, status: 404, error: 'Imported item not found' };
  if (action === 'hide') { await Promise.all([supabase.from('passport_external_items').update({ import_state: 'hidden', hidden_at: new Date().toISOString() }).eq('id', item.id), supabase.from('passport_import_events').insert({ user_id: userId, external_item_id: item.id, action: 'hidden' })]); return { ok: true, status: 200, error: null }; }
  if (action === 'restore') { await Promise.all([supabase.from('passport_external_items').update({ import_state: 'staged', hidden_at: null }).eq('id', item.id), supabase.from('passport_import_events').insert({ user_id: userId, external_item_id: item.id, action: 'restored' })]); return { ok: true, status: 200, error: null }; }
  if (connection.status === 'revoked') return { ok: false, status: 409, error: 'Reconnect the provider before importing' };
  if (connection.provider_key !== 'steam' || item.provider_item_type !== 'game') return { ok: false, status: 400, error: 'This imported item type is not supported yet' };
  const payload = item.payload as Record<string, unknown>; const hours = Math.round((Number(payload.playtime_forever ?? 0) / 60) * 10) / 10;
  let { data: catalog } = await supabase.from('passport_game_catalog').select('id').eq('provider', 'steam').eq('provider_id', item.provider_item_id).maybeSingle();
  if (!catalog) { const inserted = await supabase.from('passport_game_catalog').insert({ slug: `steam-app-${item.provider_item_id}`, title: item.title.slice(0, 120), platforms: ['pc'], genres: [], modes: [], provider: 'steam', provider_id: item.provider_item_id, provider_url: `https://store.steampowered.com/app/${item.provider_item_id}/`, provider_attribution: 'Data provided by Steam', resolution_status: 'approved', metadata: { source: 'steam_owned_games', imported_at: new Date().toISOString() } }).select('id').maybeSingle(); catalog = inserted.data; }
  if (!catalog) return { ok: false, status: 500, error: 'Could not resolve the game catalogue entry' };
  const { data: existing } = await supabase.from('passport_game_entries').select('id, source_type, hours_played, short_review, rating, is_favorite, is_featured, screenshot_url').eq('user_id', userId).eq('catalog_game_id', catalog.id).eq('platform', 'pc').maybeSingle();
  const now = new Date().toISOString(); let entryId: string; let eventAction: 'accepted' | 'merged'; let conflictDetails: Record<string, unknown> = {};
  if (existing) { entryId = String(existing.id); eventAction = 'merged'; const currentHours = Number(existing.hours_played ?? 0); if (hours > currentHours) await supabase.from('passport_game_entries').update({ hours_played: hours }).eq('id', existing.id).eq('user_id', userId); conflictDetails = { manual_fields_preserved: ['play_status', 'short_review', 'rating', 'favorite', 'featured', 'visibility', 'screenshots'], hours_policy: 'maximum_recorded', previous_hours: currentHours, provider_hours: hours }; }
  else { const inserted = await supabase.from('passport_game_entries').insert({ user_id: userId, catalog_game_id: catalog.id, platform: 'pc', play_status: hours > 0 ? 'playing' : 'backlog', hours_played: hours, visibility, source_type: 'platform_synced', source_key: `steam:${item.provider_item_id}` }).select('id').maybeSingle(); if (!inserted.data) return { ok: false, status: 500, error: 'Could not add the Steam game to your Passport' }; entryId = String(inserted.data.id); eventAction = 'accepted'; }
  await Promise.all([
    supabase.from('passport_external_items').update({ import_state: 'imported', matched_catalog_game_id: catalog.id, passport_game_entry_id: entryId, conflict_details: conflictDetails, imported_at: now, hidden_at: null }).eq('id', item.id),
    supabase.from('passport_import_events').insert({ user_id: userId, external_item_id: item.id, action: eventAction, details: conflictDetails }),
    supabase.from('passport_ecosystem_events').upsert({ event_key: `game.imported:${item.id}:${entryId}`, user_id: userId, event_type: 'game.imported', payload: { provider: 'steam', provider_item_id: item.provider_item_id, passport_game_entry_id: entryId } }, { onConflict: 'event_key' }),
  ]);
  await syncPassportLibrarySummary(userId);
  return { ok: true, status: 200, error: null, gameEntryId: entryId };
}

export async function disconnectPassportProvider(userId: string, providerKey: PassportProviderKey, eraseProviderData: boolean) {
  const supabase = createServiceClient(); const { data: connection } = await supabase.from('passport_provider_connections').select('id').eq('user_id', userId).eq('provider_key', providerKey).maybeSingle(); if (!connection) return { ok: false, error: 'Connection not found' };
  if (!eraseProviderData) { const { data } = await supabase.from('passport_provider_connections').update({ status: 'revoked', revoked_at: new Date().toISOString(), encrypted_access_token: null, encrypted_refresh_token: null, last_sync_status: 'never' }).eq('id', connection.id).select('id').maybeSingle(); return { ok: Boolean(data), error: data ? null : 'Could not disconnect provider' }; }
  const { data: items } = await supabase.from('passport_external_items').select('id, passport_game_entry_id').eq('connection_id', connection.id).not('passport_game_entry_id', 'is', null);
  for (const item of items ?? []) { if (!item.passport_game_entry_id) continue; const { data: entry } = await supabase.from('passport_game_entries').select('id, source_type, short_review, rating, is_favorite, is_featured, screenshot_url').eq('id', item.passport_game_entry_id).eq('user_id', userId).maybeSingle(); if (!entry) continue; const enriched = Boolean(entry.short_review || entry.rating || entry.is_favorite || entry.is_featured || entry.screenshot_url); if (entry.source_type === 'platform_synced' && !enriched) await supabase.from('passport_game_entries').delete().eq('id', entry.id).eq('user_id', userId); else if (entry.source_type === 'platform_synced') await supabase.from('passport_game_entries').update({ source_type: 'manual', source_key: null }).eq('id', entry.id).eq('user_id', userId); }
  const { data } = await supabase.from('passport_provider_connections').delete().eq('id', connection.id).eq('user_id', userId).select('id').maybeSingle(); await syncPassportLibrarySummary(userId); return { ok: Boolean(data), error: data ? null : 'Could not erase provider data' };
}
