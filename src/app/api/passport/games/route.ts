import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { parsePassportGameEntryInput } from '@/lib/passport-game-input';
import { createPassportGameEntry, getPassportGameLibraryByUserId } from '@/lib/passport-games';
import type { PassportGameEntryInput } from '@/lib/passport-game-types';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const library = await getPassportGameLibraryByUserId(access.profile.id, 'owner');
  return NextResponse.json({ library }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = parsePassportGameEntryInput(body);
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = await createPassportGameEntry(access.profile.id, parsed.data as PassportGameEntryInput);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ entry: result.entry }, { status: 201 });
}
