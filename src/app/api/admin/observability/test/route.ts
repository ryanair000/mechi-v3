import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { hasAdminAccess, getRequestAccessProfile } from '@/lib/access';
import { getObservabilitySettings } from '@/lib/observability-settings';
import { capturePostHogServerEvent } from '@/lib/posthog-server';
import { checkPersistentRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const testRateLimit = await checkPersistentRateLimit(
    `admin-observability-test:${admin.id}:${getClientIp(request)}`,
    8,
    15 * 60 * 1000
  );
  if (!testRateLimit.allowed) {
    return rateLimitResponse(testRateLimit.retryAfterSeconds);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const target = typeof body.target === 'string' ? body.target : 'both';
  const requestId = crypto.randomUUID();
  const settings = await getObservabilitySettings();

  const result = {
    requestId,
    sentry: { attempted: false, ok: true, skipped: false as boolean },
    posthog: { attempted: false, ok: true, skipped: false as boolean, error: null as string | null },
  };

  if (target === 'sentry' || target === 'both') {
    result.sentry.attempted = true;
    if (!settings.sentry_capture_enabled) {
      result.sentry.skipped = true;
    } else {
      Sentry.captureMessage('Mechi observability admin test', {
        level: 'info',
        tags: {
          surface: 'admin_observability',
          request_id: requestId,
        },
        user: {
          id: admin.id,
          username: admin.username,
        },
        extra: {
          source: 'admin_observability_test',
        },
      });
      await Sentry.flush(2000);
    }
  }

  if (target === 'posthog' || target === 'both') {
    result.posthog.attempted = true;
    if (!settings.posthog_capture_enabled) {
      result.posthog.skipped = true;
    } else {
      const capture = await capturePostHogServerEvent({
        distinctId: admin.id,
        event: 'admin_observability_test',
        properties: {
          request_id: requestId,
          role: admin.role,
        },
      });
      result.posthog.ok = capture.ok;
      result.posthog.skipped = Boolean(capture.skipped);
      result.posthog.error = capture.error ?? null;
    }
  }

  return NextResponse.json(result);
}
