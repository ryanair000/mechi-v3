import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import {
  POSTHOG_API_HOST,
  POSTHOG_ENABLED,
  POSTHOG_UI_HOST,
} from "@/lib/posthog";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";
const sampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0);
const postHogCaptureInDev = process.env.NEXT_PUBLIC_POSTHOG_CAPTURE_IN_DEV === "true";

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() ||
    process.env.NODE_ENV,
  tracesSampleRate: Number.isFinite(sampleRate) ? sampleRate : 0,
  tunnel: "/api/monitoring",
});

if (POSTHOG_ENABLED) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
    api_host: POSTHOG_API_HOST,
    ui_host: POSTHOG_UI_HOST,
    defaults: "2026-01-30",
    capture_pageview: false,
    person_profiles: "identified_only",
    loaded: (client) => {
      if (process.env.NODE_ENV !== "production" && !postHogCaptureInDev) {
        client.opt_out_capturing();
      }
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
