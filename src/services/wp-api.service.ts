/**
 * File Name: wp-api.service.ts
 * Description: Shared WordPress REST API fetch helper.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-06-25
 */

import { ENV } from "@/config/env";

const WP_DYNAMIC_FETCH_OPTIONS: RequestInit = {
  cache: "no-store",
  next: { revalidate: 0 },
  headers: {
    Accept: "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
  },
};

export type WpFetchMode = "dynamic" | "static";

export interface WpFetchOptions {
  mode?: WpFetchMode;
  revalidate?: number;
  tags?: string[];
}

// In development always hit WordPress directly — the persistent Data Cache
// otherwise keeps serving stale API responses after backend changes.
const IS_DEV = process.env.NODE_ENV === "development";

function build_static_fetch_options(revalidate?: number, tags?: string[]): RequestInit {
  if (IS_DEV) {
    return WP_DYNAMIC_FETCH_OPTIONS;
  }

  const next_config: { revalidate?: number; tags?: string[] } = {
    revalidate: revalidate ?? 300,
  };

  if (tags && tags.length > 0) {
    next_config.tags = tags;
  }

  return {
    next: next_config,
    headers: { Accept: "application/json" },
  };
}

/**
 * Fetch JSON from the WordPress REST API.
 * Use mode "static" for menu/settings (ISR cache). Default is "dynamic" for auth/cart.
 */
export async function fetchWpJson<T>(
  endpoint: string,
  options: WpFetchOptions = {}
): Promise<T> {
  const mode = options.mode ?? "dynamic";
  const url = `${ENV.WP_API}${endpoint}`;

  const fetch_options: RequestInit =
    mode === "static"
      ? build_static_fetch_options(options.revalidate, options.tags)
      : WP_DYNAMIC_FETCH_OPTIONS;

  const res = await fetch(url, fetch_options);

  if (!res.ok) {
    throw new Error(`WP API failed (${endpoint}): ${res.status}`);
  }

  return (await res.json()) as T;
}

/**
 * Fetch JSON without throwing — returns null when the request fails.
 */
export async function fetchWpJsonOptional<T>(
  endpoint: string,
  options: WpFetchOptions = {}
): Promise<T | null> {
  try {
    return await fetchWpJson<T>(endpoint, options);
  } catch {
    return null;
  }
}

/**
 * Fetch JSON and expose WordPress pagination headers.
 */
export async function fetchWpJsonWithHeaders<T>(
  endpoint: string,
  options: WpFetchOptions = {}
): Promise<{ data: T; total: number; total_pages: number }> {
  const mode = options.mode ?? "dynamic";
  const url = `${ENV.WP_API}${endpoint}`;

  const fetch_options: RequestInit =
    mode === "static"
      ? build_static_fetch_options(options.revalidate, options.tags)
      : WP_DYNAMIC_FETCH_OPTIONS;

  const res = await fetch(url, fetch_options);

  if (!res.ok) {
    throw new Error(`WP API failed (${endpoint}): ${res.status}`);
  }

  const data = (await res.json()) as T;

  return {
    data,
    total: Number(res.headers.get("X-WP-Total") || 0),
    total_pages: Number(res.headers.get("X-WP-TotalPages") || 1),
  };
}
