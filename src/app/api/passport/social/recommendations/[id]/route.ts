import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { respondToPassportRecommendation } from '@/lib/passport-social';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const status = String(body.status ?? '') as 'seen' | 'saved' | 'dismissed';
  if (!['seen', 'saved', 'dismissed'].includes(status)) return NextResponse.json({ error: 'Invalid recommendation action' }, { status: 400 });
  const result = await respondToPassportRecommendation(access.profile.id, (await params).id, status);
  return NextResponse.json(result.ok ? { success: true } : { error: result.error }, { status: result.ok ? 200 : result.status });
}
