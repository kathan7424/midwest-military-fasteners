/**
 * File Name: spec-parts.service.ts
 * Description: Services for the WooCommerce spec-parts catalog API.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { fetchWpJson } from "@/services/wp-api.service";
import {
  SpecPartsCategoryTerm,
  SpecPartsProduct,
  SpecPartsProductsResponse,
  SpecPartsSeriesTerm,
} from "@/types/spec-parts.types";

export interface FetchSpecPartsProductsParams {
  search?: string;
  sku?: string;
  category?: string;
  series?: string;
  manufacturer?: string;
  country?: string;
  dfar?: boolean;
  per_page?: number;
  page?: number;
}

function build_params(params: FetchSpecPartsProductsParams): string {
  const search_params = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    search_params.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });

  return search_params.toString();
}

export async function fetch_spec_parts_products(
  params: FetchSpecPartsProductsParams = {}
): Promise<SpecPartsProductsResponse> {
  const query = build_params(params);
  const endpoint = query
    ? `/spec-parts/v1/products?${query}`
    : "/spec-parts/v1/products";

  return fetchWpJson<SpecPartsProductsResponse>(endpoint);
}

export async function fetch_spec_parts_categories(): Promise<SpecPartsCategoryTerm[]> {
  return fetchWpJson<SpecPartsCategoryTerm[]>("/spec-parts/v1/categories");
}

export async function fetch_spec_parts_series(): Promise<SpecPartsSeriesTerm[]> {
  return fetchWpJson<SpecPartsSeriesTerm[]>("/spec-parts/v1/series");
}

export async function fetch_spec_parts_product_by_sku(
  sku: string
): Promise<SpecPartsProduct> {
  return fetchWpJson<SpecPartsProduct>(
    `/spec-parts/v1/products/sku/${encodeURIComponent(sku)}`
  );
}

