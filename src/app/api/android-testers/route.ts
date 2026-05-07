import { after, NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { isMissingTableError } from '@/lib/db-compat';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';
import { sendAndroidTesterRegistrationTelegramNotification } from '@/lib/telegram';

const MAX_TEXT_LENGTH = 500;
const TARGET_TRACK = 'closed';

type TesterBody = {
  fullName?: unknown;
  playEmail?: unknown;
  whatsappNumber?: unknown;
  deviceModel?: unknown;
  androidVersion?: unknown;
  notes?: unknown;
  canStayOptedIn?: unknown;
};

function normalizeField(value: unknown, maxLength = 160) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeEmail(value: unknown) {
  return normalizeField(value, 160).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireActiveAccessProfile(request);
    if (access.response) {
      return access.response;
    }

    const player = access.profile;
    const rateLimit = await checkPersistentRateLimit(
      `android-testers:${getClientIp(request)}`,
      4,
      60 * 60 * 1000
    );

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = (await request.json()) as TesterBody;
    const playEmail = normalizeEmail(body.playEmail);
    const fullName = normalizeField(body.fullName, 80) || player.username;
    const whatsappNumber =
      normalizeField(body.whatsappNumber, 40) || normalizeField(player.phone, 40);
    const deviceModel = normalizeField(body.deviceModel, 100) || 'Not requested';
    const androidVersion = normalizeField(body.androidVersion, 40) || null;
    const notes = normalizeField(body.notes, MAX_TEXT_LENGTH) || null;
    const acceptedRequirements =
      typeof body.canStayOptedIn === 'undefined' ? true : body.canStayOptedIn === true;

    if (!playEmail) {
      return jsonError('Google Play account email is required.', 400);
    }

    if (!isValidEmail(playEmail)) {
      return jsonError('Enter a valid Google Play account email.', 400);
    }

    if (!acceptedRequirements) {
      return jsonError('Confirm that you can use this account for Mechi v4.0.1 early access.', 400);
    }

    const supabase = createServiceClient();
    const submittedAt = new Date().toISOString();
    const { data: existing, error: existingError } = await supabase
      .from('android_tester_signups')
      .select('id,status,mechi_username')
      .eq('play_email_normalized', playEmail)
      .maybeSingle();

    if (existingError) {
      if (isMissingTableError(existingError, 'android_tester_signups')) {
        return jsonError('Android early access is not connected yet. Please try again later.', 503);
      }

      console.error('[AndroidTesters] Lookup error:', existingError);
      return jsonError('Could not check early access status.', 500);
    }

    if (existing?.mechi_username && existing.mechi_username !== player.username) {
      return jsonError('That Play Store email is already on the Mechi v4.0.1 early access list.', 409);
    }

    const { data: existingPlayer, error: existingPlayerError } = await supabase
      .from('android_tester_signups')
      .select('id,status,play_email_normalized')
      .eq('mechi_username', player.username)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingPlayerError) {
      if (isMissingTableError(existingPlayerError, 'android_tester_signups')) {
        return jsonError('Android early access is not connected yet. Please try again later.', 503);
      }

      console.error('[AndroidTesters] Player lookup error:', existingPlayerError);
      return jsonError('Could not check your early access status.', 500);
    }

    const values = {
      full_name: fullName,
      play_email: playEmail,
      play_email_normalized: playEmail,
      whatsapp_number: whatsappNumber,
      mechi_username: player.username,
      device_model: deviceModel,
      android_version: androidVersion,
      country: 'Kenya',
      target_track: TARGET_TRACK,
      wants_updates: true,
      accepted_requirements: acceptedRequirements,
      notes,
      source: 'mechi.club/android-testers',
      updated_at: submittedAt,
    };
    const existingSignupId = existing?.id ?? existingPlayer?.id ?? null;
    const existingSignupStatus = existing?.status ?? existingPlayer?.status ?? 'pending';

    if (existingSignupId) {
      const { error: updateError } = await supabase
        .from('android_tester_signups')
        .update(values)
        .eq('id', existingSignupId);

      if (updateError) {
        console.error('[AndroidTesters] Update error:', updateError);
        return jsonError('Could not update your early access details.', 500);
      }

      after(async () => {
        try {
          await sendAndroidTesterRegistrationTelegramNotification({
            action: 'updated',
            fullName,
            playEmail,
            whatsappNumber,
            mechiUsername: player.username,
            deviceModel,
            androidVersion,
            status: existingSignupStatus,
          });
        } catch (telegramError) {
          console.error('[Telegram] Android tester update notification error:', telegramError);
        }
      });

      return NextResponse.json(
        {
          ok: true,
          status: existingSignupStatus,
          username: player.username,
          message:
            'Your Google Play account was updated. Use this same account when the Play Store invite lands.',
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { error: insertError } = await supabase.from('android_tester_signups').insert({
      ...values,
      status: 'pending',
      created_at: submittedAt,
    });

    if (insertError) {
      if (isMissingTableError(insertError, 'android_tester_signups')) {
        return jsonError('Android early access is not connected yet. Please try again later.', 503);
      }

      console.error('[AndroidTesters] Insert error:', insertError);
      return jsonError('Could not save your early access details.', 500);
    }

    after(async () => {
      try {
        await sendAndroidTesterRegistrationTelegramNotification({
          action: 'registered',
          fullName,
          playEmail,
          whatsappNumber,
          mechiUsername: player.username,
          deviceModel,
          androidVersion,
          status: 'pending',
        });
      } catch (telegramError) {
        console.error('[Telegram] Android tester registration notification error:', telegramError);
      }
    });

    return NextResponse.json(
      {
        ok: true,
        status: 'pending',
        username: player.username,
        message:
          'You are on the Mechi v4.0.1 Android tester list. We will add this Google account to the Play Store invite list.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[AndroidTesters] Unexpected error:', error);
    return jsonError('Internal server error.', 500);
  }
}
