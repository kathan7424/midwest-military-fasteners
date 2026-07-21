import type { MetadataRoute } from "next";

import { ENV } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  const base = ENV.SITE_URL.replace(/\/+$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account, checkout, and internal API routes carry no indexable
      // content of their own and are either private or duplicate the
      // catalog — keep crawlers off them.
      disallow: [
        "/api/",
        "/my-account",
        "/my-account/",
        "/checkout",
        "/checkout/",
        "/cart",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
