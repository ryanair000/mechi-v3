import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { issuePassportEventCredential } from '@/lib/passport-resume';
import type { PassportEventStampType } from '@/lib/passport-resume-types';
import { createServiceClient } from '@/lib/supabase';

const PARTNER_SCOPES = ['event_credentials:issue', 'event_credentials:revoke', 'achievements:issue', 'webhooks:receive'];
const STAMPS: PassportEventStampType[] = ['checked_in', 'attended', 'competed', 'placement', 'staff', 'organizer', 'streamer'];
function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }

export async function getPassportPartnerOperations() {
  const supabase = createServiceClient(); const [issuers, requests] = await Promise.all([supabase.from('passport_partner_issuers').select('id, owner_user_id, organization_name, status, allowed_scopes, allowed_event_keys, approved_at, created_at').order('created_at', { ascending: false }), supabase.from('passport_partner_issuance_requests').select('id, partner_issuer_id, subject_user_id, issuance_type, payload, status, created_at, issuer:passport_partner_issuers(organization_name)').order('created_at', { ascending: false }).limit(200)]); return { issuers: issuers.data ?? [], requests: requests.data ?? [] };
}

export async function createApprovedPassportPartner(actorId: string, input: { ownerUserId: string; organizationName: string; scopes: string[]; eventKeys: string[] }) {
  const scopes = [...new Set(input.scopes)].filter((scope) => PARTNER_SCOPES.includes(scope)); if (!scopes.length || scopes.length !== new Set(input.scopes).size) return { issuer: null, error: 'Choose valid partner scopes' };
  const organizationName = input.organizationName.trim().slice(0, 100); if (organizationName.length < 2) return { issuer: null, error: 'Organization name is required' };
  const eventKeys = [...new Set(input.eventKeys.map((key) => key.trim()).filter(Boolean))].slice(0, 100);
  const { data, error } = await createServiceClient().from('passport_partner_issuers').insert({ owner_user_id: input.ownerUserId, organization_name: organizationName, status: 'approved', allowed_scopes: scopes, allowed_event_keys: eventKeys, approved_by: actorId, approved_at: new Date().toISOString() }).select('*').maybeSingle();
  return { issuer: data, error: error ? 'Could not approve partner issuer' : null };
}

export async function createPassportPartnerApiKey(partnerIssuerId: string, label: string, scopes: string[]) {
  const supabase = createServiceClient(); const { data: issuer } = await supabase.from('passport_partner_issuers').select('allowed_scopes, status').eq('id', partnerIssuerId).maybeSingle(); if (!issuer || issuer.status !== 'approved') return { key: null, error: 'Approved partner issuer not found' };
  const granted = [...new Set(scopes)].filter((scope) => (issuer.allowed_scopes ?? []).includes(scope)); if (!granted.length || granted.length !== new Set(scopes).size) return { key: null, error: 'Key scopes exceed the partner approval' };
  const key = `mpk_${randomBytes(32).toString('base64url')}`; const { error } = await supabase.from('passport_partner_api_keys').insert({ partner_issuer_id: partnerIssuerId, label: label.trim().slice(0, 60) || 'Partner key', key_prefix: key.slice(0, 12), key_hash: sha256(key), scopes: granted }); return { key: error ? null : key, error: error ? 'Could not create partner API key' : null };
}

