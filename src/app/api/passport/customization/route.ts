import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportProgression, updatePassportCustomization } from '@/lib/passport-progression';

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  return NextResponse.json({ progression: await getPassportProgression(access.profile.id) });
}

export async function PATCH(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const result = await updatePassportCustomization(access.profile.id, { themeKey: String(body.theme_key ?? ''), avatarFrameKey: String(body.avatar_frame_key ?? ''), cardStyleKey: String(body.card_style_key ?? ''), showDimensions: body.show_dimensions !== false, showLevel: body.show_level !== false });
  return NextResponse.json(result.ok ? { success: true } : { error: result.error }, { status: result.ok ? 200 : 400 });
}
