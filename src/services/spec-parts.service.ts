/**
 * File Name: spec-parts.service.ts
 * Description: Services for the WooCommerce spec-parts catalog API.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import {
  get_cached_spec_parts_categories,
  fetch_cached_spec_parts_products,
} from "@/services/catalog-data.service";
import { get_cached_sidebar_categories } from "@/utils/spec-parts.utils";
import { fetchWpJson } from "@/services/wp-api.service";
import {
  SpecPartsCategoryTerm,
  SpecPartsProduct,
  SpecPartsProductsQueryParams,
  SpecPartsSeriesTerm,
} from "@/types/spec-parts.types";

export type FetchSpecPartsProductsParams = SpecPartsProductsQueryParams;

export async function fetch_spec_parts_products(
  params: FetchSpecPartsProductsParams = {}
) {
  return fetch_cached_spec_parts_products(params);
}

export async function fetch_spec_parts_categories(): Promise<SpecPartsCategoryTerm[]> {
  return get_cached_spec_parts_categories();
}

export async function fetch_sidebar_categories() {
  return get_cached_sidebar_categories();
}

export async function fetch_spec_parts_category_by_slug(
  slug: string
): Promise<SpecPartsCategoryTerm> {
  const normalized_slug = decodeURIComponent(slug.trim());

  return fetchWpJson<SpecPartsCategoryTerm>(
    `/spec-parts/v1/categories/slug/${encodeURIComponent(normalized_slug)}`,
    { mode: "static", revalidate: 120 }
  );
}

export async function fetch_spec_parts_series(): Promise<SpecPartsSeriesTerm[]> {
  return fetchWpJson<SpecPartsSeriesTerm[]>("/spec-parts/v1/series", {
    mode: "static",
    revalidate: 120,
  });
}

export async function fetch_spec_parts_product_by_sku(
  sku: string
): Promise<SpecPartsProduct> {
  return fetchWpJson<SpecPartsProduct>(
    `/spec-parts/v1/products/sku/${encodeURIComponent(sku)}`,
    { mode: "static", revalidate: 60 }
  );
}

export async function fetch_spec_parts_product_by_slug(
  slug: string
): Promise<SpecPartsProduct> {
  const normalized_slug = decodeURIComponent(slug.trim());

  try {
    return await fetchWpJson<SpecPartsProduct>(
      `/spec-parts/v1/products/slug/${encodeURIComponent(normalized_slug)}`,
      { mode: "static", revalidate: 60 }
    );
  } catch {
    const response = await fetch_spec_parts_products({
      slug: normalized_slug,
      per_page: 1,
      page: 1,
    });

    const product = response.products[0];

    if (!product) {
      throw new Error("Product not found.");
    }

    return product;
  }
}
