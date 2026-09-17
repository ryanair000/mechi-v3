import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { setPassportPublication } from '@/lib/passport';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Publication request must be an object' }, { status: 400 });
  }

  const candidate = body as Record<string, unknown>;
  if (candidate.action !== 'publish' && candidate.action !== 'unpublish') {
    return NextResponse.json({ error: 'Action must be publish or unpublish' }, { status: 400 });
  }
  if (candidate.action === 'publish' && candidate.confirmed !== true) {
    return NextResponse.json(
      { error: 'Explicit confirmation is required to publish a Gamer Passport' },
      { status: 400 }
    );
  }

  const result = await setPassportPublication(access.profile.id, candidate.action, {
    confirmed: candidate.confirmed === true,
    requestId: request.headers.get('x-request-id'),
  });
  if (!result.storageReady) {
    return NextResponse.json({ error: result.error, storage_ready: false }, { status: 503 });
  }
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? 'Could not change publication' }, { status: 400 });
  }
  return NextResponse.json({ passport: result.data });
}
