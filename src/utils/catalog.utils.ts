/**
 * File Name: catalog.utils.ts
 * Description: Product catalog API to home hero grid transformers.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

import {
  CatalogParentCategory,
  CatalogProduct,
  CategorySectionData,
} from "@/types/product-catalog.types";
import { build_product_path, extract_product_slug_from_permalink } from "@/utils/catalog-url.utils";
import { isUsableLink, normalizeWpUrl } from "@/utils/url.utils";

/**
 * Build a frontend product URL for the home hero catalog grid.
 */
export function build_home_catalog_product_href(product: CatalogProduct): string {
  const slug =
    product.slug?.trim() ||
    extract_product_slug_from_permalink(product.permalink);

  if (slug) {
    return build_product_path(slug);
  }

  const sku = product.sku?.trim();
  if (sku) {
    return build_product_path(sku);
  }

  const normalized_permalink = normalizeWpUrl(product.permalink);
  if (isUsableLink(normalized_permalink)) {
    return normalized_permalink;
  }

  const name_slug = product.name?.trim();
  if (name_slug) {
    return build_product_path(name_slug);
  }

  return "/product";
}

/**
 * Map WordPress catalog rows to the home hero category grid shape.
 * Sections and columns without products are omitted.
 */
export function mapCatalogToCategorySections(
  catalog: CatalogParentCategory[]
): CategorySectionData[] {
  return catalog
    .map((row) => ({
      title: row.parent_category.name,
      columns: row.child_categories
        .map((child) => ({
          title: child.category.name,
          items: child.products.map((product) => ({
            id: product.id,
            label: product.sku || product.name,
            href: build_home_catalog_product_href(product),
          })),
        }))
        .filter((column) => column.items.length > 0),
    }))
    .filter((section) => section.columns.length > 0);
}
