/**
 * File Name: url.utils.ts
 * Description: URL normalization helpers for WordPress links.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-06-25
 */

import { ENV } from "@/config/env";

const WP_API_ORIGIN = ENV.WP_API.replace(/\/wp-json\/?$/, "");
const WP_SITE_ORIGIN = ENV.WP_SITE_URL.replace(/\/+$/, "");

/**
 * Convert absolute WordPress URLs to relative frontend paths.
 */
export function normalizeWpUrl(url: string): string {
  if (!url || url === "#") {
    return "#";
  }

  for (const origin of [WP_API_ORIGIN, WP_SITE_ORIGIN]) {
    if (origin && url.startsWith(origin)) {
      const path = url.slice(origin.length);
      return path || "/";
    }
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return url.startsWith("/") ? url : `/${url}`;
}

/**
 * Resolve ACF/link field URLs with a safe fallback.
 */
export function resolveLinkUrl(
  url: string | undefined | null,
  fallback: string
): string {
  if (!url || url === "#") {
    return fallback;
  }

  return normalizeWpUrl(url);
}

/**
 * Returns true only for real navigable URLs.
 */
export function isUsableLink(url: string | undefined | null): boolean {
  if (!url || url === "#") {
    return false;
  }

  if (url.startsWith("/")) {
    return true;
  }

  try {
    const { hostname } = new URL(url);
    return hostname.includes(".");
  } catch {
    return false;
  }
}

/**
 * Strip formatting from phone numbers for tel: links.
 */
export function normalizeTel(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

/**
 * Normalize WordPress media URLs to absolute HTTPS for Next.js Image.
 */
export function normalize_media_url(url?: string | null): string | undefined {
  const value = url?.trim();

  if (!value) {
    return undefined;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("/")) {
    return `${WP_SITE_ORIGIN}${value}`;
  }

  return value;
}
