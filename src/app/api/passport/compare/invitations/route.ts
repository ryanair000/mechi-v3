import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createComparisonInvitation } from '@/lib/passport-social';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const result = await createComparisonInvitation(access.profile.id, String(body.target_id ?? ''), typeof body.campaign === 'string' ? body.campaign : undefined);
  return NextResponse.json(result.data ? result.data : { error: result.error }, { status: result.status });
}
