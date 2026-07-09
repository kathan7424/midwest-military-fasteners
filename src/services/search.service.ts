/**
 * File Name: search.service.ts
 * Description: WordPress global search API service.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { fetchWpJson } from "@/services/wp-api.service";
import { SearchApiResponse } from "@/types/search.types";

export type SearchScope = "global" | "catalog";

export async function fetchSearchResults(
  query: string,
  limit = 15,
  scope: SearchScope = "global"
): Promise<SearchApiResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  if (scope === "catalog") {
    params.set("scope", "catalog");
  }

  // Per-query micro-cache: repeated suggestion lookups (common while typing)
  // skip the WP round-trip for 30s without hurting freshness.
  return fetchWpJson<SearchApiResponse>(`/custom/v1/search?${params.toString()}`, {
    mode: "static",
    revalidate: 30,
  });
}
