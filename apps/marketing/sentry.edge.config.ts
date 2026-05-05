import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";
const sampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0);

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE?.trim() || process.env.VERCEL_GIT_COMMIT_SHA?.trim(),
  tracesSampleRate: Number.isFinite(sampleRate) ? sampleRate : 0,
});
