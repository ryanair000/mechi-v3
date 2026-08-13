import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { requestPassportCatalogGame } from '@/lib/passport-games';
import type { PlatformKey } from '@/types';

const PLATFORMS = ['ps', 'xbox', 'nintendo', 'mobile', 'pc'];

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const platform = typeof body.platform === 'string' && PLATFORMS.includes(body.platform)
    ? body.platform as PlatformKey
    : null;
  if (title.length < 2 || title.length > 120) {
    return NextResponse.json({ error: 'Game title must be 2 to 120 characters' }, { status: 400 });
  }
  if (notes.length > 500) {
    return NextResponse.json({ error: 'Notes must be 500 characters or fewer' }, { status: 400 });
  }
  const result = await requestPassportCatalogGame(access.profile.id, title, platform, notes);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id: result.id }, { status: 201 });
}
