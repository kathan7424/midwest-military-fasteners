/**
 * File Name: catalog-data.service.ts
 * Description: Cached catalog fetches — deduped per request + ISR for sidebar tree.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { cache } from "react";

import { fetchWpJson, fetchWpJsonWithHeaders } from "@/services/wp-api.service";
import { fetch_spec_parts_products_fallback } from "@/services/catalog-products.fallback.service";
import type { SpecPartsProductsQueryParams } from "@/types/spec-parts.types";
import {
  SpecPartsCategoryTerm,
  SpecPartsProductsResponse,
  SpecPartsSeriesTerm,
} from "@/types/spec-parts.types";

// Catalog data changes on WP import, not per request. Long ISR windows keep
// pages serving from cache (Next revalidates stale entries in the background,
// so shoppers never wait on the WP round-trip after first population).
const CATEGORIES_REVALIDATE_SECONDS = 900;
const PRODUCTS_REVALIDATE_SECONDS = 300;

function normalize_series_terms(value: unknown): SpecPartsSeriesTerm[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).filter(
      (term): term is SpecPartsSeriesTerm =>
        Boolean(
          term &&
            typeof term === "object" &&
            "slug" in term &&
            typeof (term as SpecPartsSeriesTerm).slug === "string"
        )
    );
  }

  return [];
}

function build_products_query(params: SpecPartsProductsQueryParams): string {
  const search_params = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    search_params.set(
      key,
      typeof value === "boolean" ? (value ? "1" : "0") : String(value)
    );
  });

  return search_params.toString();
}

function parse_products_query_key(
  query_key: string
): SpecPartsProductsQueryParams {
  const params: SpecPartsProductsQueryParams = {};
  const search_params = new URLSearchParams(query_key);

  search_params.forEach((value, key) => {
    if (key === "per_page" || key === "page") {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        (params as Record<string, number>)[key] = numeric;
      }
      return;
    }

    if (key === "dfar") {
      params.dfar = value === "1" || value === "true";
      return;
    }

    (params as Record<string, string>)[key] = value;
  });

  return params;
}

// When the primary /spec-parts/v1/products endpoint 500s (stale deploy on
// Pantheon), don't burn a ~1s roundtrip re-trying it on every request —
// skip straight to the fallback for a cooldown window.
const PRIMARY_FAILURE_COOLDOWN_MS = 60_000;
let primary_failed_at = 0;

async function fetch_spec_parts_products_primary(
  query_key: string
): Promise<SpecPartsProductsResponse> {
  if (Date.now() - primary_failed_at < PRIMARY_FAILURE_COOLDOWN_MS) {
    throw new Error("spec-parts products endpoint in failure cooldown.");
  }

  const endpoint = query_key
    ? `/spec-parts/v1/products?${query_key}`
    : "/spec-parts/v1/products";

  try {
    // Each unique query (category/series/search/page) caches independently.
    const response = await fetchWpJson<SpecPartsProductsResponse>(endpoint, {
      mode: "static",
      revalidate: PRODUCTS_REVALIDATE_SECONDS,
    });
    primary_failed_at = 0;
    return response;
  } catch (error) {
    primary_failed_at = Date.now();
    throw error;
  }
}

/**
 * Sidebar category tree — ISR cached, deduped within the same render.
 */
export const get_cached_spec_parts_categories = cache(
  async (): Promise<SpecPartsCategoryTerm[]> => {
    return fetchWpJson<SpecPartsCategoryTerm[]>("/spec-parts/v1/categories", {
      mode: "static",
      revalidate: CATEGORIES_REVALIDATE_SECONDS,
    });
  }
);

/**
 * Product list — deduped per request; fresh data (no ISR).
 */
export const get_cached_spec_parts_products = cache(
  async (query_key: string): Promise<SpecPartsProductsResponse> => {
    try {
      return await fetch_spec_parts_products_primary(query_key);
    } catch {
      return fetch_spec_parts_products_fallback(
        parse_products_query_key(query_key)
      );
    }
  }
);

export async function fetch_cached_spec_parts_products(
  params: SpecPartsProductsQueryParams = {}
): Promise<SpecPartsProductsResponse> {
  const response = await get_cached_spec_parts_products(
    build_products_query(params)
  );

  // Imported data sometimes files a series' products under a different
  // category than the sidebar suggests — retry on the series alone so the
  // shopper still sees the parts they clicked.
  if (
    response.products.length === 0 &&
    params.category?.trim() &&
    params.series?.trim()
  ) {
    return get_cached_spec_parts_products(
      build_products_query({ ...params, category: undefined })
    );
  }

  return response;
}

function flatten_spec_parts_categories(
  categories: SpecPartsCategoryTerm[]
): SpecPartsCategoryTerm[] {
  return categories.flatMap((category) => [
    category,
    ...flatten_spec_parts_categories(category.children ?? []),
  ]);
}

async function resolve_category_term_ids(slug: string): Promise<number[]> {
  const categories = await get_cached_spec_parts_categories();
  const normalized_slug = slug.trim().toLowerCase();

  const matches = flatten_spec_parts_categories(categories).filter(
    (category) => category.slug.toLowerCase() === normalized_slug
  );

  const ids = matches
    .map((category) => category.id)
    .filter((id): id is number => typeof id === "number" && id > 0);

  return Array.from(new Set(ids));
}

