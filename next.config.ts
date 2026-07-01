import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  reactStrictMode: true,
  // Primary security headers are set with a per-request nonce in src/middleware.ts.
  // This is a static fallback for responses middleware doesn't touch.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
