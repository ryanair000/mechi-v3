import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  getProfileAgePolicy,
  setSelfDeclaredAgePolicy,
} from '@/lib/passport-age-policy';

const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  return NextResponse.json(
    { age_policy: await getProfileAgePolicy(access.profile.id) },
    { headers: PRIVATE_HEADERS }
  );
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || body.confirmed !== true) {
    return NextResponse.json(
      { error: 'Confirm the age-group privacy selection' },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }
  if (body.status !== 'minor' && body.status !== 'adult') {
    return NextResponse.json(
      { error: 'Choose under 18 or 18 and older' },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  const result = await setSelfDeclaredAgePolicy(access.profile.id, body.status);
  if (!result.storageReady) {
    return NextResponse.json(
      { error: result.error, storage_ready: false },
      { status: 503, headers: PRIVATE_HEADERS }
    );
  }
  if (result.error || !result.policy) {
    return NextResponse.json(
      { error: result.error ?? 'Could not update age-group privacy' },
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  return NextResponse.json(
    { age_policy: result.policy },
    { headers: PRIVATE_HEADERS }
  );
}
