import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { parsePassportGameEntryInput } from '@/lib/passport-game-input';
import { deletePassportGameEntry, updatePassportGameEntry } from '@/lib/passport-games';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const parsed = parsePassportGameEntryInput(body, { partial: true });
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = await updatePassportGameEntry(access.profile.id, id, parsed.data);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ entry: result.entry });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const { id } = await params;
  const result = await deletePassportGameEntry(access.profile.id, id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true });
}
