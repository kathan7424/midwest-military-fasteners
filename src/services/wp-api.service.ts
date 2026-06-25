/**
 * File Name: wp-api.service.ts
 * Description: Shared WordPress REST API fetch helper.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-06-25
 */

import { ENV } from "@/config/env";

const WP_FETCH_OPTIONS: RequestInit = {
  cache: "no-store",
  next: { revalidate: 0 },
  headers: {
    Accept: "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
  },
};

/**
 * Fetch JSON from the WordPress REST API.
 */
export async function fetchWpJson<T>(endpoint: string): Promise<T> {
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${ENV.WP_API}${endpoint}${separator}_=${Date.now()}`;

  const res = await fetch(url, WP_FETCH_OPTIONS);

  if (!res.ok) {
    throw new Error(`WP API failed (${endpoint}): ${res.status}`);
  }

  return (await res.json()) as T;
}
