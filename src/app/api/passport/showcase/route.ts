import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportProgression, getPassportShowcaseSources, removePassportShowcaseItem, savePassportShowcaseItem } from '@/lib/passport-progression';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const [progression, sources] = await Promise.all([getPassportProgression(access.profile.id), getPassportShowcaseSources(access.profile.id)]);
  return NextResponse.json({ showcase: progression.showcase, limit: progression.customization.showcase_limit, sources });
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const result = await savePassportShowcaseItem(access.profile.id, { slot: Number(body.slot), sourceType: String(body.source_type ?? ''), sourceId: String(body.source_id ?? ''), label: String(body.label ?? ''), visibility: String(body.visibility ?? 'public') });
  return NextResponse.json(result.ok ? { success: true } : { error: result.error }, { status: result.ok ? 201 : 400 });
}

export async function DELETE(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const removed = await removePassportShowcaseItem(access.profile.id, String(body.id ?? ''));
  return NextResponse.json(removed ? { success: true } : { error: 'Showcase item not found' }, { status: removed ? 200 : 404 });
}
