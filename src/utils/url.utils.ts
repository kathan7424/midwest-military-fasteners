/**
 * File Name: url.utils.ts
 * Description: URL normalization helpers for WordPress links.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-06-25
 */

import { ENV } from "@/config/env";

const WP_SITE_ORIGIN = ENV.WP_API.replace(/\/wp-json\/?$/, "");

/**
 * Convert absolute WordPress URLs to relative frontend paths.
 */
export function normalizeWpUrl(url: string): string {
  if (!url || url === "#") {
    return "#";
  }

  if (url.startsWith(WP_SITE_ORIGIN)) {
    const path = url.slice(WP_SITE_ORIGIN.length);
    return path || "/";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return url.startsWith("/") ? url : `/${url}`;
}

/**
 * Strip formatting from phone numbers for tel: links.
 */
export function normalizeTel(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}
