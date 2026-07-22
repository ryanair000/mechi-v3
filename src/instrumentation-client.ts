import * as Sentry from "@sentry/nextjs";
import { getPostHogBrowserClient } from "@/lib/posthog";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";
const sampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0);
const replaySessionSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE ?? 0);
const replayErrorSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE ?? 0);

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() ||
    process.env.NODE_ENV,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  tracesSampleRate: Number.isFinite(sampleRate) ? sampleRate : 0,
  replaysSessionSampleRate: Number.isFinite(replaySessionSampleRate) ? replaySessionSampleRate : 0,
  replaysOnErrorSampleRate: Number.isFinite(replayErrorSampleRate) ? replayErrorSampleRate : 0,
  tunnel: "/api/monitoring",
});

void getPostHogBrowserClient();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
