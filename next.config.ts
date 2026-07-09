import type { NextConfig } from "next";

/**
 * Standard security headers for every response. CSP is intentionally not set
 * here — add it once all inline-script usage is inventoried.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Client router cache: revisiting a page within the window skips the
    // server round-trip entirely (back/forward + repeat navigation instant).
    // Page data itself stays fresh via ISR revalidation + WP webhook.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dev-mmf-wp.pantheonsite.io",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
