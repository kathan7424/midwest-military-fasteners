/**
 * File Name: search.service.ts
 * Description: WordPress global search API service.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { fetchWpJson } from "@/services/wp-api.service";
import { SearchApiResponse } from "@/types/search.types";

export async function fetchSearchResults(
  query: string,
  limit = 10
): Promise<SearchApiResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    post_type: "product",
  });

  return fetchWpJson<SearchApiResponse>(`/custom/v1/search?${params.toString()}`);
}
