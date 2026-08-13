import { NextRequest, NextResponse } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile } from '@/lib/access';
import { issuePassportCheckinPass, issuePassportEventCredential, projectPassportTournamentCredentials } from '@/lib/passport-resume';
import type { PassportEventStampType } from '@/lib/passport-resume-types';
import { createServiceClient } from '@/lib/supabase';

const STAMPS: PassportEventStampType[] = ['registered', 'checked_in', 'attended', 'competed', 'placement', 'staff', 'organizer', 'streamer'];

async function canManageTournament(actorId: string, tournamentId: string | null, moderator: boolean) {
  if (moderator) return true;
  if (!tournamentId) return false;
  const { data } = await createServiceClient().from('tournaments').select('organizer_id').eq('id', tournamentId).maybeSingle();
  return data?.organizer_id === actorId;
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? '');
  const tournamentId = typeof body.tournament_id === 'string' ? body.tournament_id : null;
  if (!await canManageTournament(access.profile.id, tournamentId, hasModeratorAccess(access.profile))) return NextResponse.json({ error: 'Organizer or moderator access required' }, { status: 403 });
  if (action === 'project_tournament') {
    if (!tournamentId) return NextResponse.json({ error: 'Tournament is required' }, { status: 400 });
    const result = await projectPassportTournamentCredentials(tournamentId, access.profile.id);
    return NextResponse.json(result.error ? { error: result.error } : { projection: result }, { status: result.error ? 500 : 200 });
  }
  if (action === 'issue_checkin_pass') {
    const expiresAt = typeof body.expires_at === 'string' ? body.expires_at : '';
    if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) return NextResponse.json({ error: 'Pass expiry must be in the future' }, { status: 400 });
    const result = await issuePassportCheckinPass({ userId: String(body.user_id ?? ''), eventKey: String(body.event_key ?? ''), eventTitle: String(body.event_title ?? ''), game: typeof body.game === 'string' ? body.game : null, tournamentId, tournamentPlayerId: typeof body.tournament_player_id === 'string' ? body.tournament_player_id : null, issuedBy: access.profile.id, expiresAt });
    return NextResponse.json(result.pass ? { pass: result.pass } : { error: result.error }, { status: result.pass ? 201 : 500 });
  }
  if (action === 'issue_credential') {
    const stampType = String(body.stamp_type ?? '') as PassportEventStampType;
    if (!STAMPS.includes(stampType)) return NextResponse.json({ error: 'Invalid event credential type' }, { status: 400 });
    const placement = stampType === 'placement' ? Number(body.placement) : null;
    if (stampType === 'placement' && (!Number.isInteger(placement) || Number(placement) < 1)) return NextResponse.json({ error: 'Placement must be a positive whole number' }, { status: 400 });
    const roleLabel = typeof body.role_label === 'string' ? body.role_label.trim() : null;
    if (['staff', 'organizer', 'streamer'].includes(stampType) && (!roleLabel || roleLabel.length < 2)) return NextResponse.json({ error: 'Add a role label for this credential' }, { status: 400 });
    const mediaConsent = body.media_consent === true;
    const mediaUrl = typeof body.media_url === 'string' ? body.media_url.trim() : null;
    if (mediaUrl && (!mediaConsent || !mediaUrl.startsWith('https://'))) return NextResponse.json({ error: 'Media requires explicit consent and an HTTPS URL' }, { status: 400 });
    const result = await issuePassportEventCredential({ userId: String(body.user_id ?? ''), eventKey: String(body.event_key ?? ''), eventTitle: String(body.event_title ?? ''), stampType, game: typeof body.game === 'string' ? body.game : null, roleLabel, placement, occurredAt: typeof body.occurred_at === 'string' ? body.occurred_at : new Date().toISOString(), issuedBy: access.profile.id, sourceType: 'organizer_manual', sourceKey: `${tournamentId ?? body.event_key}:${body.user_id}:${stampType}:${randomKey()}`, subjectType: tournamentId ? 'tournament' : 'event', subjectId: tournamentId ?? String(body.event_key ?? ''), tournamentId, publicDetails: { tournament_id: tournamentId }, mediaUrl, mediaConsent });
    return NextResponse.json(result.credential ? { credential: result.credential } : { error: result.error }, { status: result.credential ? 201 : 500 });
  }
  return NextResponse.json({ error: 'Invalid event operation' }, { status: 400 });
}

function randomKey() { return crypto.randomUUID(); }
