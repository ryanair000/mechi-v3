import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { mutatePassportFriendship } from '@/lib/passport-social';

const ACTIONS = ['request', 'accept', 'decline', 'remove'] as const;
export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? '') as (typeof ACTIONS)[number];
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: 'Invalid friendship action' }, { status: 400 });
  const result = await mutatePassportFriendship(access.profile.id, String(body.target_id ?? ''), action);
  return NextResponse.json(result.ok ? { success: true, state: result.state } : { error: result.error }, { status: result.ok ? 200 : result.status });
}
