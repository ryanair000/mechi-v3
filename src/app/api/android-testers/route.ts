import { NextRequest, NextResponse } from 'next/server';
import { isMissingTableError } from '@/lib/db-compat';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase';

const MAX_TEXT_LENGTH = 500;
const TARGET_TRACK = 'closed';

type TesterBody = {
  fullName?: unknown;
  playEmail?: unknown;
  whatsappNumber?: unknown;
  mechiUsername?: unknown;
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

function hasEnoughPhoneDigits(value: string) {
  return value.replace(/\D/g, '').length >= 9;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkPersistentRateLimit(
      `android-testers:${getClientIp(request)}`,
      4,
      60 * 60 * 1000
    );

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const body = (await request.json()) as TesterBody;
    const fullName = normalizeField(body.fullName, 80);
    const playEmail = normalizeEmail(body.playEmail);
    const whatsappNumber = normalizeField(body.whatsappNumber, 40);
    const mechiUsername = normalizeField(body.mechiUsername, 32) || null;
    const deviceModel = normalizeField(body.deviceModel, 100);
    const androidVersion = normalizeField(body.androidVersion, 40) || null;
    const notes = normalizeField(body.notes, MAX_TEXT_LENGTH) || null;
    const acceptedRequirements = body.canStayOptedIn === true;

    if (!fullName || !playEmail || !whatsappNumber || !deviceModel) {
      return jsonError('Name, Google Play email, WhatsApp number, and phone model are required.', 400);
    }

    if (!isValidEmail(playEmail)) {
      return jsonError('Enter a valid Google Play account email.', 400);
    }

    if (!hasEnoughPhoneDigits(whatsappNumber)) {
      return jsonError('Enter a valid WhatsApp number.', 400);
    }

    if (!acceptedRequirements) {
      return jsonError('Confirm that you can use this account for Mechi v4.0.1 early access.', 400);
    }

    const supabase = createServiceClient();
    const submittedAt = new Date().toISOString();
    const { data: existing, error: existingError } = await supabase
      .from('android_tester_signups')
      .select('id,status')
      .eq('play_email_normalized', playEmail)
      .maybeSingle();

    if (existingError) {
      if (isMissingTableError(existingError, 'android_tester_signups')) {
        return jsonError('Android early access is not connected yet. Please try again later.', 503);
      }

      console.error('[AndroidTesters] Lookup error:', existingError);
      return jsonError('Could not check early access status.', 500);
    }

    const values = {
      full_name: fullName,
      play_email: playEmail,
      play_email_normalized: playEmail,
      whatsapp_number: whatsappNumber,
      mechi_username: mechiUsername,
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

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('android_tester_signups')
        .update(values)
        .eq('id', existing.id);

      if (updateError) {
        console.error('[AndroidTesters] Update error:', updateError);
        return jsonError('Could not update your early access details.', 500);
      }

      return NextResponse.json(
        {
          ok: true,
          status: existing.status ?? 'pending',
          message:
            'Your early access details were updated. Use this same Google account when the Play Store invite lands.',
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

    return NextResponse.json(
      {
        ok: true,
        status: 'pending',
        message:
          'You are on the Mechi v4.0.1 Android early access list. We will send the Play Store invite on WhatsApp when your spot is ready.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[AndroidTesters] Unexpected error:', error);
    return jsonError('Internal server error.', 500);
  }
}
