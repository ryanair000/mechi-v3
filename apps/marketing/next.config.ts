import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();

const nextConfig: NextConfig = {
  turbopack: {
    root: fileURLToPath(new URL("./", import.meta.url)),
  },
};

export default withSentryConfig(nextConfig, {
  tunnelRoute: "/api/monitoring",
  sourcemaps: {
    disable: !sentryAuthToken,
  },
  silent: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
  errorHandler(error) {
    console.warn("[Sentry] Marketing build integration warning:", error.message);
  },
});
