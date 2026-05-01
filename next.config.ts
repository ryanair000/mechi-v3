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
  normalizeConfiguredHost(process.env.NEXT_PUBLIC_ADMIN_URL) ??
  "mechi.lokimax.top";

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
const isDev = process.env.NODE_ENV !== "production";

const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  [
    "img-src 'self' data: blob:",
    "https://cdn.cloudflare.steamstatic.com",
    "https://res.cloudinary.com",
    "https://shared.cloudflare.steamstatic.com",
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
    "https://image.mux.com",
    "https://*.mux.com",
  ].join(" "),
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.resend.com",
    "https://api.paystack.co",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
    "https://*.mux.com",
  ].join(" "),
  "media-src 'self' blob: https://stream.mux.com https://*.mux.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  ...(distDir ? { distDir } : {}),
  poweredByHeader: false,
  allowedDevOrigins: localDevOrigins,
  typescript: {
    tsconfigPath: isProductionBuild ? "tsconfig.build.json" : "tsconfig.json",
  },
  images: {
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
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        ...localActionOrigins,
        "mechi-v3.vercel.app",
        "mechi.club",
      ],
    },
  },
  async redirects() {
    return [
      {
        source:
          "/:path((?!$|admin(?:/|$)|users(?:/|$)|matches(?:/|$)|support(?:/|$)|whatsapp(?:/|$)|instagram(?:/|$)|logs(?:/|$)|rewards(?:/|$)|dashboard(?:/|$)|login(?:/|$)|register(?:/|$)|forgot-password(?:/|$)|reset-password(?:/|$)|banned(?:/|$)|api(?:/|$)|_next(?:/|$)|favicon|icon|robots|sitemap).*)",
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
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

export default nextConfig;
