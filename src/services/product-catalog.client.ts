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
  const response = await fetch(
    query ? `/api/catalog/products?${query}` : "/api/catalog/products",
    {
      method: "GET",
      cache: "no-store",
      signal: params.signal,
    }
  );

  if (!response.ok) {
    throw new Error("Product search failed.");
  }

  return (await response.json()) as SpecPartsProductsResponse;
}
