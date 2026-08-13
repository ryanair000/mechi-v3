import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import type { PassportDeveloperScope, PassportDeveloperToken } from '@/lib/passport-connections-types';
import { getPassportData } from '@/lib/passport';
import { getVisiblePassportProgression } from '@/lib/passport-progression';
import { sealPassportSecret } from '@/lib/passport-secret-box';
import { createServiceClient } from '@/lib/supabase';

const DEVELOPER_SCOPES: PassportDeveloperScope[] = ['passport.summary:read', 'passport.games:read', 'passport.competition:read', 'passport.events:read', 'passport.achievements:read', 'webhooks:manage'];
const WEBHOOK_EVENTS = ['passport.updated', 'game.imported', 'achievement.issued', 'achievement.revoked', 'event.credential_issued', 'event.credential_revoked'];
function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }

export async function getPassportDeveloperTokens(userId: string): Promise<PassportDeveloperToken[]> {
  const { data } = await createServiceClient().from('passport_developer_tokens').select('id, label, token_prefix, scopes, expires_at, last_used_at, revoked_at, created_at').eq('user_id', userId).order('created_at', { ascending: false });
  return (data ?? []).map((row) => ({ id: String(row.id), label: String(row.label), token_prefix: String(row.token_prefix), scopes: row.scopes ?? [], expires_at: row.expires_at, last_used_at: row.last_used_at, revoked_at: row.revoked_at, created_at: String(row.created_at) }));
}

export async function createPassportDeveloperToken(userId: string, input: { label: string; scopes: string[]; expiresAt?: string | null }) {
  const label = input.label.trim().slice(0, 60); if (label.length < 2) return { token: null, record: null, error: 'Token label must be at least two characters' };
  const scopes = [...new Set(input.scopes)].filter((scope): scope is PassportDeveloperScope => DEVELOPER_SCOPES.includes(scope as PassportDeveloperScope));
  if (!scopes.length || scopes.length !== new Set(input.scopes).size) return { token: null, record: null, error: 'Choose valid API scopes' };
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null; if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) return { token: null, record: null, error: 'Token expiry must be in the future' };
  const token = `mcp_${randomBytes(32).toString('base64url')}`; const tokenPrefix = token.slice(0, 12);
  const { data, error } = await createServiceClient().from('passport_developer_tokens').insert({ user_id: userId, label, token_prefix: tokenPrefix, token_hash: sha256(token), scopes, expires_at: expiresAt?.toISOString() ?? null }).select('id, label, token_prefix, scopes, expires_at, last_used_at, revoked_at, created_at').single();
  if (error) return { token: null, record: null, error: 'Could not create API token' };
  return { token, record: data as PassportDeveloperToken, error: null };
}

export async function revokePassportDeveloperToken(userId: string, tokenId: string) { const { data } = await createServiceClient().from('passport_developer_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', tokenId).eq('user_id', userId).is('revoked_at', null).select('id').maybeSingle(); return Boolean(data); }

export async function authenticatePassportDeveloperToken(rawToken: string, routeKey: string, fingerprint: string) {
  if (!/^mcp_[A-Za-z0-9_-]{32,}$/.test(rawToken)) return { token: null, error: 'Invalid API token', status: 401 };
  const { data, error } = await createServiceClient().rpc('consume_passport_developer_api_request', { p_token_hash: sha256(rawToken), p_route_key: routeKey, p_request_fingerprint: sha256(fingerprint).slice(0, 64) });
  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result || result.outcome === 'invalid') return { token: null, error: 'Invalid or expired API token', status: 401 };
  if (result.outcome === 'rate_limited') return { token: null, error: 'API token rate limit exceeded', status: 429 };
  return { token: { id: String(result.token_id), userId: String(result.user_id), scopes: (result.granted_scopes ?? []) as PassportDeveloperScope[], eventId: Number(result.event_id) }, error: null, status: 200 };
}

export async function recordPassportDeveloperApiEvent(eventId: number, responseStatus: number) {
  await createServiceClient().from('passport_developer_api_events').update({ response_status: responseStatus }).eq('id', eventId).eq('response_status', 102);
}

