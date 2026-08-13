import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { mutatePassportBlock } from '@/lib/passport-social';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? '');
  if (!['block', 'unblock'].includes(action)) return NextResponse.json({ error: 'Invalid block action' }, { status: 400 });
  const result = await mutatePassportBlock(access.profile.id, String(body.target_id ?? ''), action === 'block', typeof body.reason === 'string' ? body.reason : undefined);
  return NextResponse.json(result.ok ? { success: true, state: result.state } : { error: result.error }, { status: result.ok ? 200 : result.status });
}
