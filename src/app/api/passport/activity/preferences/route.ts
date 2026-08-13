import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { getPassportActivityPreferences, updatePassportActivityPreferences } from '@/lib/passport-community';
import type { PassportActivityPreferences } from '@/lib/passport-community-types';

const KEYS: Array<keyof PassportActivityPreferences> = ['share_game_completions', 'share_achievements', 'share_matches', 'share_events', 'share_teams', 'notify_reactions', 'notify_circle_updates'];
export async function GET(request: NextRequest) { const access = await requireActiveAccessProfile(request); if (access.response) return access.response; return NextResponse.json({ preferences: await getPassportActivityPreferences(access.profile.id) }); }
export async function PATCH(request: NextRequest) { const access = await requireActiveAccessProfile(request); if (access.response) return access.response; const body = await request.json().catch(() => ({})) as Record<string, unknown>; const current = await getPassportActivityPreferences(access.profile.id); const next = { ...current }; for (const key of KEYS) if (key in body) next[key] = body[key] === true; const result = await updatePassportActivityPreferences(access.profile.id, next); return NextResponse.json(result.ok ? { preferences: next } : { error: result.error }, { status: result.ok ? 200 : 500 }); }
