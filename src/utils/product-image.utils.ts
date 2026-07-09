/**
 * File Name: product-image.utils.ts
 * Description: Product image URL helpers and placeholder fallback.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { normalize_media_url } from "@/utils/url.utils";

export const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.svg";

/**
 * True when a product image URL is present and usable.
 */
export function is_valid_product_image_url(url?: string | null): boolean {
  const value = normalize_media_url(url);

  if (!value || value === "#" || value === "false") {
    return false;
  }

  if (value.includes("woocommerce-placeholder")) {
    return false;
  }

  return true;
}

/**
 * Returns the product image URL or the local placeholder asset.
 */
export function resolve_product_image_url(url?: string | null): string {
  const normalized = normalize_media_url(url);

  return is_valid_product_image_url(normalized)
    ? normalized!
    : PRODUCT_PLACEHOLDER_IMAGE;
}

/**
 * Category hero image: prefer category thumbnail, then first product image.
 */
export function resolve_category_hero_image(
  category_image?: string | null,
  product_fallback?: string | null
): string {
  const category_url = normalize_media_url(category_image);

  if (is_valid_product_image_url(category_url)) {
    return category_url!;
  }

  const product_url = normalize_media_url(product_fallback);

  if (is_valid_product_image_url(product_url)) {
    return product_url!;
  }

  return PRODUCT_PLACEHOLDER_IMAGE;
}

/**
 * True when the resolved URL is the placeholder (not a real product photo).
 */
export function is_product_placeholder_image(url?: string | null): boolean {
  return resolve_product_image_url(url) === PRODUCT_PLACEHOLDER_IMAGE;
}
