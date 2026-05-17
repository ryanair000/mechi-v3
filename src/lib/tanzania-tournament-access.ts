import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasModeratorAccess, requireActiveAccessProfile, type AccessProfile } from '@/lib/access';
import { readModeratorTournamentKeyFromGameIds } from '@/lib/moderator-tournaments';
import { createServiceClient } from '@/lib/supabase';

export type TanzaniaTournamentAccess =
  | {
      profile: AccessProfile;
      response: null;
      isAdmin: boolean;
    }
  | {
      profile: null;
      response: NextResponse;
      isAdmin: false;
    };

export async function requireTanzaniaTournamentModeratorAccess(
  request: NextRequest
): Promise<TanzaniaTournamentAccess> {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return { profile: null, response: access.response, isAdmin: false };
  }

  if (!hasModeratorAccess(access.profile)) {
    return {
      profile: null,
      response: NextResponse.json({ error: 'Moderator access required' }, { status: 403 }),
      isAdmin: false,
    };
  }

  if (access.profile.role === 'admin') {
    return { profile: access.profile, response: null, isAdmin: true };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('game_ids')
    .eq('id', access.profile.id)
    .maybeSingle();

  if (error) {
    console.error('[TanzaniaTournamentAccess] Could not load assignment:', error);
    return {
      profile: null,
      response: NextResponse.json({ error: 'Could not load moderator assignment' }, { status: 500 }),
      isAdmin: false,
    };
  }

  const key = readModeratorTournamentKeyFromGameIds((data as { game_ids?: unknown } | null)?.game_ids);
  if (key !== 'days_esports_tz_efootball') {
    return {
      profile: null,
      response: NextResponse.json({ error: 'Days Esports Tanzania access required' }, { status: 403 }),
      isAdmin: false,
    };
  }

  return { profile: access.profile, response: null, isAdmin: false };
}
