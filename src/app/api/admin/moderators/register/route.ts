import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess, requireActiveAccessProfile, type AccessProfile } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import { applyAuthCookie, createSessionForProfile, hashPassword } from '@/lib/auth';
import { DEFAULT_RATING } from '@/lib/config';
import { generateUniqueInviteCode } from '@/lib/invite';
import {
  getModeratorTournamentByKey,
  isModeratorTournamentKey,
  type ModeratorTournamentKey,
} from '@/lib/moderator-tournaments';
import { getPhoneLookupVariants, isValidPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { isUsernameTaken } from '@/lib/username-availability';
import { validateUsername } from '@/lib/username';
import type { CountryKey, UserRole } from '@/types';

const DEFAULT_COUNTRY: CountryKey = 'kenya';
const DEFAULT_REGION = 'Other';
const MIN_PASSWORD_LENGTH = 9;

type CreateStaffAccountOptions = {
  auditAdminId?: string;
  body: Record<string, unknown>;
  issueSession?: boolean;
  moderatorTournamentKey: ModeratorTournamentKey;
  request: NextRequest;
  role: Extract<UserRole, 'moderator' | 'admin'>;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readStaffRole(value: unknown): Extract<UserRole, 'moderator' | 'admin'> | null {
  return value === 'moderator' || value === 'admin' ? value : null;
}

function readModeratorTournamentKey(value: unknown): ModeratorTournamentKey | null {
  return isModeratorTournamentKey(value) ? value : null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getModeratorTournamentProfilePatch(
  profile: Record<string, unknown>,
  tournamentKey: ModeratorTournamentKey
) {
  const tournament = getModeratorTournamentByKey(tournamentKey);
  const currentGameIds = readRecord(profile.game_ids);
  const currentSelectedGames = readStringArray(profile.selected_games);
  const nextSelectedGames = Array.from(new Set([...currentSelectedGames, tournament.game]));

  return {
    game_ids: {
      ...currentGameIds,
      moderator_tournament_key: tournamentKey,
    },
    selected_games: nextSelectedGames,
  };
}

async function registerCurrentUserAsModerator(
  request: NextRequest,
  accessProfile: AccessProfile,
  tournamentKey: ModeratorTournamentKey
) {
  const rateLimit = await checkPersistentRateLimit(
    `moderator-self-register:${accessProfile.id}:${getClientIp(request)}`,
    5,
    60 * 60 * 1000
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const shouldUpdateRole = accessProfile.role !== 'moderator' && accessProfile.role !== 'admin';

  const { data: currentProfile, error: profileReadError } = await supabase
    .from('profiles')
    .select()
    .eq('id', accessProfile.id)
    .single();

  if (profileReadError || !currentProfile) {
    console.error('[ModeratorSelfRegister] Profile read error:', profileReadError);
    return NextResponse.json({ error: 'Could not activate moderator access' }, { status: 500 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      ...(shouldUpdateRole
        ? {
            role: 'moderator',
            plan: 'pro',
            plan_since: now,
            plan_expires_at: null,
          }
        : {}),
      ...getModeratorTournamentProfilePatch(
        currentProfile as Record<string, unknown>,
        tournamentKey
      ),
    })
    .eq('id', accessProfile.id)
    .select()
    .single();

  if (error || !profile) {
    console.error('[ModeratorSelfRegister] Profile update error:', error);
    return NextResponse.json({ error: 'Could not activate moderator access' }, { status: 500 });
  }

  if (shouldUpdateRole) {
    await writeAuditLog({
      adminId: accessProfile.id,
      action: 'system_note',
      targetType: 'user',
      targetId: accessProfile.id,
      details: {
        action: 'self_register_moderator',
        username: accessProfile.username,
        moderator_tournament_key: tournamentKey,
      },
      ipAddress: getClientIp(request),
    });
  }

  const { token, user } = createSessionForProfile(profile as Record<string, unknown>);
  const response = NextResponse.json({
    staff: {
      id: profile.id,
      username: profile.username,
      phone: profile.phone,
      email: profile.email,
      role: profile.role,
      moderator_tournament_key: tournamentKey,
      created_at: profile.created_at,
    },
    token,
    user,
  });
  applyAuthCookie(response, token);
  return response;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const moderatorTournamentKey = readModeratorTournamentKey(
    body.moderator_tournament_key ?? body.tournament_key ?? body.tournament
  );

  if (!moderatorTournamentKey) {
    return NextResponse.json({ error: 'Choose the tournament this moderator will handle' }, { status: 400 });
  }

  if (body.mode === 'public') {
    const rateLimit = await checkPersistentRateLimit(
      `public-moderator-register:${getClientIp(request)}`,
      5,
      60 * 60 * 1000
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    return createStaffAccount({
      body,
      issueSession: true,
      moderatorTournamentKey,
      request,
      role: 'moderator',
    });
  }

  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  if (!hasAdminAccess(access.profile)) {
    return registerCurrentUserAsModerator(request, access.profile, moderatorTournamentKey);
  }

  const rateLimit = await checkPersistentRateLimit(
    `admin-moderator-register:${access.profile.id}:${getClientIp(request)}`,
    8,
    60 * 60 * 1000
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  return createStaffAccount({
    auditAdminId: access.profile.id,
    body,
    moderatorTournamentKey,
    request,
    role: readStaffRole(body.role) ?? 'moderator',
  });
}

async function createStaffAccount({
  auditAdminId,
  body,
  issueSession = false,
  moderatorTournamentKey,
  request,
  role,
}: CreateStaffAccountOptions) {
  try {
    const { username, error: usernameError } = validateUsername(body.username);
    const email = String(body.email ?? '').trim().toLowerCase();
    const rawPhone = String(body.phone ?? '').trim();
    const password = String(body.password ?? '');

    if (usernameError || !rawPhone || !email || !password) {
      return NextResponse.json({ error: usernameError ?? 'Missing required fields' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be more than 8 characters' },
        { status: 400 }
      );
    }

    if (!isValidPhoneNumber(rawPhone, DEFAULT_COUNTRY)) {
      return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
    }

    if (await isUsernameTaken(username)) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const normalizedPhone = normalizePhoneNumber(rawPhone, DEFAULT_COUNTRY);
    const supabase = createServiceClient();
    const phoneVariants = getPhoneLookupVariants(normalizedPhone, DEFAULT_COUNTRY);
    const [{ data: phoneMatches, error: phoneError }, { data: emailMatches, error: emailError }] =
      await Promise.all([
        supabase.from('profiles').select('id').in('phone', phoneVariants).limit(1),
        supabase.from('profiles').select('id').ilike('email', email).limit(1),
      ]);

    if (phoneError || emailError) {
      return NextResponse.json({ error: 'Could not verify staff account details' }, { status: 500 });
    }

    if (phoneMatches?.length) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 });
    }

    if (emailMatches?.length) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const ownInviteCode = await generateUniqueInviteCode(supabase, username);
    const now = new Date().toISOString();
    const tournamentGame = getModeratorTournamentByKey(moderatorTournamentKey).game;
    const sessionProfileDefaults = {
      country: DEFAULT_COUNTRY,
      region: DEFAULT_REGION,
      invite_code: ownInviteCode,
      plan: 'pro',
      plan_since: now,
      plan_expires_at: null,
      platforms: [],
      game_ids: {
        moderator_tournament_key: moderatorTournamentKey,
      },
      selected_games: [tournamentGame],
      whatsapp_number: normalizedPhone,
      whatsapp_notifications: true,
    };
    const { data: profile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        username,
        phone: normalizedPhone,
        email,
        invite_code: ownInviteCode,
        password_hash: passwordHash,
        country: sessionProfileDefaults.country,
        region: sessionProfileDefaults.region,
        role,
        plan: sessionProfileDefaults.plan,
        plan_since: sessionProfileDefaults.plan_since,
        plan_expires_at: sessionProfileDefaults.plan_expires_at,
        platforms: sessionProfileDefaults.platforms,
        game_ids: sessionProfileDefaults.game_ids,
        selected_games: sessionProfileDefaults.selected_games,
        whatsapp_number: sessionProfileDefaults.whatsapp_number,
        whatsapp_notifications: sessionProfileDefaults.whatsapp_notifications,
        rating_efootball: DEFAULT_RATING,
        rating_fc26: DEFAULT_RATING,
        rating_mk11: DEFAULT_RATING,
        rating_nba2k26: DEFAULT_RATING,
        rating_tekken8: DEFAULT_RATING,
        rating_sf6: DEFAULT_RATING,
        wins_efootball: 0,
        wins_fc26: 0,
        wins_mk11: 0,
        wins_nba2k26: 0,
        wins_tekken8: 0,
        wins_sf6: 0,
        losses_efootball: 0,
        losses_fc26: 0,
        losses_mk11: 0,
        losses_nba2k26: 0,
        losses_tekken8: 0,
        losses_sf6: 0,
      })
      .select('id, username, phone, email, role, created_at')
      .single();

    if (insertError || !profile) {
      const isConflict = insertError?.code === '23505';
      return NextResponse.json(
        { error: isConflict ? 'Staff account already exists' : 'Could not create staff account' },
        { status: isConflict ? 409 : 500 }
      );
    }

    const auditActorId = auditAdminId ?? (issueSession ? String(profile.id) : null);
    if (auditActorId) {
      await writeAuditLog({
        adminId: auditActorId,
        action: 'system_note',
        targetType: 'user',
        targetId: String(profile.id),
        details: {
          action: auditAdminId ? 'create_staff_account' : 'public_moderator_signup',
          username,
          role,
          moderator_tournament_key: moderatorTournamentKey,
        },
        ipAddress: getClientIp(request),
      });
    }

    const staff = {
      ...profile,
      moderator_tournament_key: moderatorTournamentKey,
    };

    if (issueSession) {
      const sessionProfile = {
        ...staff,
        ...sessionProfileDefaults,
      };
      const { token, user } = createSessionForProfile(sessionProfile as Record<string, unknown>);
      const response = NextResponse.json({ staff, token, user });
      applyAuthCookie(response, token);
      return response;
    }

    return NextResponse.json({
      staff,
    });
  } catch (error) {
    console.error('[AdminModeratorRegister] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
