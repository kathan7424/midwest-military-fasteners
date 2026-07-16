/**
 * File Name: wp-api.service.ts
 * Description: Shared WordPress REST API fetch helper.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-07-13
 */

import { ENV } from "@/config/env";

// A hung WP request must never hang the page stream — fail fast and let the
// caller's fallback/error path run instead of leaving shoppers on a skeleton.
const WP_FETCH_TIMEOUT_MS = 15_000;

const WP_DYNAMIC_FETCH_OPTIONS: RequestInit = {
  cache: "no-store",
  headers: { Accept: "application/json" },
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

// Dev-only in-memory cache for mode:"static" requests. Unlike the persistent
// Next Data Cache it dies with the dev server, so backend changes show up
// after at most DEV_CACHE_TTL_MS — while repeat navigation (sidebar clicks,
// pagination, filters) stays fast instead of paying a ~1s WP roundtrip each.
const DEV_CACHE_TTL_MS = 120_000;
const dev_cache = new Map<
  string,
  { expires: number; body: unknown; total: number; total_pages: number }
>();

function dev_cache_get(url: string) {
  const entry = dev_cache.get(url);

  if (!entry) {
    return null;
  }

  if (entry.expires < Date.now()) {
    dev_cache.delete(url);
    return null;
  }

  return entry;
}

function dev_cache_set(
  url: string,
  body: unknown,
  total = 0,
  total_pages = 1
): void {
  dev_cache.set(url, {
    expires: Date.now() + DEV_CACHE_TTL_MS,
    body,
    total,
    total_pages,
  });
}

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

  if (IS_DEV && mode === "static") {
    const cached = dev_cache_get(url);
    if (cached) {
      return cached.body as T;
    }
  }

  const fetch_options: RequestInit =
    mode === "static"
      ? build_static_fetch_options(options.revalidate, options.tags)
      : WP_DYNAMIC_FETCH_OPTIONS;

  const res = await fetch(url, {
    ...fetch_options,
    signal: AbortSignal.timeout(WP_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`WP API failed (${endpoint}): ${res.status}`);
  }

  const body = (await res.json()) as T;

  if (IS_DEV && mode === "static") {
    dev_cache_set(url, body);
  }

  return body;
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

  if (IS_DEV && mode === "static") {
    const cached = dev_cache_get(url);
    if (cached) {
      return {
        data: cached.body as T,
        total: cached.total,
        total_pages: cached.total_pages,
      };
    }
  }

  const fetch_options: RequestInit =
    mode === "static"
      ? build_static_fetch_options(options.revalidate, options.tags)
      : WP_DYNAMIC_FETCH_OPTIONS;

  const res = await fetch(url, {
    ...fetch_options,
    signal: AbortSignal.timeout(WP_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`WP API failed (${endpoint}): ${res.status}`);
  }

  const data = (await res.json()) as T;
  const total = Number(res.headers.get("X-WP-Total") || 0);
  const total_pages = Number(res.headers.get("X-WP-TotalPages") || 1);

  if (IS_DEV && mode === "static") {
    dev_cache_set(url, data, total, total_pages);
  }

  return {
    data,
    total,
    total_pages,
  };
}
