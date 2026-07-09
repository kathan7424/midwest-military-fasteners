/**
 * File Name: catalog-path.utils.ts
 * Description: WooCommerce shop page path helpers for the headless catalog.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { WooCommerceSettings } from "@/types/site-settings.types";

export const DEFAULT_CATALOG_LISTING_PATH = "/product";

function normalize_path(path: string): string {
  const trimmed = path.trim();

  if (!trimmed || trimmed === "#") {
    return DEFAULT_CATALOG_LISTING_PATH;
  }

  const with_leading_slash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return with_leading_slash.replace(/\/+$/, "") || "/";
}

/**
 * Frontend path for the product catalog (WooCommerce Shop page).
 */
export function get_catalog_listing_path(
  woocommerce?: WooCommerceSettings | null
): string {
  if (!woocommerce?.shop_page_path) {
    return DEFAULT_CATALOG_LISTING_PATH;
  }

  return normalize_path(woocommerce.shop_page_path);
}

/**
 * True when a URL slug matches the WooCommerce Shop page.
 */
export function is_catalog_listing_slug(
  slug: string,
  woocommerce?: WooCommerceSettings | null
): boolean {
  const normalized = slug.toLowerCase().replace(/^\/+|\/+$/g, "");
  const shop_slug = (
    woocommerce?.shop_page_slug || DEFAULT_CATALOG_LISTING_PATH.replace(/^\//, "")
  ).toLowerCase();

  return normalized === shop_slug;
}

/**
 * Append search params to a catalog listing path.
 */
export function build_catalog_listing_url(
  base_path: string,
  params: Record<string, string | undefined>
): string {
  const search_params = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search_params.set(key, value);
    }
  });

  const query = search_params.toString();

  return query ? `${base_path}?${query}` : base_path;
}