function extract_product_series_ids(product: Record<string, unknown>): number[] {
  const ids: number[] = [];

  ["product-series", "product_series"].forEach((field) => {
    const value = product[field];

    if (!Array.isArray(value)) {
      return;
    }

    value.forEach((term_id) => {
      const numeric = Number(term_id);
      if (Number.isFinite(numeric) && numeric > 0) {
        ids.push(numeric);
      }
    });
  });

  return ids;
}

async function fetch_wp_series_terms(): Promise<SpecPartsSeriesTerm[]> {
  for (const endpoint of [
    "/wp/v2/product-series?per_page=100&orderby=name&order=asc",
    "/wp/v2/product_series?per_page=100&orderby=name&order=asc",
  ]) {
    try {
      const response = await fetchWpJsonWithHeaders<
        Array<{
          id: number;
          name: string;
          slug: string;
          count?: number;
        }>
      >(endpoint, {
        mode: "static",
        revalidate: CATEGORIES_REVALIDATE_SECONDS,
      });

      if (response.data.length > 0) {
        return normalize_series_terms(
          response.data.map((term) => ({
            id: term.id,
            name: term.name,
            slug: term.slug,
            count: term.count ?? 0,
          }))
        );
      }
    } catch {
      continue;
    }
  }

  const response = await fetchWpJson<unknown>("/spec-parts/v1/series", {
    mode: "static",
    revalidate: CATEGORIES_REVALIDATE_SECONDS,
  }).catch(() => []);

  return normalize_series_terms(response);
}

/**
 * All product-series taxonomy terms (taxonomy=product-series).
 */
export const get_cached_spec_parts_series = cache(
  async (): Promise<SpecPartsSeriesTerm[]> => {
    return fetch_wp_series_terms();
  }
);

async function fetch_category_product_series_ids(
  category_term_ids: number[]
): Promise<number[]> {
  const series_ids = new Set<number>();
  const per_page = 100;
  const max_pages = 15;

  const fetch_category_page = (category_term_id: number, page: number) =>
    fetchWpJsonWithHeaders<Array<Record<string, unknown>>>(
      `/wp/v2/product?product_cat=${category_term_id}&per_page=${per_page}&page=${page}&_fields=id,product-series,product_series&orderby=id&order=asc`,
      {
        mode: "static",
        revalidate: CATEGORIES_REVALIDATE_SECONDS,
      }
    );

  const collect = (products: Array<Record<string, unknown>>) => {
    products.forEach((product) => {
      extract_product_series_ids(product).forEach((term_id) => {
        series_ids.add(term_id);
      });
    });
  };

  // Page 1 of every category in parallel (was a sequential double loop —
  // each WP round-trip stacked on the previous one).
  const first_pages = await Promise.all(
    category_term_ids.map((id) => fetch_category_page(id, 1))
  );

  const remaining: Array<Promise<{ data: Array<Record<string, unknown>> }>> = [];

  first_pages.forEach((response, index) => {
    collect(response.data);

    const total_pages = Math.min(Math.max(1, response.total_pages), max_pages);
    for (let page = 2; page <= total_pages; page += 1) {
      remaining.push(fetch_category_page(category_term_ids[index], page));
    }
  });

  (await Promise.all(remaining)).forEach((response) => collect(response.data));

  return Array.from(series_ids);
}

async function fetch_category_series_from_spec_parts_api(
  category_slug: string
): Promise<SpecPartsSeriesTerm[]> {
  const response = await fetchWpJson<SpecPartsProductsResponse>(
    `/spec-parts/v1/products?category=${encodeURIComponent(category_slug)}&per_page=100&page=1`,
    {
      mode: "static",
      revalidate: CATEGORIES_REVALIDATE_SECONDS,
    }
  ).catch(() => ({ products: [], total: 0, pages: 1, page: 1, per_page: 100 }));

  const series_map = new Map<string, SpecPartsSeriesTerm>();

  response.products.forEach((product) => {
    product.product_series.forEach((series) => {
      if (!series_map.has(series.slug)) {
        series_map.set(series.slug, {
          id: series.id,
          name: series.name,
          slug: series.slug,
          count: 0,
        });
      }
    });
  });

  return Array.from(series_map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

/**
 * product-series taxonomy terms used by products in a category.
 */
export const get_cached_category_series_for_sidebar = cache(
  async (category_slug: string): Promise<SpecPartsSeriesTerm[]> => {
    const term_ids = await resolve_category_term_ids(category_slug);

    try {
      const [all_terms, assigned_series_ids, spec_parts_series] =
        await Promise.all([
          get_cached_spec_parts_series(),
          term_ids.length > 0
            ? fetch_category_product_series_ids(term_ids)
            : Promise.resolve([]),
          fetch_category_series_from_spec_parts_api(category_slug),
        ]);

      const assigned_ids = new Set(assigned_series_ids);
      const from_wp_rest = all_terms.filter((term) => assigned_ids.has(term.id));
      const merged = new Map<string, SpecPartsSeriesTerm>();

      [...from_wp_rest, ...spec_parts_series].forEach((term) => {
        merged.set(term.slug, term);
      });

      return Array.from(merged.values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    } catch {
      return fetch_category_series_from_spec_parts_api(category_slug);
    }
  }
);

/**
 * Fire-and-forget warmup for layout — primes the ISR cache before navigation.
 */
export function warm_catalog_categories_cache(): void {
  void get_cached_spec_parts_categories().catch(() => undefined);
}
