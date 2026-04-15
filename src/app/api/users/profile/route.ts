import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { canUseSelectedGames, maybeExpireProfilePlan, resolvePlan } from '@/lib/subscription';

export async function GET(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.sub)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _hash, ...safeProfileRaw } = profile;
    const resolvedPlan = await maybeExpireProfilePlan(
      {
        id: profile.id as string,
        plan: profile.plan as string | null | undefined,
        plan_expires_at: profile.plan_expires_at as string | null | undefined,
      },
      supabase
    );
    const safeProfile =
      resolvedPlan === profile.plan
        ? safeProfileRaw
        : {
            ...safeProfileRaw,
            plan: resolvedPlan,
            plan_since: null,
            plan_expires_at: null,
          };

    return NextResponse.json({ profile: safeProfile });
  } catch (err) {
    console.error('[Profile GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      platforms,
      game_ids,
      selected_games,
      region,
      avatar_url,
      cover_url,
    } = body;

    const updateData: Record<string, unknown> = {};
    const supabase = createServiceClient();
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.sub)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const resolvedPlan = await maybeExpireProfilePlan(
      {
        id: currentProfile.id as string,
        plan: currentProfile.plan as string | null | undefined,
        plan_expires_at: currentProfile.plan_expires_at as string | null | undefined,
      },
      supabase
    );

    if (platforms !== undefined) {
      if (!Array.isArray(platforms)) {
        return NextResponse.json({ error: 'Platforms must be an array' }, { status: 400 });
      }
      updateData.platforms = platforms;
    }
    if (game_ids !== undefined) {
      if (typeof game_ids !== 'object' || game_ids === null || Array.isArray(game_ids)) {
        return NextResponse.json({ error: 'Game IDs must be an object' }, { status: 400 });
      }
      updateData.game_ids = game_ids;
    }
    if (selected_games !== undefined) {
      if (!Array.isArray(selected_games)) {
        return NextResponse.json({ error: 'Selected games must be an array' }, { status: 400 });
      }
      if (!canUseSelectedGames(resolvedPlan, selected_games.length)) {
        return NextResponse.json(
          {
            error:
              resolvedPlan === 'free'
                ? 'Free accounts can save 1 selected game. Upgrade to unlock 3.'
                : 'This plan cannot save that many games.',
            limit_reached: true,
            plan: resolvePlan(resolvedPlan),
            upgrade_url: '/pricing',
          },
          { status: 400 }
        );
      }
      updateData.selected_games = selected_games;
    }
    if (region !== undefined) {
      if (typeof region !== 'string' || region.trim().length === 0) {
        return NextResponse.json({ error: 'Region is required' }, { status: 400 });
      }
      updateData.region = region.trim();
    }
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (cover_url !== undefined) updateData.cover_url = cover_url;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', authUser.sub)
      .select()
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _hash2, ...safeProfile2 } = profile;

    return NextResponse.json({ profile: safeProfile2 });
  } catch (err) {
    console.error('[Profile PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
