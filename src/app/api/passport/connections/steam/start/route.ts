import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createSteamConnectionIntent } from '@/lib/passport-connections';
import { getPassportFeatureAccess } from '@/lib/passport-rollout';

export async function GET(request: NextRequest) { const access = await requireActiveAccessProfile(request); if (access.response) return access.response; const rollout = getPassportFeatureAccess('connections', access.profile.id); if (!rollout.enabled) return NextResponse.redirect(new URL(`/passport/connections?connection_error=${encodeURIComponent(rollout.reason ?? 'Connections are not available')}`, request.url)); const result = await createSteamConnectionIntent(access.profile.id, request.nextUrl.searchParams.get('return')); if (!result.url) return NextResponse.redirect(new URL(`/passport/connections?connection_error=${encodeURIComponent(result.error ?? 'Could not connect Steam')}`, request.url)); return NextResponse.redirect(result.url); }
