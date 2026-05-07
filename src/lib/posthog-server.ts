import { PostHog } from 'posthog-node';
import { POSTHOG_ENABLED, POSTHOG_SERVER_HOST, POSTHOG_TOKEN } from '@/lib/posthog';

type CaptureServerEventParams = {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
};

export async function capturePostHogServerEvent({
  distinctId,
  event,
  properties,
}: CaptureServerEventParams) {
  if (!POSTHOG_ENABLED) {
    return { ok: true, skipped: true };
  }

  const posthog = new PostHog(POSTHOG_TOKEN, {
    host: POSTHOG_SERVER_HOST,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    posthog.capture({
      distinctId,
      event,
      properties: {
        app: 'mechi.club',
        ...properties,
      },
    });
    await posthog.shutdown();
    return { ok: true, skipped: false };
  } catch (error) {
    await posthog.shutdown().catch(() => {});
    return {
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : 'PostHog capture failed',
    };
  }
}
