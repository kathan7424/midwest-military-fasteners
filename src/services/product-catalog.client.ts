/**
 * File Name: product-catalog.client.ts
 * Description: Client-side catalog product search for fast table filtering.
 * Developer: KP-184
 * Created Date: 2026-07-07
 * Last Modified: 2026-07-15
 */

import type { SpecPartsProductsResponse } from "@/types/spec-parts.types";

export interface FetchCatalogProductsClientParams {
  search?: string;
  category?: string;
  series?: string;
  page?: number;
  per_page?: number;
  /** Abort signal from the caller's debounce controller — cancels in-flight requests on new input. */
  signal?: AbortSignal;
}

const EMPTY: SpecPartsProductsResponse = { products: [], total: 0, pages: 0, page: 1, per_page: 10 };

export async function fetch_catalog_products_client(
  params: FetchCatalogProductsClientParams = {}
): Promise<SpecPartsProductsResponse> {
  const search_params = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (key === "signal" || value === undefined || value === null || value === "") {
      return;
    }
    search_params.set(key, String(value));
  });

  const query = search_params.toString();
  const url = query
    ? `/api/catalog/products?${query}`
    : "/api/catalog/products";

  try {
    // Default cache mode: the API route sends Cache-Control max-age=30, so
    // repeating a query (typo backspace, page toggle) is served from the
    // browser cache instantly instead of a new proxy roundtrip.
    const response = await fetch(url, {
      method: "GET",
      signal: params.signal,
    });

    if (!response.ok) return EMPTY;

    const data = await response.json().catch(() => null);
    return data ?? EMPTY;
  } catch {
    // AbortError from debounce or network failure — silently return empty.
    return EMPTY;
  }
}