export async function getAuthorizedPassportApiDto(userId: string, scopes: PassportDeveloperScope[]) {
  const supabase = createServiceClient(); const { data: profile } = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle(); if (!profile) return null;
  const passport = await getPassportData(profile.username, { ownerView: true }); if (!passport) return null;
  const includeAchievements = scopes.includes('passport.achievements:read');
  const progression = includeAchievements ? await getVisiblePassportProgression(userId, userId, true) : null;
  return {
    object: 'gamer_passport', api_version: '2026-08-13', generated_at: new Date().toISOString(), identity: { username: passport.identity.username, display_name: passport.identity.display_name, avatar_url: passport.identity.avatar_url, archetypes: passport.identity.archetypes },
    summary: scopes.includes('passport.summary:read') ? passport.summary : undefined,
    games: scopes.includes('passport.games:read') ? passport.library.entries.map((entry) => ({ title: entry.game.title, platform: entry.platform, play_status: entry.play_status, hours_played: entry.hours_played, source_type: entry.source_type, provider: entry.game.provider, provider_attribution: entry.game.provider_attribution })) : undefined,
    competition: scopes.includes('passport.competition:read') ? passport.summary && { matches: passport.summary.total_matches, wins: passport.summary.total_wins, losses: passport.summary.total_losses, win_rate: passport.summary.win_rate, verified_records: passport.summary.verified_records_count } : undefined,
    events: scopes.includes('passport.events:read') ? passport.events : undefined,
    achievements: includeAchievements ? progression?.achievements.map((achievement) => ({ key: achievement.key, title: achievement.title, rarity: achievement.rarity, trust_tier: achievement.trust_tier, issuer: achievement.issuer, issued_at: achievement.issued_at })) : undefined,
    granted_scopes: scopes,
  };
}

function safeWebhookEndpoint(value: string) {
  try { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password || url.port) return null; const host = url.hostname.toLowerCase(); if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '::1') return null; return url.toString(); } catch { return null; }
}

export async function getPassportWebhookSubscriptions(userId: string) { const { data } = await createServiceClient().from('passport_webhook_subscriptions').select('id, endpoint_url, event_types, status, failure_count, last_success_at, last_failure_at, created_at').eq('user_id', userId).order('created_at', { ascending: false }); return data ?? []; }

export async function createPassportWebhookSubscription(userId: string, input: { developerTokenId: string; endpointUrl: string; eventTypes: string[] }) {
  const endpoint = safeWebhookEndpoint(input.endpointUrl); if (!endpoint) return { secret: null, error: 'Webhook endpoint must be a public HTTPS URL without credentials or a custom port' };
  const eventTypes = [...new Set(input.eventTypes)].filter((event) => WEBHOOK_EVENTS.includes(event)); if (!eventTypes.length || eventTypes.length !== new Set(input.eventTypes).size) return { secret: null, error: 'Choose valid webhook events' };
  const supabase = createServiceClient(); const { data: token } = await supabase.from('passport_developer_tokens').select('id, scopes, revoked_at, expires_at').eq('id', input.developerTokenId).eq('user_id', userId).maybeSingle();
  if (!token || token.revoked_at || (token.expires_at && new Date(token.expires_at).getTime() <= Date.now()) || !(token.scopes ?? []).includes('webhooks:manage')) return { secret: null, error: 'An active token with webhooks:manage is required' };
  const secret = `mwhsec_${randomBytes(32).toString('base64url')}`; const associatedData = `passport-webhook:${userId}:${endpoint}`;
  let encryptedSecret: string; try { encryptedSecret = sealPassportSecret(secret, associatedData); } catch { return { secret: null, error: 'Webhook signing encryption is not configured' }; }
  const { error } = await supabase.from('passport_webhook_subscriptions').insert({ user_id: userId, developer_token_id: token.id, endpoint_url: endpoint, encrypted_signing_secret: encryptedSecret, event_types: eventTypes });
  return error ? { secret: null, error: 'Could not create webhook subscription' } : { secret, error: null };
}

export async function disablePassportWebhookSubscription(userId: string, subscriptionId: string) { const { data } = await createServiceClient().from('passport_webhook_subscriptions').update({ status: 'disabled' }).eq('id', subscriptionId).eq('user_id', userId).select('id').maybeSingle(); return Boolean(data); }
