import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { GAMES, PLATFORMS } from '@/lib/config';
import { isMissingColumnError } from '@/lib/db-compat';
import { isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { createServiceClient } from '@/lib/supabase';
import { canUseSelectedGames, maybeExpireProfilePlan, resolvePlan } from '@/lib/subscription';

const PLATFORM_KEYS = new Set(Object.keys(PLATFORMS));
const GAME_KEYS = new Set(Object.keys(GAMES));

function withProfileDefaults(profile: Record<string, unknown>) {
  return {
    ...profile,
    whatsapp_notifications:
      (profile.whatsapp_notifications as boolean | undefined) ??
      Boolean(profile.whatsapp_number as string | null | undefined),
    xp: (profile.xp as number | undefined) ?? 0,
    level: (profile.level as number | undefined) ?? 1,
    mp: (profile.mp as number | undefined) ?? 0,
    win_streak: (profile.win_streak as number | undefined) ?? 0,
    max_win_streak: (profile.max_win_streak as number | undefined) ?? 0,
    plan: (profile.plan as string | undefined) ?? 'free',
    plan_since: (profile.plan_since as string | null | undefined) ?? null,
    plan_expires_at: (profile.plan_expires_at as string | null | undefined) ?? null,
  };
}

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

    return NextResponse.json({ profile: withProfileDefaults(safeProfile as Record<string, unknown>) });
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
      whatsapp_number,
      whatsapp_notifications,
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
    let nextWhatsappNotifications =
      (currentProfile.whatsapp_notifications as boolean | undefined) ??
      Boolean(currentProfile.whatsapp_number);
    let nextWhatsappNumber =
      typeof currentProfile.whatsapp_number === 'string' &&
      currentProfile.whatsapp_number.trim().length > 0
        ? normalizePhoneNumber(currentProfile.whatsapp_number)
        : null;

    if (platforms !== undefined) {
      if (!Array.isArray(platforms)) {
        return NextResponse.json({ error: 'Platforms must be an array' }, { status: 400 });
      }
      if (!platforms.every((platform) => typeof platform === 'string' && PLATFORM_KEYS.has(platform))) {
        return NextResponse.json({ error: 'Platforms list contains invalid values' }, { status: 400 });
      }
      updateData.platforms = platforms;
    }
    if (game_ids !== undefined) {
      if (typeof game_ids !== 'object' || game_ids === null || Array.isArray(game_ids)) {
        return NextResponse.json({ error: 'Game IDs must be an object' }, { status: 400 });
      }
      const gameIdEntries = Object.entries(game_ids as Record<string, unknown>);
      for (const [key, value] of gameIdEntries) {
        if (typeof key !== 'string' || key.length === 0 || key.length > 120) {
          return NextResponse.json({ error: 'Game IDs contain an invalid key' }, { status: 400 });
        }
        if (typeof value !== 'string' || value.trim().length === 0 || value.length > 120) {
          return NextResponse.json({ error: 'Game IDs contain an invalid value' }, { status: 400 });
        }
      }
      updateData.game_ids = game_ids;
    }
    if (selected_games !== undefined) {
      if (!Array.isArray(selected_games)) {
        return NextResponse.json({ error: 'Selected games must be an array' }, { status: 400 });
      }
      if (!selected_games.every((game) => typeof game === 'string' && GAME_KEYS.has(game))) {
        return NextResponse.json({ error: 'Selected games contain invalid values' }, { status: 400 });
      }
      if (new Set(selected_games).size !== selected_games.length) {
        return NextResponse.json({ error: 'Selected games cannot contain duplicates' }, { status: 400 });
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
    if (whatsapp_notifications !== undefined) {
      if (typeof whatsapp_notifications !== 'boolean') {
        return NextResponse.json(
          { error: 'WhatsApp notifications must be true or false' },
          { status: 400 }
        );
      }
      nextWhatsappNotifications = whatsapp_notifications;
      updateData.whatsapp_notifications = whatsapp_notifications;
    }
    if (whatsapp_number !== undefined) {
      if (
        whatsapp_number !== null &&
        (typeof whatsapp_number !== 'string' || whatsapp_number.trim().length === 0)
      ) {
        return NextResponse.json({ error: 'WhatsApp number must be a string or null' }, { status: 400 });
      }
      nextWhatsappNumber =
        typeof whatsapp_number === 'string' ? normalizePhoneNumber(whatsapp_number.trim()) : null;

      if (nextWhatsappNumber && !isValidPhoneNumber(nextWhatsappNumber)) {
        return NextResponse.json({ error: 'Enter a valid WhatsApp number' }, { status: 400 });
      }

      updateData.whatsapp_number = nextWhatsappNumber;
    }

    if (nextWhatsappNotifications) {
      if (!nextWhatsappNumber) {
        const fallbackPhone =
          typeof currentProfile.phone === 'string' ? normalizePhoneNumber(currentProfile.phone) : '';
        if (!isValidPhoneNumber(fallbackPhone)) {
          return NextResponse.json(
            { error: 'Add a valid WhatsApp number before turning alerts on' },
            { status: 400 }
          );
        }

        nextWhatsappNumber = fallbackPhone;
        updateData.whatsapp_number = nextWhatsappNumber;
      } else if (!isValidPhoneNumber(nextWhatsappNumber)) {
        return NextResponse.json({ error: 'Enter a valid WhatsApp number' }, { status: 400 });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    let updateResult = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', authUser.sub)
      .select()
      .single();

    if (updateResult.error && isMissingColumnError(updateResult.error, 'profiles.whatsapp_notifications')) {
      const legacyUpdateData = { ...updateData };
      delete legacyUpdateData.whatsapp_notifications;

      if (whatsapp_notifications !== undefined) {
        legacyUpdateData.whatsapp_number = nextWhatsappNotifications ? nextWhatsappNumber : null;
      }

      updateResult = await supabase
        .from('profiles')
        .update(legacyUpdateData)
        .eq('id', authUser.sub)
        .select()
        .single();
    }

    const profile = updateResult.data;
    const error = updateResult.error;

    if (error || !profile) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _hash2, ...safeProfile2 } = profile;

    return NextResponse.json({ profile: withProfileDefaults(safeProfile2 as Record<string, unknown>) });
  } catch (err) {
    console.error('[Profile PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
