import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { isMissingTableError } from '@/lib/db-compat';
import { createServiceClient } from '@/lib/supabase';

const VALID_PLATFORMS = new Set(['android', 'ios', 'web']);

function readOptionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function readPushToken(value: unknown): string | null {
  const token = readOptionalString(value, 512);
  if (!token) {
    return null;
  }

  if (!token.startsWith('ExpoPushToken[') && !token.startsWith('ExponentPushToken[')) {
    return null;
  }

  return token;
}

export async function POST(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = await request.json();
    const token = readPushToken(body?.token);

    if (!token) {
      return NextResponse.json({ error: 'A valid Expo push token is required' }, { status: 400 });
    }

    const platform = readOptionalString(body?.platform, 24) ?? 'android';
    if (!VALID_PLATFORMS.has(platform)) {
      return NextResponse.json({ error: 'Unsupported push token platform' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const supabase = createServiceClient();
    const { error } = await supabase.from('notification_push_tokens').upsert(
      {
        user_id: access.profile.id,
        expo_push_token: token,
        platform,
        device_name: readOptionalString(body?.device_name, 160),
        app_version: readOptionalString(body?.app_version, 40),
        experience_id: readOptionalString(body?.experience_id, 120),
        disabled_at: null,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: 'expo_push_token' }
    );

    if (error) {
      if (isMissingTableError(error, 'notification_push_tokens')) {
        return NextResponse.json(
          { error: 'Push notification storage has not been migrated yet' },
          { status: 503 }
        );
      }

      console.error('[PushToken POST] Error:', error);
      return NextResponse.json({ error: 'Failed to save push token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PushToken POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = await request.json();
    const token = readPushToken(body?.token);

    if (!token) {
      return NextResponse.json({ error: 'A valid Expo push token is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const supabase = createServiceClient();
    const { error } = await supabase
      .from('notification_push_tokens')
      .update({
        disabled_at: now,
        updated_at: now,
      })
      .eq('user_id', access.profile.id)
      .eq('expo_push_token', token);

    if (error) {
      if (isMissingTableError(error, 'notification_push_tokens')) {
        return NextResponse.json({ success: true });
      }

      console.error('[PushToken DELETE] Error:', error);
      return NextResponse.json({ error: 'Failed to delete push token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PushToken DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
