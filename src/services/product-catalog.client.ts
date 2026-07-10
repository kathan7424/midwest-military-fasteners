/**
 * File Name: product-catalog.client.ts
 * Description: Client-side catalog product search for fast table filtering.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { SpecPartsProductsResponse } from "@/types/spec-parts.types";

export interface FetchCatalogProductsClientParams {
  search?: string;
  category?: string;
  series?: string;
  page?: number;
  per_page?: number;
  signal?: AbortSignal;
}

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
  // Default cache mode: the API route sends Cache-Control max-age=30, so
  // repeating a query (typo backspace, page toggle) is served from the
  // browser cache instantly instead of a new proxy roundtrip.
  const response = await fetch(
    query ? `/api/catalog/products?${query}` : "/api/catalog/products",
    {
      method: "GET",
      signal: params.signal,
    }
  );

  if (!response.ok) {
    throw new Error("Product search failed.");
  }

  return (await response.json()) as SpecPartsProductsResponse;
}
