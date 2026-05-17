import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess, getRequestAccessProfile } from '@/lib/access';
import { writeAuditLog } from '@/lib/audit';
import {
  getObservabilitySettings,
  updateObservabilitySettings,
  type ObservabilitySettingsUpdate,
} from '@/lib/observability-settings';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

function cleanNotice(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length < 12 || trimmed.length > 260) {
    return undefined;
  }

  return trimmed;
}

function cleanBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

export async function GET(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getObservabilitySettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updateRateLimit = await checkPersistentRateLimit(
    `admin-observability-settings:${admin.id}:${getClientIp(request)}`,
    12,
    15 * 60 * 1000
  );
  if (!updateRateLimit.allowed) {
    return rateLimitResponse(updateRateLimit.retryAfterSeconds);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const updates: ObservabilitySettingsUpdate = {};
  const posthogCaptureEnabled = cleanBoolean(body.posthog_capture_enabled);
  const sentryCaptureEnabled = cleanBoolean(body.sentry_capture_enabled);
  const sentryReplayOnErrorEnabled = cleanBoolean(body.sentry_replay_on_error_enabled);
  const paymentSupportNotice = cleanNotice(body.payment_support_notice);

  if (posthogCaptureEnabled !== undefined) {
    updates.posthog_capture_enabled = posthogCaptureEnabled;
  }
  if (sentryCaptureEnabled !== undefined) {
    updates.sentry_capture_enabled = sentryCaptureEnabled;
  }
  if (sentryReplayOnErrorEnabled !== undefined) {
    updates.sentry_replay_on_error_enabled = sentryReplayOnErrorEnabled;
  }
  if (paymentSupportNotice !== undefined) {
    updates.payment_support_notice = paymentSupportNotice;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid settings supplied' }, { status: 400 });
  }

  try {
    const settings = await updateObservabilitySettings(updates, admin.id);
    await writeAuditLog({
      adminId: admin.id,
      action: 'system_note',
      targetType: 'system',
      targetId: 'observability_settings',
      details: { updates },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[Admin Observability] Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update observability settings' }, { status: 500 });
  }
}
