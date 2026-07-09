/**
 * File Name: catalog-products.fallback.service.ts
 * Description: Fallback product list when spec-parts /products list returns 500.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import {
  fetchWpJson,
  fetchWpJsonOptional,
  fetchWpJsonWithHeaders,
} from "@/services/wp-api.service";
import type {
  SpecPartsCategoryTerm,
  SpecPartsProduct,
  SpecPartsProductsQueryParams,
  SpecPartsProductsResponse,
} from "@/types/spec-parts.types";

function empty_products_response(
  params: SpecPartsProductsQueryParams
): SpecPartsProductsResponse {
  const page = Math.max(1, params.page ?? 1);
  const per_page = params.per_page ?? 10;

  return {
    total: 0,
    pages: 1,
    page,
    per_page,
    products: [],
  };
}

function flatten_categories(
  categories: SpecPartsCategoryTerm[]
): SpecPartsCategoryTerm[] {
  return categories.flatMap((category) => [
    category,
    ...flatten_categories(category.children ?? []),
  ]);
}

async function resolve_category_term_id(slug: string): Promise<number | null> {
  const categories = await fetchWpJson<SpecPartsCategoryTerm[]>(
    "/spec-parts/v1/categories",
    { mode: "static", revalidate: 120 }
  ).catch(() => []);

  const match = flatten_categories(categories).find(
    (category) => category.slug === slug
  );

  return match?.id ?? null;
}

/**
 * wp/v2 taxonomy filters take term IDs, not slugs — resolve the series slug
 * against both possible taxonomy rest bases.
 */
async function resolve_series_taxonomy_filter(
  slug: string
): Promise<{ rest_base: string; term_id: number } | null> {
  for (const rest_base of ["product-series", "product_series"]) {
    const terms = await fetchWpJsonOptional<Array<{ id: number }>>(
      `/wp/v2/${rest_base}?slug=${encodeURIComponent(slug)}&_fields=id`,
      { mode: "static", revalidate: 120 }
    );

    if (terms && terms.length > 0 && terms[0]?.id) {
      return { rest_base, term_id: terms[0].id };
    }
  }

  return null;
}

/**
 * List products via wp/v2/product IDs + spec-parts single-product formatter.
 * Used until Pantheon deploys the fixed /spec-parts/v1/products query.
 */
export async function fetch_spec_parts_products_fallback(
  params: SpecPartsProductsQueryParams = {}
): Promise<SpecPartsProductsResponse> {
  const per_page = Math.min(Math.max(1, params.per_page ?? 10), 50);
  const page = Math.max(1, params.page ?? 1);

  const wp_params = new URLSearchParams({
    per_page: String(per_page),
    page: String(page),
    _fields: "id",
    orderby: "title",
    order: "asc",
  });

  if (params.search?.trim()) {
    wp_params.set("search", params.search.trim());
  }

  if (params.sku?.trim()) {
    wp_params.set("search", params.sku.trim());
  }

  if (params.slug?.trim()) {
    wp_params.set("slug", params.slug.trim());
  }

  if (params.category?.trim()) {
    const term_id = await resolve_category_term_id(params.category.trim());

    if (term_id) {
      wp_params.set("product_cat", String(term_id));
    }
  }

  if (params.series?.trim()) {
    const series_filter = await resolve_series_taxonomy_filter(
      params.series.trim()
    );

    if (series_filter) {
      wp_params.set(series_filter.rest_base, String(series_filter.term_id));
    } else {
      // Unknown series slug — return empty rather than everything.
      return empty_products_response(params);
    }
  }

  let wp_response;

  try {
    wp_response = await fetchWpJsonWithHeaders<Array<{ id: number }>>(
      `/wp/v2/product?${wp_params.toString()}`
    );
  } catch {
    return empty_products_response(params);
  }

  const product_ids = wp_response.data.map((item) => item.id).filter(Boolean);

  if (product_ids.length === 0) {
    return {
      total: wp_response.total,
      pages: Math.max(1, wp_response.total_pages),
      page,
      per_page,
      products: [],
    };
  }

  const products = (
    await Promise.all(
      product_ids.map((id) =>
        fetchWpJsonOptional<SpecPartsProduct>(`/spec-parts/v1/products/${id}`)
      )
    )
  ).filter((product): product is SpecPartsProduct => Boolean(product));

  return {
    total: wp_response.total || products.length,
    pages: Math.max(1, wp_response.total_pages),
    page,
    per_page,
    products,
  };
}
