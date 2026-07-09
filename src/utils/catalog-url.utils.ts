/**
 * File Name: catalog-url.utils.ts
 * Description: WooCommerce-style catalog URL helpers using WP term slugs.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

/**
 * Frontend product detail URL using the WooCommerce post slug.
 */
export function build_product_path(slug: string): string {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");

  if (!normalized) {
    return "/product";
  }

  return `/product/${encodeURIComponent(normalized)}`;
}

/**
 * Extract WooCommerce post slug from a WP permalink.
 */
export function extract_product_slug_from_permalink(permalink: string): string {
  if (!permalink) {
    return "";
  }

  const without_query = permalink.split("?")[0] ?? "";
  const segments = without_query
    .replace(/\/$/, "")
    .split("/")
    .filter(Boolean);

  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

export function build_product_category_path(
  parent_slug: string,
  child_slug: string
): string {
  return `/product-category/${parent_slug}/${child_slug}`;
}

export function build_product_category_series_path(
  parent_slug: string,
  child_slug: string,
  series_slug: string
): string {
  const params = new URLSearchParams({ series: series_slug });

  return `${build_product_category_path(parent_slug, child_slug)}?${params.toString()}`;
}

/**
 * Resolve the active product_cat slug from a nested category pathname.
 */
export function get_category_slug_from_pathname(pathname: string): string | undefined {
  const marker = "/product-category/";

  if (!pathname.includes(marker)) {
    return undefined;
  }

  const segments = pathname
    .split(marker)[1]
    ?.split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments?.length) {
    return undefined;
  }

  return segments[segments.length - 1];
}

export function sync_catalog_search_query(pathname: string, query: string): void {
  const params = new URLSearchParams(window.location.search);

  if (query) {
    params.set("search", query);
  } else {
    params.delete("search");
  }

  params.delete("page");

  const next_url = params.toString() ? `${pathname}?${params.toString()}` : pathname;

  window.history.replaceState(null, "", next_url);
}
