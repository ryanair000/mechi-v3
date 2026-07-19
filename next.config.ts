import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

function normalizeConfiguredHost(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

const configuredAdminHost =
  normalizeConfiguredHost(process.env.NEXT_PUBLIC_ADMIN_URL) ?? "mechi.lokimax.top";

const localDevOrigins = Array.from(
  new Set([
    "localhost",
    "127.0.0.1",
    "admin.localhost",
    configuredAdminHost.split(":")[0],
  ])
);

const localActionOrigins = Array.from(
  new Set([
    "localhost:3000",
    "127.0.0.1:3000",
    "admin.localhost:3000",
    "localhost:3002",
    "127.0.0.1:3002",
    "admin.localhost:3002",
    configuredAdminHost,
  ])
);

const distDir = process.env.MECHI_NEXT_DIST_DIR;
const isProductionBuild = process.env.NODE_ENV === "production";
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryProject = process.env.SENTRY_PROJECT?.trim();
const postHogRegion = process.env.NEXT_PUBLIC_POSTHOG_REGION?.trim().toLowerCase() === "eu" ? "eu" : "us";
const postHogProxyPath = normalizePostHogProxyPath(
  process.env.NEXT_PUBLIC_POSTHOG_PROXY_PATH
);
const postHogIngestOrigin =
  postHogRegion === "eu" ? "https://eu.i.posthog.com" : "https://us.i.posthog.com";
const postHogAssetOrigin =
  postHogRegion === "eu"
    ? "https://eu-assets.i.posthog.com"
    : "https://us-assets.i.posthog.com";
const scriptSrc = [
  "script-src 'self'",
  ...(isProductionBuild ? [] : ["'unsafe-eval'"]),
  "'unsafe-inline'",
  "https://www.googletagmanager.com",
  "https://us-assets.i.posthog.com",
  "https://eu-assets.i.posthog.com",
].join(" ");

function normalizePostHogProxyPath(value: string | undefined) {
  const cleaned = value?.trim();
  if (!cleaned) {
    return "/_mhq";
  }

  const path = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return path.replace(/\/+$/, "") || "/_mhq";
}

const nextConfig: NextConfig = {
  ...(distDir ? { distDir } : {}),
  poweredByHeader: false,
  allowedDevOrigins: localDevOrigins,
  typescript: {
    tsconfigPath: isProductionBuild ? "tsconfig.build.json" : "tsconfig.json",
  },
  images: {
    qualities: [75, 94],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "shared.cloudflare.steamstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [...localActionOrigins, "mechi-v3.vercel.app", "mechi.club"],
    },
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/app/player", permanent: true },
      { source: "/dashboard/tournaments", destination: "/app/player/tournaments", permanent: true },
      { source: "/dashboard/challenges", destination: "/app/player/challenges", permanent: true },
      { source: "/dashboard/matches", destination: "/app/player/matches", permanent: true },
      { source: "/dashboard/matches/:path*", destination: "/app/player/matches/:path*", permanent: true },
      { source: "/dashboard/leaderboard", destination: "/app/player/rankings", permanent: true },
      { source: "/dashboard/rewards", destination: "/app/player/wallet", permanent: true },
      { source: "/dashboard/rewards/:path*", destination: "/app/player/wallet", permanent: true },
      { source: "/dashboard/notifications", destination: "/app/player/inbox", permanent: true },
      { source: "/dashboard/profile", destination: "/app/player/profile", permanent: true },
      { source: "/dashboard/game-ids", destination: "/app/player/profile", permanent: true },
      { source: "/dashboard/games", destination: "/app/player/profile", permanent: true },
      { source: "/dashboard/socials", destination: "/app/player/profile", permanent: true },
      { source: "/s/match/:id", destination: "/app/player/matches/:id", permanent: true },
      { source: "/match/:id", destination: "/app/player/matches/:id", permanent: true },
      { source: "/matches", destination: "/app/player/matches", permanent: true },
      { source: "/challenges", destination: "/app/player/challenges", permanent: true },
      { source: "/streams/dashboard", destination: "/app/creator", permanent: true },
      { source: "/tournaments/create", destination: "/app/organizer/tournaments/new", permanent: true },
      { source: "/s/t/:slug", destination: "/tournaments/:slug", permanent: true },
      { source: "/t/:slug/manage", destination: "/app/organizer/tournaments/:slug", permanent: true },
      { source: "/admin", destination: "/app/admin", permanent: true },
      { source: "/admin/:path*", destination: "/app/admin/:path*", permanent: true },
      { source: "/moderators", destination: "/app/admin/moderation", permanent: true },
      { source: "/moderators/:path*", destination: "/app/admin/moderation", permanent: true },
      { source: "/v5", destination: "/", permanent: true },
      { source: "/v5/tournaments", destination: "/tournaments", permanent: true },
      { source: "/v5/:path*", destination: "/", permanent: true },
      {
        source:
          "/:path((?!$|admin(?:/|$)|dashboard(?:/|$)|login(?:/|$)|register(?:/|$)|forgot-password(?:/|$)|reset-password(?:/|$)|banned(?:/|$)|api(?:/|$)|_next(?:/|$)|favicon|icon|robots|sitemap).*)",
        has: [
          {
            type: "host",
            value: "mechi.lokimax.top",
          },
        ],
        destination: "https://mechi.club/:path",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: `${postHogProxyPath}/static/:path*`,
        destination: `${postHogAssetOrigin}/static/:path*`,
      },
      {
        source: `${postHogProxyPath}/array/:path*`,
        destination: `${postHogAssetOrigin}/array/:path*`,
      },
      {
        source: `${postHogProxyPath}/:path*`,
        destination: `${postHogIngestOrigin}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://cdn.cloudflare.steamstatic.com https://res.cloudinary.com https://shared.cloudflare.steamstatic.com https://images.unsplash.com https://commons.wikimedia.org https://upload.wikimedia.org https://fifauteam.com https://drop-assets.ea.com https://www.google-analytics.com https://region1.google-analytics.com https://us.i.posthog.com https://eu.i.posthog.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://us.i.posthog.com https://eu.i.posthog.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/api/og/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: sentryOrg,
  project: sentryProject,
  authToken: sentryAuthToken,
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
    console.warn("[Sentry] Web build integration warning:", error.message);
  },
});