async function authenticatePartnerKey(rawKey: string, requiredScope: string) {
  if (!/^mpk_[A-Za-z0-9_-]{32,}$/.test(rawKey)) return null; const supabase = createServiceClient(); const { data } = await supabase.from('passport_partner_api_keys').select('id, partner_issuer_id, scopes, expires_at, revoked_at, issuer:passport_partner_issuers(id, owner_user_id, organization_name, status, allowed_scopes, allowed_event_keys)').eq('key_hash', sha256(rawKey)).maybeSingle(); const issuer = Array.isArray(data?.issuer) ? data?.issuer[0] : data?.issuer; if (!data || !issuer || issuer.status !== 'approved' || data.revoked_at || (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) || !(data.scopes ?? []).includes(requiredScope) || !(issuer.allowed_scopes ?? []).includes(requiredScope)) return null; await supabase.from('passport_partner_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id); return { keyId: String(data.id), issuerId: String(data.partner_issuer_id), ownerUserId: String(issuer.owner_user_id), organizationName: String(issuer.organization_name), eventKeys: issuer.allowed_event_keys ?? [] };
}

export async function submitPassportPartnerIssuance(rawKey: string, idempotencyKey: string, input: Record<string, unknown>) {
  const issuanceType = String(input.issuance_type ?? ''); const requiredScope = issuanceType === 'event_credential' ? 'event_credentials:issue' : issuanceType === 'achievement' ? 'achievements:issue' : ''; if (!requiredScope) return { request: null, status: 400, error: 'Invalid issuance type' };
  const auth = await authenticatePartnerKey(rawKey, requiredScope); if (!auth) return { request: null, status: 401, error: 'Invalid partner key or scope' };
  const eventKey = String(input.event_key ?? ''); if (issuanceType === 'event_credential' && (!eventKey || !auth.eventKeys.includes(eventKey))) return { request: null, status: 403, error: 'Partner is not approved for this event' };
  const username = String(input.subject_username ?? '').trim().toLowerCase().replace(/^@/, ''); const { data: subject } = await createServiceClient().from('profiles').select('id').ilike('username', username).maybeSingle(); if (!subject) return { request: null, status: 404, error: 'Subject Gamer Passport not found' };
  const safePayload = issuanceType === 'event_credential' ? { event_key: eventKey, event_title: String(input.event_title ?? '').trim().slice(0, 120), stamp_type: String(input.stamp_type ?? ''), game: typeof input.game === 'string' ? input.game : null, role_label: typeof input.role_label === 'string' ? input.role_label.trim().slice(0, 80) : null, placement: input.placement === undefined ? null : Number(input.placement), occurred_at: String(input.occurred_at ?? ''), evidence_reference: String(input.evidence_reference ?? '').trim().slice(0, 200) } : { achievement_key: String(input.achievement_key ?? ''), evidence_reference: String(input.evidence_reference ?? '').trim().slice(0, 200) };
  if (!idempotencyKey.trim()) return { request: null, status: 400, error: 'Idempotency-Key is required' };
  const supabase = createServiceClient(); const { data, error } = await supabase.from('passport_partner_issuance_requests').insert({ partner_issuer_id: auth.issuerId, partner_api_key_id: auth.keyId, idempotency_key: idempotencyKey.trim().slice(0, 100), subject_user_id: subject.id, issuance_type: issuanceType, payload: safePayload }).select('id, status, created_at').maybeSingle();
  if (error?.code === '23505') { const existing = await supabase.from('passport_partner_issuance_requests').select('id, status, created_at').eq('partner_issuer_id', auth.issuerId).eq('idempotency_key', idempotencyKey.trim().slice(0, 100)).maybeSingle(); return { request: existing.data, status: 200, error: null }; }
  return { request: data, status: data ? 202 : 500, error: data ? null : 'Could not stage issuance request' };
}

export async function reviewPassportPartnerIssuance(actorId: string, requestId: string, decision: 'approve' | 'reject', reason?: string) {
  const supabase = createServiceClient(); const { data: request } = await supabase.from('passport_partner_issuance_requests').select('*, issuer:passport_partner_issuers(owner_user_id, organization_name, status, allowed_event_keys)').eq('id', requestId).eq('status', 'pending_review').maybeSingle(); const issuer = Array.isArray(request?.issuer) ? request?.issuer[0] : request?.issuer; if (!request || !issuer) return { ok: false, error: 'Pending issuance request not found' };
  if (decision === 'reject') { const { data } = await supabase.from('passport_partner_issuance_requests').update({ status: 'rejected', reviewed_by: actorId, reviewed_at: new Date().toISOString(), payload: { ...(request.payload ?? {}), review_reason: (reason ?? '').slice(0, 300) } }).eq('id', request.id).eq('status', 'pending_review').select('id').maybeSingle(); return { ok: Boolean(data), error: data ? null : 'Request changed before review' }; }
  if (issuer.status !== 'approved') return { ok: false, error: 'Partner is no longer approved' };
  const payload = request.payload as Record<string, unknown>;
  if (request.issuance_type === 'event_credential') {
    const stamp = String(payload.stamp_type ?? '') as PassportEventStampType; const eventKey = String(payload.event_key ?? ''); const occurredAt = String(payload.occurred_at ?? ''); if (!STAMPS.includes(stamp) || !(issuer.allowed_event_keys ?? []).includes(eventKey) || !String(payload.event_title ?? '').trim() || !Number.isFinite(new Date(occurredAt).getTime())) return { ok: false, error: 'Partner request payload is invalid' };
    const placement = stamp === 'placement' ? Number(payload.placement) : null; if (stamp === 'placement' && (!Number.isInteger(placement) || Number(placement) < 1)) return { ok: false, error: 'Partner placement is invalid' };
    const result = await issuePassportEventCredential({ userId: request.subject_user_id, eventKey, eventTitle: String(payload.event_title), stampType: stamp, game: typeof payload.game === 'string' ? payload.game : null, roleLabel: typeof payload.role_label === 'string' ? payload.role_label : null, placement, occurredAt, issuedBy: issuer.owner_user_id, sourceType: 'approved_partner', sourceKey: `${request.partner_issuer_id}:${request.idempotency_key}`, subjectType: 'event', subjectId: eventKey, publicDetails: { partner_issuer_id: request.partner_issuer_id, partner_organization: issuer.organization_name } });
    if (!result.credential) return { ok: false, error: result.error ?? 'Could not issue credential' };
    await supabase.from('passport_partner_issuance_requests').update({ status: 'issued', issued_credential_id: result.credential.id, reviewed_by: actorId, reviewed_at: new Date().toISOString() }).eq('id', request.id).eq('status', 'pending_review'); return { ok: true, error: null, credentialId: result.credential.id };
  }
  const achievementKey = String(payload.achievement_key ?? ''); const { data: definition } = await supabase.from('passport_achievement_definitions').select('achievement_key, trust_tier').eq('achievement_key', achievementKey).eq('is_active', true).maybeSingle(); if (!definition || definition.trust_tier !== 'organizer_verified') return { ok: false, error: 'Achievement is not approved for partner issuance' };
  const now = new Date().toISOString(); const { error } = await supabase.from('passport_achievement_awards').insert({ user_id: request.subject_user_id, achievement_key: achievementKey, source_type: 'approved_partner', source_key: `${request.partner_issuer_id}:${request.idempotency_key}`, issuer_id: issuer.owner_user_id, last_evaluated_at: now }); if (error?.code === '23505') return { ok: false, error: 'This achievement is already active from another source and cannot be replaced' }; if (error) return { ok: false, error: 'Could not issue partner achievement' };
  await supabase.from('passport_partner_issuance_requests').update({ status: 'issued', reviewed_by: actorId, reviewed_at: now }).eq('id', request.id).eq('status', 'pending_review'); return { ok: true, error: null };
}
