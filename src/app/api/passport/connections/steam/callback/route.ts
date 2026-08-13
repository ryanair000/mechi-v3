import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { completeSteamConnection } from '@/lib/passport-connections';
import { APP_URL } from '@/lib/urls';
import { getPassportFeatureAccess } from '@/lib/passport-rollout';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return NextResponse.redirect(`${APP_URL}/login?next=${encodeURIComponent('/passport/connections')}`);

  const rollout = getPassportFeatureAccess('connections', access.profile.id);
  if (!rollout.enabled) {
    const destination = new URL('/passport/connections', APP_URL);
    destination.searchParams.set('connection_error', rollout.reason ?? 'Connections are not available');
    return NextResponse.redirect(destination);
  }

  const state = request.nextUrl.searchParams.get('state') ?? '';
  const result = await completeSteamConnection(access.profile.id, state, request.nextUrl.searchParams);
  const destination = new URL(result.returnPath, APP_URL);
  if (result.error) destination.searchParams.set('connection_error', result.error);
  else destination.searchParams.set('connected', 'steam');
  return NextResponse.redirect(destination);
}
