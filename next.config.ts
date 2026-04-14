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
        pathname: "/steam/apps/**",
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
};

export default nextConfig;
