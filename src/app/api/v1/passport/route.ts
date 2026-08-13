import { NextRequest, NextResponse } from 'next/server';
import { authenticatePassportDeveloperToken, getAuthorizedPassportApiDto, recordPassportDeveloperApiEvent } from '@/lib/passport-ecosystem';
import { getPassportFeatureAccess } from '@/lib/passport-rollout';

export async function GET(request: NextRequest) {
  const globalRollout = getPassportFeatureAccess('developer_api');
  if (!globalRollout.configured) return NextResponse.json({ error: globalRollout.reason, code: 'rollout_disabled' }, { status: 503, headers: { 'Retry-After': '300' } });
  const authorization = request.headers.get('authorization') ?? ''; const rawToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const fingerprint = `${request.headers.get('x-forwarded-for') ?? 'unknown'}:${request.headers.get('user-agent') ?? 'unknown'}`;
  const auth = await authenticatePassportDeveloperToken(rawToken, 'v1.passport.read', fingerprint); if (!auth.token) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const rollout = getPassportFeatureAccess('developer_api', auth.token.userId); if (!rollout.enabled) { await recordPassportDeveloperApiEvent(auth.token.eventId, 503); return NextResponse.json({ error: rollout.reason, code: 'rollout_disabled' }, { status: 503, headers: { 'Retry-After': '300' } }); }
  if (!auth.token.scopes.some((scope) => scope.startsWith('passport.'))) { await recordPassportDeveloperApiEvent(auth.token.eventId, 403); return NextResponse.json({ error: 'Token has no Passport read scope' }, { status: 403 }); }
  try {
    const dto = await getAuthorizedPassportApiDto(auth.token.userId, auth.token.scopes); const status = dto ? 200 : 404;
    await recordPassportDeveloperApiEvent(auth.token.eventId, status);
    return NextResponse.json(dto ?? { error: 'Gamer Passport not found' }, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Mechi-API-Version': '2026-08-13' } });
  } catch (error) {
    await recordPassportDeveloperApiEvent(auth.token.eventId, 500);
    console.error('Passport developer API failed', error);
    return NextResponse.json({ error: 'Passport API temporarily unavailable' }, { status: 500 });
  }
}
