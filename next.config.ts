import type { NextConfig } from "next";

const localDevOrigins = [
  "localhost",
  "127.0.0.1",
];

const localActionOrigins = [
  "localhost:3000",
  "127.0.0.1:3000",
];

const distDir = process.env.MECHI_NEXT_DIST_DIR;

const nextConfig: NextConfig = {
  ...(distDir ? { distDir } : {}),
  allowedDevOrigins: localDevOrigins,
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
        "localhost:3002",
        "127.0.0.1:3002",
        "mechi-v3.vercel.app",
        "mechi.club",
      ],
    },
  },
  async redirects() {
    return [
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://cdn.cloudflare.steamstatic.com https://res.cloudinary.com https://shared.cloudflare.steamstatic.com https://www.google-analytics.com https://region1.google-analytics.com",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api.paystack.co https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com",
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

export default nextConfig;
