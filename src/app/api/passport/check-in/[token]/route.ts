import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { redeemPassportCheckin } from '@/lib/passport-resume';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const fingerprint = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const result = await redeemPassportCheckin((await params).token, access.profile.id, fingerprint);
  const statuses: Record<string, number> = { accepted: 200, replayed: 409, expired: 410, transferred: 403, revoked: 410, invalid: 404 };
  return NextResponse.json({ outcome: result.outcome, credential_id: result.credentialId, error: result.error }, { status: statuses[result.outcome] ?? 400 });
}
