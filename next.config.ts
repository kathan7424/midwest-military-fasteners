import type { NextConfig } from "next";

const WP_HOST = new URL(
  process.env.WP_SITE_URL ?? process.env.NEXT_PUBLIC_WP_SITE_URL ?? "https://dev-mmf-wp.pantheonsite.io"
).origin;

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Content Security Policy — production only (dev needs eval for HMR).
 *
 * Allowances beyond 'self':
 * - Stripe Elements: js.stripe.com (script + iframes), api/r.stripe.com
 *   (tokenization + telemetry), hooks.stripe.com (3DS iframes),
 *   *.stripe.com images (card brand icons).
 * - WordPress host: images/media served directly from WP uploads.
 * - 'unsafe-inline' script/style: required by the Next.js app-router runtime
 *   and Tailwind inline styles; script injection is still constrained by
 *   default-src/object-src/base-uri and the WP-content escaping in the app.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${WP_HOST} https://*.stripe.com`,
  "font-src 'self' data:",
  `connect-src 'self' https://api.stripe.com https://r.stripe.com https://js.stripe.com ${WP_HOST}`,
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

/** Standard security headers for every response. */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // payment=(self ...) required for Stripe wallet payments (Apple Pay / Google Pay).
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(IS_DEV ? [] : [{ key: "Content-Security-Policy", value: CSP }]),
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
    // These ship a full barrel-file import by default — every icon/component
    // in the package gets bundled even when a page uses just one or two.
    // Next.js rewrites the import to the specific submodule at build time.
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "@tanstack/react-table",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(WP_HOST).hostname,
        pathname: "/**",
      },
    ],
    // Product images change only on re-import — cache optimized variants
    // for a day instead of the 60s default (fewer WP origin fetches).
    minimumCacheTTL: 86400,
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
