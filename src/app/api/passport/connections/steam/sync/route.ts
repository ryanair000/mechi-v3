import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { syncSteamConnection } from '@/lib/passport-connections';
import { getPassportFeatureAccess } from '@/lib/passport-rollout';

export async function POST(request: NextRequest) { const access = await requireActiveAccessProfile(request); if (access.response) return access.response; const rollout = getPassportFeatureAccess('connections', access.profile.id); if (!rollout.enabled) return NextResponse.json({ error: rollout.reason, code: 'rollout_disabled' }, { status: 503, headers: { 'Retry-After': '300' } }); const result = await syncSteamConnection(access.profile.id, request.headers.get('Idempotency-Key') ?? undefined); return NextResponse.json(result.ok ? result : { error: result.error }, { status: result.status }); }
