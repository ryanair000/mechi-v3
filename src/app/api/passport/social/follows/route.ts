import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { mutatePassportFollow } from '@/lib/passport-social';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? '');
  if (!['follow', 'unfollow'].includes(action)) return NextResponse.json({ error: 'Invalid follow action' }, { status: 400 });
  const result = await mutatePassportFollow(access.profile.id, String(body.target_id ?? ''), action === 'follow');
  return NextResponse.json(result.ok ? { success: true, state: result.state } : { error: result.error }, { status: result.ok ? 200 : result.status });
}
