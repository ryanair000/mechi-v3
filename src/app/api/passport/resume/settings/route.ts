import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { updatePassportCvSettings } from '@/lib/passport-resume';
import type { PassportCvSettings } from '@/lib/passport-resume-types';

export async function PATCH(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const selectedGames = Array.isArray(body.selected_games) ? body.selected_games.filter((item): item is string => typeof item === 'string').slice(0, 8) : [];
  const inquiryEnabled = Boolean(body.inquiry_enabled);
  const inquiryUrl = inquiryEnabled && typeof body.inquiry_url === 'string' && /^https:\/\//.test(body.inquiry_url) ? body.inquiry_url.slice(0, 500) : null;
  if (inquiryEnabled && !inquiryUrl) return NextResponse.json({ error: 'Inquiry link must use HTTPS' }, { status: 400 });
  const settings: PassportCvSettings = {
    selected_games: selectedGames,
    include_events: body.include_events !== false,
    include_teams: body.include_teams !== false,
    include_achievements: body.include_achievements !== false,
    inquiry_enabled: inquiryEnabled,
    inquiry_url: inquiryUrl,
    headline: typeof body.headline === 'string' ? body.headline.trim().slice(0, 120) : '',
  };
  const result = await updatePassportCvSettings(access.profile.id, settings);
  return NextResponse.json(result.ok ? { success: true, settings } : { error: result.error }, { status: result.ok ? 200 : 400 });
}
