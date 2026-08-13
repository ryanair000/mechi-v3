import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { recommendPassportGame } from '@/lib/passport-social';

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const result = await recommendPassportGame(access.profile.id, String(body.recipient_id ?? ''), String(body.catalog_game_id ?? ''), String(body.message ?? ''), typeof body.comparison_key === 'string' ? body.comparison_key : undefined);
  return NextResponse.json(result.ok ? { success: true } : { error: result.error }, { status: result.ok ? 201 : result.status });
}
